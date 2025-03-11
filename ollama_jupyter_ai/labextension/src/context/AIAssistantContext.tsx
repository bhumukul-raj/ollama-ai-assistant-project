import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import useOllamaApi from '../hooks/useOllamaApi';
import { useNotebookContent } from '../hooks/useNotebookContent';

// Types
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'error' | 'complete';
  timestamp?: {
    start?: number;
    end?: number;
  };
  fromCache?: boolean;
  requestId?: string;
  tab?: TabType;
}

export type TabType = 'chat';

interface UserPreferences {
  autoScroll: boolean;
  defaultModel: string;
  theme: 'light' | 'dark' | 'auto';
  showTimestamps: boolean;
  enableKeyboardShortcuts: boolean;
}

// Context interface
interface AIAssistantContextValue {
  // State
  messages: Message[];
  chatInput: string;
  activeTab: TabType;
  isLoading: boolean;
  userPreferences: UserPreferences;
  error: string | null;

  // Ollama API
  models: string[];
  selectedModel: string;

  // Notebook content
  notebookContent: string;
  activeCellContent: {
    content: string;
    cellType: string;
    index: number;
  } | null;
  hasActiveNotebook: boolean;

  // Actions
  setChatInput: (input: string) => void;
  setActiveTab: (tab: TabType) => void;
  setUserPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  setSelectedModel: (model: string) => void;

  // Message operations
  sendChatMessage: (message: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  regenerateResponse: () => Promise<void>;
  clearMessages: (tabType?: TabType) => void;
  stopCurrentRequest: (requestId?: string) => void;

  // Notebook operations
  refreshNotebookContent: () => void;
  refreshActiveCellContent: () => void;
  insertCodeCell: (content: string, index?: number) => void;
  executeCodeCell: (index: number) => Promise<void>;

  // Data operations
  exportConversation: (format: 'json' | 'markdown' | 'notebook') => string;
  importConversation: (data: string) => boolean;
  saveConversation: () => string | null;
  loadConversation: (id: string) => boolean;
}

// Create context with a default undefined value
const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined);

// Provider props
interface AIAssistantProviderProps {
  children: ReactNode;
  notebooks: INotebookTracker;
}

// Default user preferences
const defaultUserPreferences: UserPreferences = {
  autoScroll: true,
  defaultModel: 'mistral',
  theme: 'auto',
  showTimestamps: true,
  enableKeyboardShortcuts: true
};

// Load preferences from localStorage
const loadUserPreferences = (): UserPreferences => {
  try {
    const savedPrefs = localStorage.getItem('ollamaAIAssistantPreferences');
    if (savedPrefs) {
      return { ...defaultUserPreferences, ...JSON.parse(savedPrefs) };
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return defaultUserPreferences;
};

// Provider component
export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children, notebooks }) => {
  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(loadUserPreferences);

  // Get filtered messages for current tab
  const filteredMessages = useMemo(() =>
    messages.filter(msg => !msg.tab || msg.tab === activeTab),
    [messages, activeTab]
  );

  // Use custom hooks
  const ollama = useOllamaApi({
    defaultModel: userPreferences.defaultModel
  });

  const notebook = useNotebookContent(notebooks);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ollamaAIAssistantPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  // Set a specific user preference
  const setUserPreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  // Add a new message to the conversation with the correct tab
  const addMessage = useCallback((message: Message) => {
    // Ensure message has tab info
    const messageWithTab = {
      ...message,
      tab: activeTab // Set the current tab for the message
    };

    setMessages(prev => {
      const newMessages = [...prev, messageWithTab];
      return newMessages;
    });
  }, [activeTab]);

  // Update a message by finding it and replacing it
  const updateMessage = useCallback((updatedMessage: Message) => {
    // Ensure the updated message has the correct tab information
    const messageWithTab = {
      ...updatedMessage,
      tab: updatedMessage.tab || activeTab
    };

    setMessages(prev => prev.map(msg =>
      (msg.role === messageWithTab.role &&
        msg.timestamp?.start === messageWithTab.timestamp?.start)
        ? messageWithTab
        : msg
    ));
  }, [activeTab]);

  // Send a chat message
  const sendChatMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    };
    addMessage(userMessage);

    // Generate a unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Add assistant message with loading status and requestId
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      status: 'loading',
      timestamp: {
        start: Date.now()
      },
      requestId: requestId // Ensure requestId is attached here
    };
    addMessage(assistantMessage);

    // Handler for streaming updates
    const handlePartialResponse = (partialResponse: string, done: boolean, fromCache?: boolean) => {
      updateMessage({
        ...assistantMessage,
        content: partialResponse,
        status: done ? 'complete' : 'loading',
        fromCache,
        requestId, // Make sure requestId is included in updates
        timestamp: {
          start: assistantMessage.timestamp?.start,
          end: done ? Date.now() : undefined
        }
      });
    };

    try {
      // Generate response
      const response = await ollama.generateResponse(
        message,
        notebook.notebookService.getNotebookContent(),
        handlePartialResponse
      );

      // Update message with completed response
      updateMessage({
        ...assistantMessage,
        content: response,
        status: 'complete',
        requestId,
        timestamp: {
          start: assistantMessage.timestamp?.start,
          end: Date.now()
        }
      });

      // Clear input after successful submission
      setChatInput('');
    } catch (error) {
      // Update message with error status
      updateMessage({
        ...assistantMessage,
        content: 'An error occurred while generating a response.',
        status: 'error',
        requestId, // Ensure requestId is included even on error
        timestamp: {
          start: assistantMessage.timestamp?.start,
          end: Date.now()
        }
      });
    }
  }, [ollama, notebook.notebookService, addMessage, updateMessage, setChatInput]);

  // Retry the last message
  const retryLastMessage = useCallback(async () => {
    // Find the last error message and its preceding user message
    const lastErrorIndex = [...messages].findIndex(msg => msg.status === 'error');

    if (lastErrorIndex === -1) return;

    // Find the last user message before this error
    let lastUserMessageIndex = -1;
    for (let i = lastErrorIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const userMessage = messages[lastUserMessageIndex];

    // Remove the error message
    setMessages(prev => [...prev.slice(0, lastErrorIndex), ...prev.slice(lastErrorIndex + 1)]);

    // Retry the operation based on the active tab
    if (activeTab === 'chat') {
      await sendChatMessage(userMessage.content);
    }
  }, [messages, activeTab, sendChatMessage, notebook.notebookService]);

  // Regenerate the last response
  const regenerateResponse = useCallback(async () => {
    // Find the last assistant message and its preceding user message
    const lastAssistantIndex = [...messages].reverse().findIndex(msg => msg.role === 'assistant');

    if (lastAssistantIndex === -1) return;

    // Calculate the actual index (from the end)
    const assistantIndex = messages.length - 1 - lastAssistantIndex;

    // Find the last user message before this assistant message
    let lastUserMessageIndex = -1;
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const userMessage = messages[lastUserMessageIndex];

    // We do NOT remove the assistant message - instead, we'll add a new response
    // This keeps the history intact

    // Regenerate based on the active tab
    if (activeTab === 'chat') {
      await sendChatMessage(userMessage.content);
    }
  }, [messages, activeTab, sendChatMessage, notebook.notebookService]);

  // Clear messages
  const clearMessages = useCallback((tabType?: TabType) => {
    const tabToUse = tabType || activeTab;

    // Remove excessive logging to improve performance

    // Remove messages that belong to the specified tab
    setMessages(prev => {
      const remainingMessages = prev.filter(msg => msg.tab !== tabToUse);
      return remainingMessages;
    });
  }, [activeTab]);

  // Stop current request
  const stopCurrentRequest = useCallback((requestId?: string) => {
    console.log("Stop request called", requestId ? `for requestId: ${requestId}` : "without requestId");

    // If a specific requestId is provided, cancel just that request
    if (requestId) {
      console.log(`Attempting to cancel specific request: ${requestId}`);
      ollama.cancelRequest(requestId);
      console.log(`Cancel request attempted for ${requestId}`);

      // Find and update the specific message
      const messageIndex = messages.findIndex(msg => msg.requestId === requestId);
      if (messageIndex !== -1) {
        const messageToUpdate = messages[messageIndex];
        updateMessage({
          ...messageToUpdate,
          content: messageToUpdate.content + "\n\n[Generation stopped by user]",
          status: 'complete',
          timestamp: {
            start: messageToUpdate.timestamp?.start,
            end: Date.now()
          }
        });
        console.log(`Updated message at index ${messageIndex} with stop notification`);
      } else {
        console.log(`Could not find message with requestId: ${requestId}`);
      }
      return;
    }

    // Otherwise, find the last loading message
    console.log("Looking for any loading messages to stop");
    const loadingMessageIndex = [...messages].reverse().findIndex(msg => msg.status === 'loading');

    if (loadingMessageIndex === -1) {
      console.log("No loading messages found");
      return;
    }

    // Calculate the actual index (from the end)
    const actualIndex = messages.length - 1 - loadingMessageIndex;
    const loadingMessage = messages[actualIndex];
    console.log(`Found loading message at index ${actualIndex}`, loadingMessage);

    // Cancel the request if it has a requestId
    if (loadingMessage.requestId) {
      console.log(`Canceling request with ID: ${loadingMessage.requestId}`);
      ollama.cancelRequest(loadingMessage.requestId);
      console.log(`Cancel request attempted for ${loadingMessage.requestId}`);
    } else {
      console.log("Loading message has no requestId - THIS SHOULD NOT HAPPEN IF THE FIX IS WORKING");

      // Debug and log all messages to identify why requestId is missing
      console.log("All messages:", messages);

      // Emergency fallback - try to cancel latest open request
      const latestActiveRequests = ollama.getActiveRequests?.();
      if (latestActiveRequests && latestActiveRequests.length > 0) {
        console.log("Attempting emergency cancel of latest request:", latestActiveRequests[0]);
        ollama.cancelRequest(latestActiveRequests[0]);
      }
    }

    // Update the message to show "Generation stopped"
    updateMessage({
      ...loadingMessage,
      content: loadingMessage.content + "\n\n[Generation stopped by user]",
      status: 'complete',
      timestamp: {
        start: loadingMessage.timestamp?.start,
        end: Date.now()
      }
    });
    console.log("Updated message with stop notification");
  }, [messages, ollama, updateMessage]);

  // Insert code cell
  const insertCodeCell = useCallback((content: string, index?: number) => {
    try {
      notebook.notebookService.insertCell('code', content, index);
    } catch (error) {
      console.error('Error inserting code cell:', error);
    }
  }, [notebook.notebookService]);

  // Execute code cell
  const executeCodeCell = useCallback(async (index: number) => {
    try {
      await notebook.notebookService.executeCell(index);
    } catch (error) {
      console.error('Error executing code cell:', error);
    }
  }, [notebook.notebookService]);

  // Export conversation
  const exportConversation = useCallback((format: 'json' | 'markdown' | 'notebook') => {
    // Only export messages for the current tab
    const messagesToExport = messages.filter(msg => !msg.tab || msg.tab === activeTab);

    if (format === 'json') {
      return JSON.stringify(messagesToExport, null, 2);
    } else if (format === 'markdown') {
      return messagesToExport.map(msg => {
        const role = msg.role === 'user' ? '**User**' : '**Assistant**';
        return `${role}:\n\n${msg.content}\n\n---\n`;
      }).join('\n');
    } else if (format === 'notebook') {
      // Create cells for a Jupyter notebook
      const cells = messagesToExport.map(msg => {
        if (msg.role === 'user') {
          return {
            cell_type: 'markdown',
            source: `**User**:\n\n${msg.content}`
          };
        } else {
          return {
            cell_type: 'markdown',
            source: `**Assistant**:\n\n${msg.content}`
          };
        }
      });

      const notebookJson = {
        cells,
        metadata: {
          kernelspec: {
            display_name: 'Python 3',
            language: 'python',
            name: 'python3'
          }
        },
        nbformat: 4,
        nbformat_minor: 4
      };

      return JSON.stringify(notebookJson, null, 2);
    }

    return '';
  }, [messages, activeTab]);

  // Import conversation
  const importConversation = useCallback((data: string) => {
    try {
      const importedMessages = JSON.parse(data) as Message[];

      // Validate the imported messages and add tab info if missing
      const validatedMessages = importedMessages.map(msg => ({
        ...msg,
        tab: msg.tab || activeTab // Set current tab if not specified
      }));

      // Replace messages for the current tab
      setMessages(prev => {
        // Remove existing messages for the current tab
        const otherTabMessages = prev.filter(msg => msg.tab !== activeTab);
        // Add the imported messages
        return [...otherTabMessages, ...validatedMessages];
      });

      return true;
    } catch (error) {
      console.error('Error importing conversation:', error);
      return false;
    }
  }, [activeTab]);

  // Save conversation
  const saveConversation = useCallback(() => {
    try {
      const conversationId = `conversation_${Date.now()}`;
      localStorage.setItem(`ollamaAIAssistant_${conversationId}`, JSON.stringify(messages));
      return conversationId;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  }, [messages]);

  // Load conversation
  const loadConversation = useCallback((id: string) => {
    try {
      const savedData = localStorage.getItem(`ollamaAIAssistant_${id}`);
      if (savedData) {
        const loadedMessages = JSON.parse(savedData) as Message[];
        setMessages(loadedMessages);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return false;
    }
  }, []);

  // Prepare context value
  const contextValue: AIAssistantContextValue = {
    // State
    messages: filteredMessages,
    chatInput,
    activeTab,
    isLoading: ollama.isLoading,
    userPreferences,
    error: ollama.error,

    // Ollama API
    models: ollama.models,
    selectedModel: ollama.selectedModel,

    // Notebook content
    notebookContent: notebook.notebookService.getNotebookContent(),
    activeCellContent: notebook.notebookService.getActiveCellContent(),
    hasActiveNotebook: notebook.hasActiveNotebook,

    // Actions
    setChatInput,
    setActiveTab,
    setUserPreference,
    setSelectedModel: ollama.setSelectedModel,

    // Message operations
    sendChatMessage,
    retryLastMessage,
    regenerateResponse,
    clearMessages,
    stopCurrentRequest,

    // Notebook operations
    refreshNotebookContent: () => notebook.notebookService.refreshNotebookContent(),
    refreshActiveCellContent: () => notebook.notebookService.refreshActiveCellContent(),
    insertCodeCell,
    executeCodeCell,

    // Data operations
    exportConversation,
    importConversation,
    saveConversation,
    loadConversation,
  };

  return (
    <AIAssistantContext.Provider value={contextValue}>
      {children}
    </AIAssistantContext.Provider>
  );
};

// Custom hook to use the AI Assistant context
export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

export default AIAssistantContext; 