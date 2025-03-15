/**
 * @file AIAssistantContext.tsx
 * @description This file implements the React Context for the Ollama AI Assistant.
 * It provides the central state management and functionality for the entire application,
 * handling chat messages, notebook integration, model selection, conversation management,
 * and user preferences. All components can access this context to share state and trigger actions.
 * 
 * The context follows a provider pattern where AIAssistantProvider wraps the application
 * and makes all AI assistant functionality available to child components through the
 * useAIAssistant hook. This creates a centralized state management system that avoids
 * prop drilling and allows components at any level to access AI features.
 */
import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import useOllamaApi from '../hooks/useOllamaApi';
import { useNotebookContent } from '../hooks/useNotebookContent';
import { ThemeManager } from '../utils/themeUtils';

/**
 * Interface defining the structure of a message in the conversation.
 * 
 * @interface Message
 * @property {('user' | 'assistant')} role - Who sent the message (user or AI assistant)
 * @property {string} content - The text content of the message
 * @property {('loading' | 'error' | 'complete')} [status] - The current status of the message
 * @property {{ start?: number; end?: number }} [timestamp] - Timing information for the message
 * @property {boolean} [fromCache] - Whether the message was retrieved from cache
 * @property {string} [requestId] - Unique identifier for the associated request
 * @property {TabType} [tab] - The tab the message belongs to
 */
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

/**
 * Types of tabs available in the AI Assistant.
 * Currently only supports 'chat', but can be extended in the future
 * to include other interaction modes like 'explain', 'debug', etc.
 */
export type TabType = 'chat';

/**
 * Interface for user preferences
 * @interface UserPreferences
 * @property {string} model - The selected AI model
 * @property {boolean} showConversations - Whether to show the conversations panel
 * @property {boolean} isCompact - Whether to use compact mode
 */
interface UserPreferences {
  model: string;
  showConversations: boolean;
  isCompact: boolean;
}

/**
 * Interface defining all the state and functions available through the AI Assistant context.
 * This comprehensive interface provides access to all functionality needed by components
 * throughout the application, including state management, API interactions, notebook
 * operations, and conversation handling.
 * 
 * @interface AIAssistantContextValue
 */
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

// Create the context with a default undefined value
// This forces consumers to use the context within a provider
const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined);

/**
 * Props for the AIAssistantProvider component.
 * 
 * @interface AIAssistantProviderProps
 * @property {ReactNode} children - Child components that will have access to the context
 * @property {INotebookTracker} notebooks - The JupyterLab notebook tracker instance
 */
interface AIAssistantProviderProps {
  children: ReactNode;
  notebooks: INotebookTracker;
}

const defaultPreferences: UserPreferences = {
  model: 'llama2',
  showConversations: true,
  isCompact: false,
};

/**
 * Provider component that makes the AI Assistant context available to its children.
 * 
 * This component initializes all the state, hooks, and functions needed for the AI Assistant,
 * then provides them to child components through React Context. It serves as the central
 * hub for all AI assistant functionality, managing:
 * 
 * - Message history and conversation state
 * - User preferences and settings
 * - Interaction with the Ollama API
 * - Integration with Jupyter notebooks
 * - Conversation import/export capabilities
 * 
 * @param {AIAssistantProviderProps} props - The provider props
 * @returns {JSX.Element} The provider component with children
 */
export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children, notebooks }) => {
  // Local state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(defaultPreferences);

  // Get filtered messages for current tab
  const filteredMessages = useMemo(() =>
    messages.filter(msg => !msg.tab || msg.tab === activeTab),
    [messages, activeTab]
  );

  // Use custom hooks
  const ollama = useOllamaApi({
    defaultModel: userPreferences.model
  });

  const notebook = useNotebookContent(notebooks);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('ollamaAIAssistantPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  // Initialize theme manager when the component mounts
  useEffect(() => {
    // Initialize ThemeManager singleton
    const themeManager = ThemeManager.getInstance();

    // Listen for theme changes from JupyterLab
    const themeListener = {
      onThemeChange: (newTheme: 'light' | 'dark') => {
        console.log(`[Ollama AI] Applying JupyterLab theme: ${newTheme}`);
        // We don't need to update our theme state as we're using JupyterLab's CSS variables
      }
    };

    themeManager.addThemeChangeListener(themeListener);

    return () => {
      themeManager.removeThemeChangeListener(themeListener);
    };
  }, []);

  /**
   * Set a specific user preference
   * 
   * Updates a single preference value while preserving all other preferences.
   * This is a type-safe way to update individual preferences.
   * 
   * @param {K} key - The preference key to update
   * @param {UserPreferences[K]} value - The new value for the preference
   */
  const setUserPreference = useCallback(<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setUserPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Add a new message to the conversation
   * 
   * Adds a message to the conversation history, ensuring it has the correct
   * tab information. This is used for both user and assistant messages.
   * 
   * @param {Message} message - The message to add
   */
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

  /**
   * Update an existing message
   * 
   * Finds a message in the conversation history and updates it with new content.
   * This is primarily used for updating assistant messages during streaming responses.
   * 
   * @param {Message} updatedMessage - The updated message data
   */
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

  /**
   * Send a chat message to the AI assistant
   * 
   * Adds the user message to the conversation, creates a loading assistant message,
   * sends the request to the Ollama API, and updates the assistant message with
   * the response as it streams in.
   * 
   * @param {string} message - The user message to send
   * @returns {Promise<void>} A promise that resolves when the message is fully processed
   */
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

    /**
     * Handler for streaming updates from the API
     * 
     * Updates the assistant message with each chunk of the response as it arrives.
     * 
     * @param {string} partialResponse - The current accumulated response text
     * @param {boolean} done - Whether the response is complete
     * @param {boolean} fromCache - Whether the response was retrieved from cache
     */
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

  /**
   * Retry the last failed message
   * 
   * Finds the last error message and its preceding user message, then
   * removes the error message and sends the user message again.
   * 
   * @returns {Promise<void>} A promise that resolves when the retry is complete
   */
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

  /**
   * Regenerate the last assistant response
   * 
   * Finds the last assistant message and its preceding user message,
   * then sends the user message again to get a new response while
   * keeping the original response in the history.
   * 
   * @returns {Promise<void>} A promise that resolves when regeneration is complete
   */
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

  /**
   * Clear messages for a specific tab
   * 
   * Removes all messages associated with the specified tab or the active tab
   * if no tab is specified. This effectively starts a new conversation.
   * 
   * @param {TabType} [tabType] - The tab to clear messages for (defaults to active tab)
   */
  const clearMessages = useCallback((tabType?: TabType) => {
    const tabToUse = tabType || activeTab;

    // Remove messages that belong to the specified tab
    setMessages(prev => {
      const remainingMessages = prev.filter(msg => msg.tab !== tabToUse);
      return remainingMessages;
    });
  }, [activeTab]);

  /**
   * Stop the current request
   * 
   * Cancels an in-progress API request and updates the associated message
   * to indicate that generation was stopped. Can target a specific request
   * by ID or the most recent loading message.
   * 
   * @param {string} [requestId] - Optional specific request ID to cancel
   */
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

  /**
   * Insert a code cell into the notebook
   * 
   * Creates a new code cell with the specified content and inserts it
   * at the specified index or at the current position if no index is provided.
   * 
   * @param {string} content - The code content to insert
   * @param {number} [index] - Optional index to insert the cell at
   */
  const insertCodeCell = useCallback((content: string, index?: number) => {
    try {
      notebook.notebookService.insertCell('code', content, index);
    } catch (error) {
      console.error('Error inserting code cell:', error);
    }
  }, [notebook.notebookService]);

  /**
   * Execute a code cell in the notebook
   * 
   * Runs the code in the cell at the specified index.
   * 
   * @param {number} index - The index of the cell to execute
   * @returns {Promise<void>} A promise that resolves when execution is complete
   */
  const executeCodeCell = useCallback(async (index: number) => {
    try {
      await notebook.notebookService.executeCell(index);
    } catch (error) {
      console.error('Error executing code cell:', error);
    }
  }, [notebook.notebookService]);

  /**
   * Export the current conversation
   * 
   * Converts the conversation to the specified format (JSON, Markdown, or Notebook).
   * Only exports messages for the current tab.
   * 
   * @param {('json' | 'markdown' | 'notebook')} format - The format to export to
   * @returns {string} The exported conversation as a string
   */
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

  /**
   * Import a conversation
   * 
   * Parses a JSON string of messages and adds them to the current tab,
   * replacing any existing messages for that tab.
   * 
   * @param {string} data - The JSON string containing messages to import
   * @returns {boolean} True if import was successful, false otherwise
   */
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

  /**
   * Save the current conversation to localStorage
   * 
   * Stores all messages in localStorage with a timestamp-based ID.
   * 
   * @returns {string|null} The ID of the saved conversation or null if saving failed
   */
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

  /**
   * Load a conversation from localStorage
   * 
   * Retrieves a previously saved conversation by its ID and replaces
   * the current messages with the loaded ones.
   * 
   * @param {string} id - The ID of the conversation to load
   * @returns {boolean} True if loading was successful, false otherwise
   */
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

/**
 * Custom hook to access the AI Assistant context.
 * 
 * This hook provides a convenient way for components to access all the
 * AI assistant functionality. It ensures the context is being used within
 * a provider and throws an error if it's not.
 * 
 * @returns {AIAssistantContextValue} The AI Assistant context value
 * @throws {Error} If used outside of an AIAssistantProvider
 */
export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

export default AIAssistantContext; 