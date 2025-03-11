import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRobot, 
  faBolt,
  faCog,
  faSave,
  faDownload,
  faUpload,
  faTrash,
  faList,
  faScroll,
  faToggleOn
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { INotebookTracker } from '@jupyterlab/notebook';

// Import components
import MessageList from './MessageList';
import InputArea from './InputArea';
import ModelSelector from './ModelSelector';
import TabNavigation from './TabNavigation';
import ConversationList from './ConversationList';
import NotebookConnectionHelper from './NotebookConnectionHelper';

// Import context and hooks
import { AIAssistantProvider, useAIAssistant, TabType } from '../context/AIAssistantContext';
import { applySyntaxHighlighting, formatMessageWithCodeBlocks } from '../utils/formatUtils';
import { debounce } from '../utils/performanceUtils';
import ConversationStorageService, { SavedConversation } from '../services/ConversationStorageService';

// Props interface
interface AIAssistantPanelProps {
  notebooks: INotebookTracker;
}

// Tab definitions
const tabs: { id: TabType; label: string; icon: IconProp }[] = [
  { id: 'chat', label: 'Chat', icon: faBolt }
];

// Main component implementation
const AIAssistantPanelContent: React.FC<AIAssistantPanelProps> = ({ notebooks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const {
    // State
    messages,
    chatInput,
    activeTab,
    isLoading,
    userPreferences,
    
    // API data
    models,
    selectedModel,
    
    // Actions
    setChatInput,
    setActiveTab,
    setUserPreference,
    setSelectedModel,
    
    // Message operations
    sendChatMessage,
    retryLastMessage,
    regenerateResponse,
    clearMessages,
    stopCurrentRequest,
    
    // Notebook operations
    activeCellContent,
    hasActiveNotebook,
    
    // Data operations
    exportConversation,
    saveConversation,
    loadConversation,
    importConversation
  } = useAIAssistant();
  
  // Add state for conversation management
  const [isConversationListVisible, setIsConversationListVisible] = useState(false);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [conversationStorage] = useState(() => new ConversationStorageService());
  
  // Load saved conversations on component mount
  useEffect(() => {
    if (conversationStorage.isAvailable()) {
      const conversations = conversationStorage.getAllConversations();
      setSavedConversations(conversations);
    }
  }, [conversationStorage]);
  
  // Use ResizeObserver to detect panel size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      
      const width = entries[0].contentRect.width;
      setContainerWidth(width);
      
      // Set compact mode when width is below threshold
      setIsCompact(width < 500);
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Update the localInputValue initialization to use chatInput
  const [localInputValue, setLocalInputValue] = useState(chatInput);

  // Keep localInputValue in sync with chatInput when it changes externally
  useEffect(() => {
    setLocalInputValue(chatInput);
  }, [chatInput]);
  
  // Debounced version of the input change handler - update with a shorter delay
  const debouncedInputChange = useCallback(
    debounce((value: string) => {
      setChatInput(value);
    }, 150), // Reduced from 300ms to 150ms for better responsiveness
    [setChatInput]
  );

  // Handle input changes - update local state immediately for visual feedback
  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInputValue(value); // Immediate visual feedback
    debouncedInputChange(value); // Debounced update to context state
  };

  // Handler for chat message submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use the local input value for submission
    sendChatMessage(localInputValue);
    
    // Clear local input after submission
    setLocalInputValue('');
  };
  
  // Handler for model change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };
  
  // Handler for auto-scroll toggle
  const toggleAutoScroll = () => {
    setUserPreference('autoScroll', !userPreferences.autoScroll);
  };
  
  // Handle conversation actions
  const handleSaveConversation = () => {
    if (!conversationStorage.isAvailable()) {
      // TODO: Show error message that local storage is not available
      return;
    }
    
    // Create a title based on the first few messages
    let title = 'Untitled Conversation';
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        title = firstUserMessage.content.slice(0, 30);
        if (firstUserMessage.content.length > 30) {
          title += '...';
        }
      }
    }
    
    const conversation: SavedConversation = {
      id: '', // Will be generated by the service
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
      modelName: selectedModel,
      tabType: activeTab,
      metadata: {
        notebookName: hasActiveNotebook ? 'Current Notebook' : undefined
      }
    };
    
    const id = conversationStorage.saveConversation(conversation);
    if (id) {
      // Refresh the conversations list
      setSavedConversations(conversationStorage.getAllConversations());
    } else {
      // TODO: Show error message
    }
  };
  
  const handleLoadConversation = (id: string) => {
    const conversation = conversationStorage.loadConversation(id);
    if (conversation) {
      // Clear existing messages first
      clearMessages();
      
      // Use the context's methods to properly set up the conversation
      // This is a safer approach than directly manipulating the state
      if (conversation.messages.length > 0) {
        // Load the messages into the context (this would need to be implemented in the context)
        // For now, we'll just use the first user message to simulate a chat
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          // Use sendChatMessage which is available in the context
          sendChatMessage(firstUserMessage.content);
        }
      }
      
      // Set other properties
      setActiveTab(conversation.tabType);
      setSelectedModel(conversation.modelName);
      
      // Hide the conversation list
      setIsConversationListVisible(false);
    }
  };
  
  const handleDeleteConversation = (id: string) => {
    if (conversationStorage.deleteConversation(id)) {
      // Refresh the conversations list
      setSavedConversations(conversationStorage.getAllConversations());
    }
  };
  
  const handleExportConversation = (id: string, format: 'json' | 'markdown' | 'notebook') => {
    const exportData = conversationStorage.exportConversation(id, format);
    if (exportData) {
      // Create a Blob and download
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Set the appropriate file extension
      let filename = `ollama-conversation-${new Date().toISOString().slice(0, 10)}`;
      switch (format) {
        case 'json':
          filename += '.json';
          break;
        case 'markdown':
          filename += '.md';
          break;
        case 'notebook':
          filename += '.ipynb';
          break;
      }
      
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handleImportConversation = () => {
    // This is handled directly in the ConversationList component
    // via a file input element
  };
  
  const handleNewConversation = () => {
    // Clear current conversation
    clearMessages();
    setIsConversationListVisible(false);
  };
  
  // Render active tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="jp-AIAssistant-conversationContainer" ref={containerRef}>
            <div className="jp-AIAssistant-conversation">
              {messages.length === 0 ? (
                <div className="jp-AIAssistant-emptyState">
                  <FontAwesomeIcon icon={faRobot} className="fa-icon-lg" style={{ marginBottom: '16px' }} />
                  <p>Start a new conversation with the AI assistant</p>
                  <p><small>Your conversation will be processed locally using Ollama</small></p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  autoScroll={userPreferences.autoScroll}
                  isLoading={isLoading}
                  onRetry={retryLastMessage}
                  onStop={stopCurrentRequest}
                  onRegenerate={regenerateResponse}
                  formatMessageWithCodeBlocks={formatMessageWithCodeBlocks}
                  containerRef={containerRef}
                  containerWidth={containerWidth}
                  isCompact={isCompact}
                />
              )}
            </div>
            
            <InputArea
              inputValue={localInputValue}
              isLoading={isLoading}
              onInputChange={handleChatInputChange}
              onSubmit={handleChatSubmit}
              onStopRequest={() => stopCurrentRequest()}
              onRegenerate={regenerateResponse}
              isCompact={isCompact}
            />
          </div>
        );
        
      default:
        return <div>Unknown tab</div>;
    }
  }, [
    activeTab,
    messages,
    userPreferences.autoScroll,
    isLoading,
    retryLastMessage,
    stopCurrentRequest,
    regenerateResponse,
    formatMessageWithCodeBlocks,
    containerRef,
    containerWidth,
    isCompact,
    localInputValue,
    handleChatInputChange,
    handleChatSubmit
  ]);
  
  // Render main component
  return (
    <div className="jp-AIAssistant" ref={containerRef}>
      {isConversationListVisible ? (
        <ConversationList
          conversations={savedConversations}
          onSelect={handleLoadConversation}
          onDelete={handleDeleteConversation}
          onExport={handleExportConversation}
          onImport={handleImportConversation}
          onNew={handleNewConversation}
          isVisible={isConversationListVisible}
        />
      ) : (
        <>
          <div className={`jp-AIAssistant-header ${isCompact ? 'jp-AIAssistant-header-compact' : ''}`}>
            <div className="jp-AIAssistant-title">
              <FontAwesomeIcon icon={faRobot} className="fa-icon-md" style={{ marginRight: '8px' }} />
              Ollama AI Assistant
            </div>
            
            <div className="jp-AIAssistant-scrollControl">
              <label>
                <input
                  type="checkbox"
                  checked={userPreferences.autoScroll}
                  onChange={toggleAutoScroll}
                />
                Auto-scroll
              </label>
            </div>
            
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              isLoading={isLoading}
              onModelChange={handleModelChange}
              onRefreshModels={() => {}}
            />
          </div>
          
          <div className={`jp-AIAssistant-toolbar ${isCompact ? 'jp-AIAssistant-toolbar-compact' : ''}`}>
            <TabNavigation
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(tabId: string) => setActiveTab(tabId as TabType)}
              isLoading={isLoading}
              isCompact={isCompact}
            />
            
            <div className="jp-AIAssistant-toolbar-actions">
              <button
                className="jp-AIAssistant-toolbar-button"
                onClick={handleSaveConversation}
                title="Save conversation"
                disabled={messages.length === 0}
              >
                <FontAwesomeIcon icon={faSave} className="fa-icon-sm" />
              </button>
              
              <button
                className="jp-AIAssistant-toolbar-button"
                onClick={() => setIsConversationListVisible(true)}
                title="View saved conversations"
              >
                <FontAwesomeIcon icon={faList} className="fa-icon-sm" />
              </button>
              
              <button
                className="jp-AIAssistant-toolbar-button"
                onClick={() => clearMessages()}
                title="Clear conversation"
                disabled={messages.length === 0}
              >
                <FontAwesomeIcon icon={faTrash} className="fa-icon-sm" />
              </button>
              
              <button
                className="jp-AIAssistant-toolbar-button"
                onClick={() => setUserPreference('autoScroll', !userPreferences.autoScroll)}
                title={userPreferences.autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
              >
                <FontAwesomeIcon icon={userPreferences.autoScroll ? faScroll : faToggleOn} />
              </button>
            </div>
          </div>

          {renderTabContent()}
          
          {userPreferences.enableKeyboardShortcuts && (
            <div className="jp-AIAssistant-keyboard-help">
              Press Ctrl+Enter to send
              </div>
          )}
        </>
      )}
    </div>
  );
}; 

// Wrapper component that provides the context
export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ notebooks }) => {
  return (
    <AIAssistantProvider notebooks={notebooks}>
      <AIAssistantPanelContent notebooks={notebooks} />
    </AIAssistantProvider>
  );
};

export default AIAssistantPanel; 