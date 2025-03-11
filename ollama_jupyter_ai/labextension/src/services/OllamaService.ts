import axios from 'axios';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  context: number[];
  done: boolean;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

// Cache interface for storing responses
interface CacheEntry {
  response: string;
  timestamp: number;
  expiresAt: number;
}

// Maximum size for notebook context
const MAX_NOTEBOOK_CONTEXT_SIZE = 5000;

// New persistent storage interface
interface OllamaStorageService {
  saveCache(key: string, value: CacheEntry): void;
  getCache(key: string): CacheEntry | null;
  getAllCacheKeys(): string[];
  clearCache(): void;
  isAvailable(): boolean;
}

// New service options interface
interface OllamaServiceOptions {
  baseUrl?: string;
  defaultModel?: string;
  cacheLifetime?: number;
  maxCacheSize?: number;
  persistCache?: boolean;
  debugEnabled?: boolean;
}

// Implement a local storage-based persistent cache
class LocalStorageCacheService implements OllamaStorageService {
  private readonly prefix = 'ollama_cache_';
  
  constructor() {
    this.cleanupExpiredEntries();
  }
  
  public saveCache(key: string, value: CacheEntry): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
      this.pruneCache(); // Try to make space
    }
  }
  
  public getCache(key: string): CacheEntry | null {
    try {
      const cached = localStorage.getItem(this.prefix + key);
      if (!cached) return null;
      
      const entry = JSON.parse(cached) as CacheEntry;
      
      // Check if entry has expired
      if (entry.expiresAt < Date.now()) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return entry;
    } catch (error) {
      console.error('Failed to retrieve cache from localStorage:', error);
      return null;
    }
  }
  
  public getAllCacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }
  
  public clearCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Check if local storage is available
  public isAvailable(): boolean {
    try {
      const testKey = '__ollama_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Remove expired entries to free up space
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntry;
          if (entry.expiresAt < now) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove invalid entries
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Remove oldest entries when we're out of space
  private pruneCache(): void {
    try {
      // Get all cache entries with timestamps
      const entries: { key: string; timestamp: number }[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntry;
            entries.push({ key, timestamp: entry.timestamp });
          } catch (error) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 20% of entries
      const removeCount = Math.max(1, Math.ceil(entries.length * 0.2));
      entries.slice(0, removeCount).forEach(entry => {
        localStorage.removeItem(entry.key);
      });
    } catch (error) {
      console.error('Error pruning cache:', error);
    }
  }
}

// Add custom error types
export class OllamaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR');
    this.name = 'OllamaConnectionError';
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(message: string) {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'OllamaTimeoutError';
  }
}

// Enhanced OllamaService class
export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private debugEnabled: boolean = true;
  private responseCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 1000 * 60 * 30; // 30 minutes cache lifetime by default
  private activeRequests: Map<string, AbortController> = new Map();
  private storageService: OllamaStorageService | null = null;
  private maxCacheSize: number;
  private useTokenStreaming: boolean = true;
  
  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'mistral', options?: OllamaServiceOptions) {
    this.baseUrl = options?.baseUrl || baseUrl;
    this.defaultModel = options?.defaultModel || defaultModel;
    this.cacheTTL = options?.cacheLifetime || 1000 * 60 * 30;
    this.maxCacheSize = options?.maxCacheSize || 100;
    this.debugEnabled = options?.debugEnabled ?? true;
    
    // Initialize persistent storage if requested
    if (options?.persistCache) {
      const storageService = new LocalStorageCacheService();
      if (storageService.isAvailable()) {
        this.storageService = storageService;
        this.log('Persistent cache enabled using localStorage');
      } else {
        this.log('Persistent cache requested but localStorage is not available');
      }
    }
    
    this.log('OllamaService initialized with base URL:', this.baseUrl);
    this.log('Default model set to:', this.defaultModel);
  }

  /**
   * A simple log method that conditionally logs based on debug setting
   */
  private log(...args: any[]): void {
    if (this.debugEnabled) {
      // Use only essential logging; avoid excessive console output
      console.log('[OllamaService]', ...args);
    }
  }

  /**
   * Get a list of available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.log('Fetching available models');
      
      const response = await axios.get<{ models: OllamaModel[] }>(`${this.baseUrl}/api/tags`, {
        timeout: 5000 // 5 second timeout
      });
      
      if (!response.data || !Array.isArray(response.data.models)) {
        throw new OllamaError('Invalid response format from Ollama API');
      }
      
      const models = response.data.models.map(model => model.name);
      this.log('Found models:', models);
      return models;
    } catch (error) {
      this.log('Error fetching models:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new OllamaConnectionError('Could not connect to Ollama. Please make sure it is running on ' + this.baseUrl);
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          throw new OllamaTimeoutError('Connection to Ollama timed out. Please check your network connection.');
        }
        if (error.response) {
          throw new OllamaError(`Ollama API error: ${error.response.status} - ${error.response.statusText}`);
        }
      }
      
      throw new OllamaError('Failed to fetch models from Ollama: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Set the default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
  
  /**
   * Generate a cache key from the prompt and model
   */
  private getCacheKey(prompt: string, model: string): string {
    // Simple hashing function for the cache key
    return `${model}_${this.hashString(prompt)}`;
  }
  
  /**
   * Hash a string to create a shorter key
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16); // Convert to hex string
  }
  
  /**
   * Check if we have a cached response
   */
  private getCachedResponse(prompt: string, model: string): { response: string, fromCache: boolean } | null {
    const cacheKey = this.getCacheKey(prompt, model);
    
    // First check in-memory cache
    const memoryCached = this.responseCache.get(cacheKey);
    if (memoryCached) {
      const now = Date.now();
      if (memoryCached.expiresAt > now) {
        this.log('Cache hit (memory):', cacheKey);
        return { 
          response: memoryCached.response + '__FROM_CACHE__', 
          fromCache: true 
        };
      } else {
        // Expired entry
        this.responseCache.delete(cacheKey);
      }
    }
    
    // Then check persistent storage if available
    if (this.storageService) {
      const storageCached = this.storageService.getCache(cacheKey);
      if (storageCached) {
        // Add to in-memory cache for faster access next time
        this.responseCache.set(cacheKey, storageCached);
        this.log('Cache hit (storage):', cacheKey);
        return { 
          response: storageCached.response + '__FROM_CACHE__', 
          fromCache: true 
        };
      }
    }
    
    return null;
  }
  
  /**
   * Store a response in the cache
   */
  private cacheResponse(prompt: string, model: string, response: string): void {
    const cacheKey = this.getCacheKey(prompt, model);
    const now = Date.now();
    
    const cacheEntry: CacheEntry = {
      response,
      timestamp: now,
      expiresAt: now + this.cacheTTL
    };
    
    // Add to in-memory cache
    this.responseCache.set(cacheKey, cacheEntry);
    
    // Add to persistent storage if available
    if (this.storageService) {
      this.storageService.saveCache(cacheKey, cacheEntry);
    }
    
    // Ensure cache doesn't grow too large
    this.enforceMemoryCacheLimit();
    
    this.log('Cached response for:', cacheKey);
  }
  
  /**
   * Limit the in-memory cache size by removing oldest entries
   */
  private enforceMemoryCacheLimit(): void {
    if (this.responseCache.size <= this.maxCacheSize) return;
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [key] of entriesToRemove) {
      this.responseCache.delete(key);
    }
    
    this.log(`Removed ${entriesToRemove.length} old entries from memory cache`);
  }
  
  /**
   * Clear the cache (both in-memory and persistent)
   */
  public clearCache(): void {
    this.responseCache.clear();
    
    if (this.storageService) {
      this.storageService.clearCache();
    }
    
    this.log('Cache cleared');
  }

  /**
   * Cancel an ongoing request
   */
  cancelRequest(requestId: string): boolean {
    console.log(`OllamaService: Attempting to cancel request ${requestId}`);
    
    const controller = this.activeRequests.get(requestId);
    
    if (controller) {
      try {
        console.log(`OllamaService: AbortController found for ${requestId}, sending abort signal...`);
        // Force immediate abort of the fetch request
        controller.abort();
        this.activeRequests.delete(requestId);
        
        // Also send a direct cancellation request to Ollama's API
        this.sendCancellationRequest(requestId)
          .then(() => console.log(`Direct cancellation request sent to Ollama for ${requestId}`))
          .catch(err => console.error(`Failed to send direct cancellation to Ollama: ${err}`));
        
        console.log(`Request ${requestId} canceled successfully`);
        return true;
      } catch (error) {
        console.error(`OllamaService: Error canceling request ${requestId}:`, error);
        // Still remove from active requests to avoid hanging requests
        this.activeRequests.delete(requestId); 
        return false;
      }
    }
    
    console.warn(`OllamaService: Request ${requestId} not found for cancellation`);
    return false;
  }

  /**
   * Send a direct cancellation request to Ollama's API
   * This attempts to send a direct signal to stop generation
   */
  private async sendCancellationRequest(requestId: string): Promise<void> {
    try {
      // Create a new AbortController for the cancellation request itself
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      // Attempt to send a POST request to Ollama's cancellation endpoint
      // This is a more direct approach to ensure the generation stops
      await fetch(`${this.baseUrl}/api/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.log(`Direct cancellation request for ${requestId} completed`);
    } catch (error) {
      // If this fails, log it but don't throw - we've already tried the AbortController approach
      this.log(`Error in direct cancellation request: ${error}`);
    }
  }

  /**
   * Handle a request cancellation during streaming
   */
  private handleStreamCancellation(requestId: string, controller: AbortController, fullResponseText: string, onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void): void {
    this.log(`Request ${requestId} was cancelled during streaming`);
    
    const responseWithCancellation = fullResponseText + '\n\n[Generation stopped by user]';
    
    // If we have an update callback, call it to indicate cancellation
    if (onUpdate) {
      onUpdate(responseWithCancellation, true, false);
    }
    
    // Cache the partial response with cancellation message
    this.cacheResponse(requestId, this.defaultModel, responseWithCancellation);
    
    // Remove the active request
    this.activeRequests.delete(requestId);
  }

  /**
   * Send a request to Ollama with retry logic for transient failures
   */
  private async sendRequest(
    prompt: string, 
    model: string, 
    includeNotebookContext: boolean = false,
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string,
    retryCount: number = 3
  ): Promise<{ response: string, fromCache: boolean }> {
    this.log('Sending request to Ollama API:', {
      model,
      prompt,
      includeNotebookContext,
      requestId
    });

    // Check cache first
    if (!onUpdate || this.useTokenStreaming) {
      const cachedResponse = this.getCachedResponse(prompt, model);
      if (cachedResponse) {
        if (onUpdate) {
          onUpdate(cachedResponse.response, true, true);
        }
        return cachedResponse;
      }
    }

    const fullUrl = `${this.baseUrl}/api/generate`;
    const requestBody = {
      model,
      prompt,
      options: {
        temperature: 0.7,
        max_tokens: 2048
      },
      stream: !!onUpdate
    };

    const controller = new AbortController();
    if (requestId) {
      this.activeRequests.set(requestId, controller);
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < retryCount) {
      try {
        const requestStartTime = Date.now();
        
        if (onUpdate) {
          return await this.handleStreamingRequest(
            fullUrl,
            requestBody,
            controller,
            requestId,
            prompt,
            model,
            onUpdate
          );
        } else {
          return await this.handleNonStreamingRequest(
            fullUrl,
            requestBody,
            controller,
            requestId,
            prompt,
            model
          );
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if request was cancelled
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // Don't retry if it's a non-transient error
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
          throw new OllamaError(`Ollama API error: ${error.response.status} - ${error.response.statusText}`);
        }
        
        attempt++;
        if (attempt < retryCount) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5 seconds
          await new Promise(resolve => setTimeout(resolve, delay));
          this.log(`Retrying request (attempt ${attempt + 1}/${retryCount})`);
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new OllamaError('Failed to get response from Ollama API after multiple attempts');
  }

  /**
   * Handle streaming request to Ollama
   */
  private async handleStreamingRequest(
    fullUrl: string,
    requestBody: any,
    controller: AbortController,
    requestId: string | undefined,
    prompt: string,
    model: string,
    onUpdate: (partialResponse: string, done: boolean, fromCache?: boolean) => void
  ): Promise<{ response: string, fromCache: boolean }> {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error! Status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OllamaError('Response body reader could not be created');
    }

    let fullResponseText = '';
    const decoder = new TextDecoder();
    let cancelled = false;

    controller.signal.addEventListener('abort', () => {
      cancelled = true;
      this.handleStreamCancellation(requestId || 'unknown', controller, fullResponseText, onUpdate);
    });

    while (!cancelled) {
      try {
        const { done, value } = await reader.read();
        
        if (cancelled) {
          break;
        }
        
        if (done) {
          onUpdate(fullResponseText, true, false);
          this.cacheResponse(prompt, model, fullResponseText);
          if (requestId) {
            this.activeRequests.delete(requestId);
          }
          return { response: fullResponseText, fromCache: false };
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const jsonResponse = JSON.parse(line) as OllamaResponse;
            if (jsonResponse.response) {
              fullResponseText += jsonResponse.response;
              onUpdate(fullResponseText, jsonResponse.done, false);
            }
          } catch (e) {
            this.log('Error parsing JSON line:', e);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || cancelled) {
          return { response: fullResponseText, fromCache: false };
        }
        throw error;
      }
    }
    
    return { response: fullResponseText, fromCache: false };
  }

  /**
   * Handle non-streaming request to Ollama
   */
  private async handleNonStreamingRequest(
    fullUrl: string,
    requestBody: any,
    controller: AbortController,
    requestId: string | undefined,
    prompt: string,
    model: string
  ): Promise<{ response: string, fromCache: boolean }> {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error! Status: ${response.status}`);
    }

    const responseText = await response.text();
    const lines = responseText.trim().split('\n');
    let fullResponseText = '';
    
    for (const line of lines) {
      try {
        const jsonResponse = JSON.parse(line) as OllamaResponse;
        if (jsonResponse.response) {
          fullResponseText += jsonResponse.response;
        }
      } catch (e) {
        this.log('Error parsing JSON line:', e);
      }
    }

    if (!fullResponseText) {
      throw new OllamaError('No valid response text found in the API response');
    }

    this.cacheResponse(prompt, model, fullResponseText);
    
    if (requestId) {
      this.activeRequests.delete(requestId);
    }
    
    return { response: fullResponseText, fromCache: false };
  }

  /**
   * Generate a response from the Ollama API
   * @param prompt The user's prompt
   * @param model The model to use (defaults to the service's default model)
   * @param notebookContent Optional notebook content for context
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns The generated response text
   */
  async generateResponse(
    prompt: string, 
    model?: string,
    notebookContent?: string,
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    this.log('Generating response for prompt:', prompt);
    this.log('Using model:', selectedModel);
    
    // For chat messages, we don't need notebook context
    const result = await this.sendRequest(prompt, selectedModel, false, onUpdate, requestId);
    return result.response;
  }

  /**
   * Optimize notebook content by trimming if it's too large
   * @param notebookContent Notebook content to optimize
   * @returns Optimized notebook content
   */
  private optimizeNotebookContent(notebookContent: string): string {
    if (!notebookContent || typeof notebookContent !== 'string') {
      this.log('Invalid notebook content received:', notebookContent);
      return '';
    }

    const MAX_NOTEBOOK_CONTEXT_SIZE = 4096; // Maximum size in characters
    
    // Log original size
    this.log(`Original notebook content size: ${notebookContent.length} characters`);
    
    if (notebookContent.length <= MAX_NOTEBOOK_CONTEXT_SIZE) {
      this.log('Notebook content is under size limit, no trimming needed');
      return notebookContent;
    }
    
    // Simple trimming strategy - just truncate to max size
    // For more sophisticated trimming, you could split into cells and prioritize
    let cells = notebookContent.split('```');
    let result = '';
    let currentSize = 0;
    
    // Make sure we include at least one code cell
    for (let i = 0; i < cells.length; i += 2) {
      // Get the markdown part and the following code part (if any)
      const mdPart = cells[i] || '';
      const codePart = cells[i + 1] ? '```' + cells[i + 1] + '```' : '';
      
      // Calculate the total size of this part
      const partSize = mdPart.length + codePart.length;
      
      // If adding this part would exceed the limit, partially add what we can
      if (currentSize + partSize > MAX_NOTEBOOK_CONTEXT_SIZE) {
        const remainingSpace = MAX_NOTEBOOK_CONTEXT_SIZE - currentSize;
        if (remainingSpace > 20) {  // Only add if we have meaningful space
          result += mdPart.substring(0, remainingSpace / 2);
          result += "...";
        }
        break;
      }
      
      // Add this part to the result
      result += mdPart + codePart;
      currentSize += partSize;
    }
    
    this.log(`Optimized notebook content size: ${result.length} characters`);
    return result;
  }

  /**
   * Send a request to the Ollama API with notebook context
   * @param prompt The user's prompt
   * @param model The model to use
   * @param notebookContent Optional notebook content for context
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns The generated response
   */
  private async sendRequestWithNotebookContext(
    prompt: string,
    model: string,
    notebookContent: any,
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    try {
      // Extract content string from various formats
      let contentString = '';
      
      // Handle different input types
      if (typeof notebookContent === 'string') {
        contentString = notebookContent;
      } else if (notebookContent && typeof notebookContent === 'object') {
        // Try to get content from various properties that might contain the notebook content
        if (notebookContent.content) {
          contentString = Array.isArray(notebookContent.content) 
            ? notebookContent.content.join('\n') 
            : notebookContent.content;
        } else if (notebookContent.source) {
          contentString = Array.isArray(notebookContent.source) 
            ? notebookContent.source.join('\n') 
            : notebookContent.source;
        } else if (notebookContent.value) {
          contentString = notebookContent.value;
        } else if (notebookContent.text) {
          contentString = notebookContent.text;
        } else {
          // If no known properties are found, try to stringify the object
          try {
            contentString = JSON.stringify(notebookContent, null, 2);
          } catch (e) {
            contentString = String(notebookContent);
          }
        }
      }
      
      this.log(`Notebook content type: ${typeof notebookContent}, content length: ${contentString.length}`);
      
      // Optimize the notebook content
      const optimizedContent = this.optimizeNotebookContent(contentString);
      this.log(`Optimized content length: ${optimizedContent.length}`);
      
      // Construct a full prompt with context from the notebook
      const fullPrompt = `Context from notebook:\n${optimizedContent}\n\nUser query: ${prompt}`;
      this.log('Sending request with notebook context...', { prompt, model, requestId });
      
      // Send the request
      const result = await this.sendRequest(fullPrompt, model, true, onUpdate, requestId);
      return result.response;
    } catch (error) {
      this.log('Error in sendRequestWithNotebookContext:', error);
      throw error;
    }
  }

  /**
   * Get all active request IDs
   * @returns Array of active request IDs
   */
  getActiveRequests(): string[] {
    return Array.from(this.activeRequests.keys());
  }
} 