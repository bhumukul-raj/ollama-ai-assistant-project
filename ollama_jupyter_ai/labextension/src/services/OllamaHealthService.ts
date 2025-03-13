/**
 * @file OllamaHealthService.ts
 * @description This service monitors the health of the Ollama API service, providing status checks
 * and monitoring capabilities. It implements features like health status reporting, connection testing,
 * automatic retries with exponential backoff, and periodic monitoring to ensure the Ollama service
 * is available and functioning correctly.
 * 
 * The service reports three health states:
 * - healthy: The Ollama service is responding normally
 * - degraded: The service has experienced multiple failures but might still be usable
 * - unhealthy: The service is not responding or returning errors
 * 
 * This service is critical for providing feedback to users about the connection status of
 * their local Ollama instance, making troubleshooting and status monitoring possible.
 */
import axios from 'axios';
import { OllamaError, OllamaConnectionError, OllamaTimeoutError } from './OllamaService';

/**
 * Interface for health check results returned by the OllamaHealthService
 * 
 * @interface HealthCheckResult
 * @property {('healthy' | 'unhealthy' | 'degraded')} status - Current health status of the Ollama service
 * @property {string} message - Human-readable status message explaining the current health state
 * @property {Date} lastChecked - Timestamp when the health was last checked
 * @property {number} [responseTime] - Response time in milliseconds for the health check (if successful)
 * @property {object} [details] - Additional details about the health check
 * @property {string[]} [details.availableModels] - List of available models (if healthy)
 * @property {string} [details.error] - Error message (if unhealthy)
 * @property {number} [details.retryCount] - Number of retries attempted 
 * @property {string} [details.lastError] - Stack trace of the last error
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  lastChecked: Date;
  responseTime?: number;
  details?: {
    availableModels?: string[];
    error?: string;
    retryCount?: number;
    lastError?: string;
  };
}

/**
 * Service for monitoring the health of the Ollama API
 * 
 * This service provides capabilities for:
 * - Checking if the Ollama API is accessible and responding
 * - Periodic monitoring with callback notifications on status changes
 * - Connection testing with detailed error reporting
 * - Automated retries with exponential backoff and jitter
 * - Tracking connection health over time
 * 
 * The health service helps detect when the Ollama service is unavailable or
 * experiencing issues, allowing the UI to provide appropriate feedback to users.
 */
export class OllamaHealthService {
  private baseUrl: string;
  private healthCheckInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private onStatusChange?: (status: HealthCheckResult) => void;
  private intervalId?: any;
  private lastStatus: HealthCheckResult;
  private consecutiveFailures: number = 0;
  private readonly maxConsecutiveFailures: number = 5;

  /**
   * Creates a new OllamaHealthService instance
   * 
   * @param {string} baseUrl - Base URL for the Ollama API (default: http://localhost:11434)
   * @param {number} healthCheckInterval - Interval between health checks in milliseconds (default: 30000)
   * @param {number} maxRetries - Maximum number of retry attempts for failed requests (default: 3)
   * @param {number} retryDelay - Base delay between retries in milliseconds (default: 1000)
   */
  constructor(
    baseUrl: string = 'http://localhost:11434',
    healthCheckInterval: number = 30000, // 30 seconds
    maxRetries: number = 3,
    retryDelay: number = 1000 // 1 second
  ) {
    this.baseUrl = baseUrl;
    this.healthCheckInterval = healthCheckInterval;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.lastStatus = {
      status: 'unhealthy',
      message: 'Initial state',
      lastChecked: new Date()
    };
  }

  /**
   * Implements exponential backoff strategy for retrying requests
   * 
   * This utility method retries failed API requests using an exponential backoff
   * strategy with jitter to prevent synchronized retries. It increases the delay
   * between retries exponentially, up to a maximum delay.
   * 
   * @param {Function} fn - The async function to retry
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} baseDelay - Base delay in milliseconds between retries
   * @param {number} maxDelay - Maximum delay in milliseconds
   * @returns {Promise<T>} The result from the function or throws an error after max retries
   * @template T - The return type of the function being retried
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    baseDelay: number = this.retryDelay,
    maxDelay: number = 30000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          // Calculate delay with exponential backoff and jitter
          const exponentialDelay = Math.min(
            maxDelay,
            baseDelay * Math.pow(2, attempt)
          );

          // Add jitter (±20%) to prevent synchronized retries
          const jitter = 0.8 + Math.random() * 0.4; // 0.8-1.2 (±20%)
          const delay = Math.floor(exponentialDelay * jitter);

          console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If we've reached this point, all retries failed
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Checks the current health status of the Ollama API
   * 
   * Performs a health check by querying the Ollama API for available models.
   * If successful, it returns a health status with available models.
   * If unsuccessful, it returns an error status with details about the failure.
   * 
   * The health status can be:
   * - healthy: API is responsive and returning valid data
   * - degraded: API has experienced multiple consecutive failures
   * - unhealthy: API is not responding or returning errors
   * 
   * @returns {Promise<HealthCheckResult>} A promise that resolves to the health check result
   */
  public async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const currentTime = new Date();

    try {
      // Use exponential backoff for the API call
      const models = await this.retryWithExponentialBackoff(
        async () => {
          const response = await axios.get(`${this.baseUrl}/api/tags`, {
            timeout: 5000
          });
          return response.data.models || [];
        }
      );

      const responseTime = Date.now() - startTime;

      // Reset consecutive failures on success
      this.consecutiveFailures = 0;

      const status: HealthCheckResult = {
        status: 'healthy',
        message: 'Ollama API is responding',
        lastChecked: currentTime,
        responseTime,
        details: {
          availableModels: models.map((model: any) => model.name)
        }
      };

      // Notify if status changed
      if (this.lastStatus.status !== status.status) {
        this.onStatusChange?.(status);
      }

      this.lastStatus = status;
      return status;
    } catch (error) {
      // Increment consecutive failures
      this.consecutiveFailures++;

      let errorMessage = 'Could not connect to Ollama';
      if (error instanceof Error) {
        errorMessage = this.getDetailedErrorMessage(error);
      }

      // Determine if service is degraded or unhealthy
      const statusType = this.consecutiveFailures >= this.maxConsecutiveFailures
        ? 'degraded' : 'unhealthy';

      const status: HealthCheckResult = {
        status: statusType as 'degraded' | 'unhealthy',
        message: errorMessage,
        lastChecked: currentTime,
        details: {
          error: error instanceof Error ? error.message : String(error),
          retryCount: this.consecutiveFailures,
          lastError: error instanceof Error ? error.stack : undefined
        }
      };

      // Notify if status changed
      if (this.lastStatus.status !== status.status) {
        this.onStatusChange?.(status);
      }

      this.lastStatus = status;
      return status;
    }
  }

  /**
   * Generates a detailed error message based on the error type
   * 
   * Maps different types of errors (connection refused, timeout, server error, etc.)
   * to human-readable error messages that can be displayed to users.
   * 
   * @param {Error | null} error - The error object to analyze
   * @returns {string} A detailed, human-readable error message
   */
  private getDetailedErrorMessage(error: Error | null): string {
    if (!error) {
      return 'Unknown error occurred while checking Ollama service health';
    }

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return `Could not connect to Ollama service at ${this.baseUrl}. Is it running?`;
      }
      if (error.code === 'ETIMEDOUT') {
        return `Connection to Ollama service timed out. Please check your network connection.`;
      }
      if (error.response) {
        return `Ollama service returned an error: ${error.response.status} - ${error.response.statusText}`;
      }
      if (error.request) {
        return 'No response received from Ollama service';
      }
    }

    return `Ollama service error: ${error.message}`;
  }

  /**
   * Starts periodic monitoring of the Ollama API health
   * 
   * Sets up an interval to periodically check the health of the Ollama API.
   * If the health status changes, the provided callback function is called.
   * 
   * @param {Function} [onStatusChange] - Optional callback function called when health status changes
   */
  public startMonitoring(onStatusChange?: (status: HealthCheckResult) => void): void {
    this.onStatusChange = onStatusChange;

    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Perform initial health check
    this.checkHealth().catch(error => {
      console.error('Error during initial health check:', error);
    });

    // Set up periodic health checks
    this.intervalId = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Error during periodic health check:', error);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Stops the periodic health monitoring
   * 
   * Clears the interval for periodic health checks and removes the status change callback.
   */
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.onStatusChange = undefined;
  }

  /**
   * Gets the most recent health status
   * 
   * @returns {HealthCheckResult} The last recorded health status
   */
  public getLastStatus(): HealthCheckResult {
    return this.lastStatus;
  }

  /**
   * Tests the connection to the Ollama API
   * 
   * Performs a connection test by making a request to the Ollama API.
   * Unlike the health check, this doesn't update internal state or trigger callbacks.
   * It's designed for one-time connection validation.
   * 
   * @returns {Promise<Object>} A promise that resolves to an object with connection status
   * @property {boolean} isConnected - Whether the connection was successful
   * @property {string} [error] - Error message if connection failed
   * @property {object} [details] - Additional details about the connection
   */
  public async testConnection(): Promise<{
    isConnected: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });

      const responseTime = Date.now() - startTime;

      return {
        isConnected: true,
        details: {
          models: response.data.models,
          responseTime,
          serverUrl: this.baseUrl
        }
      };
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      let details = {};

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Could not connect to Ollama service. Is it running?';
          details = { code: 'ECONNREFUSED', url: this.baseUrl };
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = 'Connection to Ollama service timed out';
          details = { code: 'ETIMEDOUT', url: this.baseUrl };
        } else if (error.response) {
          errorMessage = `Server responded with error: ${error.response.status}`;
        }
      }

      return {
        isConnected: false,
        error: errorMessage,
        details
      };
    }
  }

  public getConnectionInstructions(): string {
    return `
To connect to Ollama:

1. Make sure Ollama is installed
   - Visit https://ollama.ai for installation instructions
   - Follow the platform-specific setup guide

2. Start the Ollama service
   - Open a terminal
   - Run: ollama serve

3. Pull a model (if not already done)
   - In terminal: ollama pull mistral
   - Wait for the download to complete

4. Verify the connection
   - The service should be running on ${this.baseUrl}
   - Try restarting the Ollama service if issues persist
   - Check your firewall settings if connection is blocked

5. Common troubleshooting steps:
   - Ensure no other service is using port 11434
   - Check system resources (CPU, memory, disk space)
   - Verify network connectivity
   - Check Ollama service logs for errors

Need help? Visit: https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues
    `.trim();
  }

  /**
   * Waits for the service to be healthy or until timeout
   * @param timeout Timeout in milliseconds
   * @returns A promise that resolves when the service is healthy or rejects on timeout
   */
  public async waitForHealthy(timeout: number = 10000): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Check health initially
    let status = await this.checkHealth();

    // If already healthy, return immediately
    if (status.status === 'healthy') {
      return status;
    }

    // Wait for healthy status or timeout
    return new Promise<HealthCheckResult>((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for Ollama service to be healthy. Current status: ${status.status}`));
          return;
        }

        // Check health
        status = await this.checkHealth();

        // If healthy, resolve
        if (status.status === 'healthy') {
          clearInterval(checkInterval);
          resolve(status);
        }
      }, 1000); // Check every second
    });
  }
} 