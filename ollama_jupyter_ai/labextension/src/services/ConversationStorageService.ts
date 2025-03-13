import { Message, TabType } from '../context/AIAssistantContext';

/**
 * ConversationStorageService.ts
 * 
 * This service manages the storage, retrieval, and manipulation of AI assistant conversations
 * in the Ollama Jupyter AI extension. It provides a complete solution for persisting user
 * interactions with the AI assistant using browser localStorage.
 * 
 * Key features:
 * - Save and load conversations with the AI assistant
 * - Export conversations to various formats (JSON, Markdown, Jupyter Notebook)
 * - Import conversations from JSON
 * - Manage conversation history with automatic pruning of old conversations
 * - Utilities for conversation data manipulation
 * 
 * The service implements a simple indexing system to track stored conversations and
 * enforces limits on the number of conversations that can be stored to prevent
 * excessive localStorage usage.
 */

/**
 * Interface for a saved conversation
 */
export interface SavedConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  modelName: string;
  tabType: TabType;
  metadata?: {
    notebookName?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Service for managing conversation storage in localStorage
 * 
 * This service provides a complete solution for persisting conversations between
 * the user and the AI assistant. It handles saving, loading, exporting, and
 * managing conversation history with automatic pruning of old conversations.
 */
export class ConversationStorageService {
  private readonly storagePrefix = 'ollama_conversation_';
  private readonly maxStoredConversations = 50;

  /**
   * Check if localStorage is available for storing conversations
   * 
   * This method verifies that the browser's localStorage API is accessible
   * and functioning correctly. It attempts a test write/read/delete operation
   * to confirm storage is working properly.
   * 
   * @returns True if localStorage is available, false otherwise
   */
  public isAvailable(): boolean {
    try {
      const testKey = `${this.storagePrefix}test`;
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.error('LocalStorage is not available:', error);
      return false;
    }
  }

  /**
   * Save a conversation to localStorage
   * 
   * This method persists a conversation to the browser's localStorage. If the
   * conversation doesn't have an ID, one will be generated. The method also
   * updates the conversation index and enforces the maximum conversation limit.
   * 
   * @param conversation The conversation to save
   * @returns The ID of the saved conversation or null if saving failed
   */
  public saveConversation(conversation: SavedConversation): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      // Ensure we have a valid ID
      const id = conversation.id || this.generateId();
      const storageKey = this.getStorageKey(id);

      // Update the timestamp
      const updatedConversation = {
        ...conversation,
        id,
        updatedAt: Date.now()
      };

      // Convert to JSON and save
      const json = JSON.stringify(updatedConversation);
      localStorage.setItem(storageKey, json);

      // Update the index of conversations
      this.updateConversationIndex(id);

      return id;
    } catch (error) {
      console.error('Failed to save conversation:', error);
      return null;
    }
  }

  /**
   * Load a conversation from localStorage
   * 
   * Retrieves a previously saved conversation by its ID. The method handles
   * parsing the JSON data and returns a properly typed SavedConversation object.
   * 
   * @param id The ID of the conversation to load
   * @returns The conversation or null if not found or if an error occurs
   */
  public loadConversation(id: string): SavedConversation | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const storageKey = this.getStorageKey(id);
      const json = localStorage.getItem(storageKey);

      if (!json) {
        return null;
      }

      const conversation = JSON.parse(json) as SavedConversation;
      return conversation;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }

  /**
   * Get a list of all saved conversations
   * 
   * Retrieves all conversations from localStorage, sorts them by last update time
   * (newest first), and returns them as an array. This provides a complete view
   * of the conversation history.
   * 
   * @returns An array of saved conversations, sorted by update time (newest first)
   */
  public getAllConversations(): SavedConversation[] {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const index = this.getConversationIndex();
      const conversations: SavedConversation[] = [];

      for (const id of index) {
        const conversation = this.loadConversation(id);
        if (conversation) {
          conversations.push(conversation);
        }
      }

      // Sort by updatedAt timestamp, newest first
      return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Failed to get all conversations:', error);
      return [];
    }
  }

  /**
   * Delete a conversation from localStorage
   * 
   * Removes a specific conversation from storage and updates the conversation index.
   * This is used for manual cleanup of unwanted conversations.
   * 
   * @param id The ID of the conversation to delete
   * @returns True if deletion was successful, false otherwise
   */
  public deleteConversation(id: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const storageKey = this.getStorageKey(id);
      localStorage.removeItem(storageKey);

      // Update the index
      this.removeFromConversationIndex(id);

      return true;
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return false;
    }
  }

  /**
   * Export a conversation to a string format
   * 
   * Converts a conversation to one of several formats for external use:
   * - JSON: Raw data format for programmatic use
   * - Markdown: Human-readable text format
   * - Notebook: Jupyter notebook format with executable code cells
   * 
   * @param id The ID of the conversation to export
   * @param format The format to export to (json, markdown, notebook)
   * @returns The exported conversation as a string, or null if export failed
   */
  public exportConversation(id: string, format: 'json' | 'markdown' | 'notebook'): string | null {
    const conversation = this.loadConversation(id);

    if (!conversation) {
      return null;
    }

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);

      case 'markdown':
        return this.convertToMarkdown(conversation);

      case 'notebook':
        return this.convertToNotebook(conversation);

      default:
        return null;
    }
  }

  /**
   * Import a conversation from a string
   * 
   * Parses a JSON string representation of a conversation and saves it to localStorage.
   * The imported conversation receives a new ID and timestamps to avoid conflicts.
   * 
   * @param data The JSON string data to import
   * @returns The ID of the imported conversation or null if import failed
   */
  public importConversation(data: string): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      let conversation: SavedConversation;

      try {
        // Try to parse as JSON
        conversation = JSON.parse(data) as SavedConversation;
      } catch (e) {
        // If not valid JSON, try to parse as markdown or notebook
        console.error('Invalid JSON format for import:', e);
        return null;
      }

      // Validate the conversation
      if (!conversation.messages || !Array.isArray(conversation.messages)) {
        console.error('Invalid conversation format: missing or invalid messages array');
        return null;
      }

      // Generate a new ID for the imported conversation
      conversation.id = this.generateId();
      conversation.createdAt = Date.now();
      conversation.updatedAt = Date.now();

      // Save the conversation
      return this.saveConversation(conversation);
    } catch (error) {
      console.error('Failed to import conversation:', error);
      return null;
    }
  }

  /**
   * Clear all stored conversations
   * 
   * Removes all conversations from localStorage and resets the conversation index.
   * This provides a way to completely reset the conversation history.
   * 
   * @returns True if clearing was successful, false otherwise
   */
  public clearAllConversations(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const index = this.getConversationIndex();

      // Remove all conversations
      for (const id of index) {
        const storageKey = this.getStorageKey(id);
        localStorage.removeItem(storageKey);
      }

      // Clear the index
      localStorage.removeItem(this.getIndexKey());

      return true;
    } catch (error) {
      console.error('Failed to clear all conversations:', error);
      return false;
    }
  }

  /**
   * Generate a new unique ID for a conversation
   * 
   * Creates a timestamp-based ID with a random component to ensure uniqueness.
   * The format is: timestamp-randomNumber
   * 
   * @returns A unique ID string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }

  /**
   * Get the storage key for a conversation
   * 
   * Constructs the localStorage key for a specific conversation by combining
   * the storage prefix with the conversation ID.
   * 
   * @param id The conversation ID
   * @returns The complete storage key for the conversation
   */
  private getStorageKey(id: string): string {
    return `${this.storagePrefix}${id}`;
  }

  /**
   * Get the storage key for the conversation index
   * 
   * Constructs the localStorage key for the conversation index by combining
   * the storage prefix with "index".
   * 
   * @returns The storage key for the conversation index
   */
  private getIndexKey(): string {
    return `${this.storagePrefix}index`;
  }

  /**
   * Get the array of conversation IDs
   * 
   * Retrieves the list of all conversation IDs from the index in localStorage.
   * This index is used to track all saved conversations.
   * 
   * @returns An array of conversation IDs
   */
  private getConversationIndex(): string[] {
    try {
      const json = localStorage.getItem(this.getIndexKey());
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('Failed to get conversation index:', error);
      return [];
    }
  }

  /**
   * Update the conversation index with a new ID
   * 
   * Adds or moves a conversation ID to the front of the index and enforces
   * the maximum number of stored conversations by removing excess conversations.
   * 
   * @param id The ID to add to the index
   */
  private updateConversationIndex(id: string): void {
    try {
      let index = this.getConversationIndex();

      // Remove if exists (to avoid duplicates)
      index = index.filter(existingId => existingId !== id);

      // Add to the front of the array (newest first)
      index.unshift(id);

      // Enforce maximum number of conversations
      if (index.length > this.maxStoredConversations) {
        const toRemove = index.splice(this.maxStoredConversations);

        // Remove excess conversations
        toRemove.forEach(idToRemove => {
          localStorage.removeItem(this.getStorageKey(idToRemove));
        });
      }

      // Save the updated index
      localStorage.setItem(this.getIndexKey(), JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update conversation index:', error);
    }
  }

  /**
   * Remove an ID from the conversation index
   * 
   * Removes a specific conversation ID from the index when a conversation
   * is deleted.
   * 
   * @param id The ID to remove from the index
   */
  private removeFromConversationIndex(id: string): void {
    try {
      let index = this.getConversationIndex();
      index = index.filter(existingId => existingId !== id);
      localStorage.setItem(this.getIndexKey(), JSON.stringify(index));
    } catch (error) {
      console.error('Failed to remove from conversation index:', error);
    }
  }

  /**
   * Convert a conversation to Markdown format
   * 
   * Transforms a conversation into a human-readable Markdown document with
   * headers, metadata, and properly formatted messages.
   * 
   * @param conversation The conversation to convert
   * @returns Markdown string representation
   */
  private convertToMarkdown(conversation: SavedConversation): string {
    let markdown = `# Ollama AI Conversation: ${conversation.title || 'Untitled'}\n\n`;
    markdown += `*Model: ${conversation.modelName}*\n\n`;
    markdown += `*Created: ${new Date(conversation.createdAt).toLocaleString()}*\n\n`;

    if (conversation.metadata?.notebookName) {
      markdown += `*Notebook: ${conversation.metadata.notebookName}*\n\n`;
    }

    if (conversation.metadata?.tags && conversation.metadata.tags.length > 0) {
      markdown += `*Tags: ${conversation.metadata.tags.join(', ')}*\n\n`;
    }

    markdown += `---\n\n`;

    // Add each message
    conversation.messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      markdown += `## ${role}\n\n${message.content}\n\n`;
    });

    return markdown;
  }

  /**
   * Convert a conversation to Jupyter Notebook format
   * 
   * Transforms a conversation into a Jupyter Notebook JSON structure with
   * markdown cells for text and code cells for executable code blocks.
   * The notebook includes metadata about the original conversation.
   * 
   * @param conversation The conversation to convert
   * @returns Jupyter Notebook JSON string
   */
  private convertToNotebook(conversation: SavedConversation): string {
    const cells: any[] = [];

    // Add header markdown cell
    let headerContent = `# Ollama AI Conversation: ${conversation.title || 'Untitled'}\n\n`;
    headerContent += `Model: ${conversation.modelName}\n\n`;
    headerContent += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n\n`;

    cells.push({
      cell_type: 'markdown',
      metadata: {},
      source: headerContent.split('\n')
    });

    // Add each message as a cell
    conversation.messages.forEach(message => {
      if (message.role === 'user') {
        // User messages as markdown cells with comments
        cells.push({
          cell_type: 'markdown',
          metadata: {},
          source: [`## User Query\n\n${message.content}`]
        });
      } else {
        // Look for code blocks in assistant messages
        const content = message.content;
        const codeBlocks = content.match(/```(?:python)?\n([\s\S]*?)```/g);

        if (codeBlocks && codeBlocks.length > 0) {
          // First add the text content as markdown
          const textParts = content.split(/```(?:python)?\n[\s\S]*?```/);
          if (textParts[0].trim()) {
            cells.push({
              cell_type: 'markdown',
              metadata: {},
              source: [`## Assistant Response\n\n${textParts[0].trim()}`]
            });
          }

          // Then add each code block as a code cell
          codeBlocks.forEach((block, index) => {
            const code = block.replace(/```(?:python)?\n([\s\S]*?)```/, '$1').trim();
            cells.push({
              cell_type: 'code',
              metadata: {},
              source: code.split('\n'),
              execution_count: null,
              outputs: []
            });

            // Add any text after the code block
            if (textParts[index + 1] && textParts[index + 1].trim()) {
              cells.push({
                cell_type: 'markdown',
                metadata: {},
                source: [textParts[index + 1].trim()]
              });
            }
          });
        } else {
          // No code blocks, just add as markdown
          cells.push({
            cell_type: 'markdown',
            metadata: {},
            source: [`## Assistant Response\n\n${content}`]
          });
        }
      }
    });

    // Create the notebook object
    const notebook = {
      cells,
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          codemirror_mode: {
            name: 'ipython',
            version: 3
          },
          file_extension: '.py',
          mimetype: 'text/x-python',
          name: 'python',
          nbconvert_exporter: 'python',
          pygments_lexer: 'ipython3',
          version: '3.8.0'
        },
        ollama_metadata: {
          conversation_id: conversation.id,
          model: conversation.modelName,
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt,
          ...conversation.metadata
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    return JSON.stringify(notebook, null, 2);
  }
}

export default ConversationStorageService; 