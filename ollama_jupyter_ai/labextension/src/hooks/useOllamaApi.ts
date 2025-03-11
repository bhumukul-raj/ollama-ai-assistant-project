import { useState, useEffect, useCallback } from 'react';
import { OllamaService } from '../services/OllamaService';

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

interface UseOllamaApiOptions {
  baseUrl?: string;
  defaultModel?: string;
  cacheTTL?: number;
}

export const useOllamaApi = (options: UseOllamaApiOptions = {}) => {
  const [ollamaService] = useState(() => new OllamaService(
    options.baseUrl,
    options.defaultModel
  ));
  
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(options.defaultModel || 'mistral');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch available models
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