/**
 * @file AIAssistantPanel.tsx
 * @description This file contains the main panel component for the Ollama AI Assistant extension.
 * It provides the user interface for interacting with the AI assistant, including the chat interface,
 * model selection, and conversation management. The panel integrates with the JupyterLab notebook
 * environment and provides tools for using AI capabilities within the notebook context.
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRobot,
  faBolt,
  faDownload,
  faTrash,
  faList,
  faScroll,
  faToggleOn,
  faSave,
  faToggleOff
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { INotebookTracker } from '@jupyterlab/notebook';

// Import components
import MessageList from './MessageList';
import InputArea from './InputArea';
import ModelSelector from './ModelSelector';
import ConversationList from './ConversationList';

// Import context and hooks
import { AIAssistantProvider, useAIAssistant, TabType } from '../context/AIAssistantContext';
import { applySyntaxHighlighting, formatMessageWithCodeBlocks } from '../utils/formatUtils';
import { debounce } from '../utils/performanceUtils';
import ConversationStorageService, { SavedConversation } from '../services/ConversationStorageService';
import { useTheme } from '../hooks/useTheme';

/**
 * Props for the AIAssistantPanel component.
 * 
 * @interface AIAssistantPanelProps
 * @property {INotebookTracker} notebooks - The JupyterLab notebook tracker instance
 * that provides access to the active notebook and its contents.
 */
interface AIAssistantPanelProps {
  notebooks: INotebookTracker;
}

/**
 * Tab definitions for the assistant panel.
 * Each tab has an ID, label, and icon.
 */
const tabs: { id: TabType; label: string; icon: IconProp }[] = [
  { id: 'chat', label: 'Chat', icon: faBolt }
];

/**
 * The main content component for the AI Assistant panel.
 * 
 * This component handles the rendering of the chat interface, model selection,
 * and conversation management. It uses the AIAssistantContext to access and
 * update state related to the AI assistant.
 * 
 * @param {AIAssistantPanelProps} props - Component properties
 * @returns {JSX.Element} The rendered component
 */
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
  const [showConversations, setShowConversations] = useState(false);
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
    if (chatInput.trim() && !isLoading) {
      sendChatMessage(chatInput);
      setChatInput('');
      // Ensure auto-scroll is enabled when sending a new message
      if (!userPreferences.autoScroll) {
        setUserPreference('autoScroll', true);
      }
    }
  };

  // Handler for model change
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  // Handler for auto-scroll toggle
  const toggleAutoScroll = () => {
    setUserPreference('autoScroll', !userPreferences.autoScroll);

    // Immediately scroll to bottom if auto-scroll is being enabled
    if (!userPreferences.autoScroll && conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  };

  // Add a ref for the conversation container
  const conversationRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll logic - ensure this runs after messages update
  React.useEffect(() => {
    if (userPreferences.autoScroll && conversationRef.current && messages.length > 0) {
      // Use requestAnimationFrame to ensure layout is complete before scrolling
      requestAnimationFrame(() => {
        if (conversationRef.current) {
          conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
      });
    }
  }, [messages, userPreferences.autoScroll]);

  // Also scroll when new messages are being generated or when dimensions change
  React.useLayoutEffect(() => {
    if (userPreferences.autoScroll && conversationRef.current) {
      requestAnimationFrame(() => {
        if (conversationRef.current) {
          conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
        }
      });
    }
  }, [messages, isLoading, userPreferences.autoScroll, containerWidth]);

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
      setShowConversations(false);
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
    // Note: Import functionality has been removed from the main toolbar
    // and is now only available in the Conversations panel/list
    // This function is used by the ConversationList component
  };

  const handleNewConversation = () => {
    // Clear current conversation
    clearMessages();
    setShowConversations(false);
  };

  // Use our theme hook to get JupyterLab theme
  const { isDarkTheme } = useTheme();

  // Render active tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="jp-AIAssistant-conversationContainer">
            <div className="jp-AIAssistant-conversation" ref={conversationRef} style={{ flex: '1 1 auto' }}>
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
                  containerRef={conversationRef}
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

            {messages.length > 0 && (
              <div
                className="jp-AIAssistant-scrollControl"
                onClick={toggleAutoScroll}
                title={userPreferences.autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
              >
                <FontAwesomeIcon
                  icon={userPreferences.autoScroll ? faToggleOn : faToggleOff}
                  className="fa-icon-sm"
                />
                <span style={{ marginLeft: '4px', fontSize: '12px' }}>Auto-scroll</span>
              </div>
            )}
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
    conversationRef,
    containerWidth,
    isCompact,
    localInputValue,
    handleChatInputChange,
    handleChatSubmit,
    toggleAutoScroll
  ]);

  // Render main component
  return (
    <div className={`jp-AIAssistant ${isDarkTheme ? 'jp-AIAssistant-dark' : 'jp-AIAssistant-light'}`} ref={containerRef}>
      <div className="jp-AIAssistant-header">
        <div className="jp-AIAssistant-title">
          <FontAwesomeIcon icon={faRobot} className="fa-icon-sm" />
          <span>Ollama AI Assistant</span>
        </div>
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          isLoading={isLoading}
          onModelChange={handleModelChange}
          onRefreshModels={() => { }}
        />
      </div>

      {/* Add the missing toolbar with all the buttons */}
      <div className="jp-AIAssistant-toolbar">
        <div className="jp-AIAssistant-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`jp-AIAssistant-tab ${activeTab === tab.id ? 'jp-AIAssistant-tab-active' : ''} ${isCompact ? 'jp-AIAssistant-tab-compact' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
            >
              <FontAwesomeIcon icon={tab.icon} className="fa-icon-sm" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="jp-AIAssistant-toolbar-actions">
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={toggleAutoScroll}
            title={userPreferences.autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
          >
            <FontAwesomeIcon icon={faScroll} className="fa-icon-sm" />
            <span>Auto-Scroll {userPreferences.autoScroll ? 'On' : 'Off'}</span>
          </button>

          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={handleSaveConversation}
            title="Save conversation"
            disabled={isLoading || messages.length === 0}
          >
            <FontAwesomeIcon icon={faSave} className="fa-icon-sm" />
            <span>Save</span>
          </button>

          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={() => setShowConversations(!showConversations)}
            title={showConversations ? "Hide conversations" : "Show conversations"}
          >
            <FontAwesomeIcon icon={faList} className="fa-icon-sm" />
            <span>Conversations</span>
          </button>

          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={() => clearMessages()}
            title="Clear conversation"
            disabled={isLoading || messages.length === 0}
          >
            <FontAwesomeIcon icon={faTrash} className="fa-icon-sm" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Use the renderTabContent function which includes the conversation container */}
      {renderTabContent()}

      {showConversations && (
        <ConversationList
          conversations={savedConversations}
          onSelect={handleLoadConversation}
          onDelete={handleDeleteConversation}
          onExport={handleExportConversation}
          onImport={handleImportConversation}
          onNew={handleNewConversation}
          isVisible={showConversations}
          onBack={() => setShowConversations(false)}
        />
      )}
    </div>
  );
};

/**
 * The AIAssistantPanel component is the entry point for the Ollama AI Assistant panel.
 * It wraps the AIAssistantPanelContent with the necessary context providers.
 * 
 * This component sets up the AI assistant context which provides state management
 * and functionality to all child components in the panel.
 * 
 * @param {AIAssistantPanelProps} props - Component properties
 * @returns {JSX.Element} The rendered panel component with context
 */
export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ notebooks }) => {
  return (
    <AIAssistantProvider notebooks={notebooks}>
      <AIAssistantPanelContent notebooks={notebooks} />
    </AIAssistantProvider>
  );
};

export default AIAssistantPanel; 