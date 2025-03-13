/**
 * @file useOllamaApi.ts
 * @description This file provides a custom React hook for interacting with the Ollama API.
 * It handles model management, response generation, request cancellation, and error handling
 * for communication with locally running Ollama models. The hook abstracts away the complexity
 * of the API communication, providing a clean interface for components to use.
 */
import { useState, useEffect, useCallback } from 'react';
import { OllamaService } from '../services/OllamaService';

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
 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'error' | 'complete';
  timestamp?: {
    start?: number;
    end?: number;
  };
  fromCache?: boolean;
  requestId?: string;
}

/**
 * Configuration options for the useOllamaApi hook.
 * 
 * @interface UseOllamaApiOptions
 * @property {string} [baseUrl] - Base URL for the Ollama API (default: http://localhost:11434)
 * @property {string} [defaultModel] - Default model to use (default: mistral)
 * @property {number} [cacheTTL] - Time to live for cached responses in milliseconds
 */
interface UseOllamaApiOptions {
  baseUrl?: string;
  defaultModel?: string;
  cacheTTL?: number;
}

/**
 * Custom hook for interacting with the Ollama API.
 * 
 * This hook provides functionality for:
 * - Fetching available models from Ollama
 * - Selecting a model to use
 * - Generating responses from the selected model
 * - Handling loading and error states
 * - Canceling in-progress requests
 * 
 * @param {UseOllamaApiOptions} [options] - Configuration options for the Ollama API
 * @returns {Object} An object containing Ollama API state and methods
 * @property {boolean} isLoading - Whether a request is currently in progress
 * @property {string | null} error - Error message if an error occurred, null otherwise
 * @property {string[]} models - List of available Ollama models
 * @property {string} selectedModel - Currently selected model
 * @property {(model: string) => void} setSelectedModel - Function to change the selected model
 * @property {() => Promise<void>} fetchModels - Function to fetch available models
 * @property {(prompt: string, notebookContent?: string, onUpdate?: Function) => Promise<string>} generateResponse - Generate a response from the model
 * @property {(requestId: string) => boolean} cancelRequest - Cancel an in-progress request
 * @property {() => string[]} getActiveRequests - Get IDs of active requests
 */
export const useOllamaApi = (options: UseOllamaApiOptions = {}) => {
  const [ollamaService] = useState(() => new OllamaService(
    options.baseUrl,
    options.defaultModel
  ));

  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(options.defaultModel || 'mistral');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch available models from the Ollama API.
   * Updates the models state and selects the first model if the current 
   * selection is not available.
   * 
   * @returns {Promise<void>}
   */
  const fetchModels = useCallback(async () => {
    try {
      setError(null);
      const availableModels = await ollamaService.getAvailableModels();
      setModels(availableModels);

      // If the currently selected model is not available, select the first one
      if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
        setSelectedModel(availableModels[0]);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to fetch available models');
      setModels([]);
    }
  }, [ollamaService, selectedModel]);

  // Initial model fetch
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Generate a response
  const generateResponse = useCallback(async (
    prompt: string,
    notebookContent?: string,
    onUpdate?: (partialResponse: string, done: boolean) => void
  ): Promise<string> => {
    try {
      setIsLoading(true);
      setError(null);

      // Call the generate response method
      const response = await ollamaService.generateResponse(
        prompt,
        selectedModel,
        notebookContent,
        onUpdate as (partialResponse: string, done: boolean, fromCache?: boolean) => void
      );

      return response;
    } catch (err) {
      console.error('Error generating response:', err);
      setError('Failed to generate response');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ollamaService, selectedModel]);

  // Cancel a request
  const cancelRequest = useCallback((requestId: string): boolean => {
    return ollamaService.cancelRequest(requestId);
  }, [ollamaService]);

  // Get active requests
  const getActiveRequests = useCallback((): string[] => {
    return ollamaService.getActiveRequests();
  }, [ollamaService]);

  return {
    isLoading,
    error,
    models,
    selectedModel,
    setSelectedModel,
    fetchModels,
    generateResponse,
    cancelRequest,
    getActiveRequests
  };
};

export default useOllamaApi; 