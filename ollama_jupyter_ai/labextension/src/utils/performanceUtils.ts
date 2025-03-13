/**
 * @file performanceUtils.ts
 * @description This file provides performance optimization utilities to improve the
 * responsiveness and efficiency of the application. It includes functions for debouncing,
 * batch processing, web worker management, and progressive loading, which help manage
 * resource usage and provide better user experience.
 */

/**
 * Creates a debounced function that delays invoking the provided function until after
 * a specified wait time has elapsed since the last invocation.
 * 
 * Useful for limiting the rate at which a function can fire, such as when handling
 * user input events like typing or scrolling.
 * 
 * @template T - The type of the function to debounce
 * @param {T} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Parameters<T>) => void} A debounced version of the original function
 * 
 * @example
 * const debouncedSearch = debounce((query) => fetchSearchResults(query), 300);
 * // Call debouncedSearch multiple times rapidly, but fetchSearchResults
 * // will only be called once, 300ms after the last call
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: any;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * A utility class for processing items in batches to improve performance
 * when dealing with large datasets or expensive operations.
 * 
 * Instead of processing items one by one as they arrive, BatchProcessor
 * collects them and processes them in efficient batches, either when the
 * batch size reaches a threshold or after a specified delay.
 * 
 * @template T - The type of items to process
 */
export class BatchProcessor<T> {
  /** Array to store items waiting to be processed */
  private batch: T[] = [];
  /** Promise tracking the current processing operation */
  private processingPromise: Promise<void> | null = null;
  /** Maximum number of items to process in a single batch */
  private readonly maxBatchSize: number;
  /** Delay in milliseconds before processing a non-full batch */
  private readonly processingDelay: number;
  /** Function that processes a batch of items */
  private readonly processor: (items: T[]) => Promise<void>;

  /**
   * Creates a new BatchProcessor instance.
   * 
   * @param {(items: T[]) => Promise<void>} processor - Function that processes a batch of items
   * @param {number} [maxBatchSize=5] - Maximum number of items to process in a single batch
   * @param {number} [processingDelay=100] - Delay in milliseconds before processing a non-full batch
   */
  constructor(
    processor: (items: T[]) => Promise<void>,
    maxBatchSize: number = 5,
    processingDelay: number = 100
  ) {
    this.processor = processor;
    this.maxBatchSize = maxBatchSize;
    this.processingDelay = processingDelay;
  }

  /**
   * Adds an item to the current batch for processing.
   * 
   * If the batch reaches the maximum size, it will be processed immediately.
   * Otherwise, it will be processed after the specified delay.
   * 
   * @param {T} item - The item to add to the batch
   * @returns {Promise<void>} A promise that resolves when the batch is processed
   */
  public async add(item: T): Promise<void> {
    this.batch.push(item);

    if (this.batch.length >= this.maxBatchSize) {
      await this.process();
    } else if (!this.processingPromise) {
      this.processingPromise = new Promise(resolve => {
        setTimeout(async () => {
          await this.process();
          resolve();
        }, this.processingDelay);
      });
    }
  }

  /**
   * Processes the current batch of items.
   * 
   * This method takes all items currently in the batch, clears the batch,
   * and passes the items to the processor function.
   * 
   * @private
   * @returns {Promise<void>} A promise that resolves when processing is complete
   */
  private async process(): Promise<void> {
    const items = [...this.batch];
    this.batch = [];
    this.processingPromise = null;

    if (items.length > 0) {
      await this.processor(items);
    }
  }
}

/**
 * A utility class for offloading heavy computations to a Web Worker.
 * 
 * This helps prevent UI freezing by moving CPU-intensive tasks to a
 * separate thread. Communication with the worker is handled via a
 * simple asynchronous interface.
 */
export class ComputationWorker {
  /** Reference to the Web Worker instance */
  private worker: Worker | null = null;
  /** Map of task IDs to callback functions */
  private callbacks: Map<string, (result: any) => void> = new Map();

  /**
   * Creates a new ComputationWorker instance.
   * 
   * @param {string} workerScript - URL or path to the worker script
   */
  constructor(workerScript: string) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(workerScript);
      this.worker.onmessage = (e) => {
        const { id, result } = e.data;
        const callback = this.callbacks.get(id);
        if (callback) {
          callback(result);
          this.callbacks.delete(id);
        }
      };
    }
  }

  /**
   * Sends a computation task to the worker and returns a promise
   * that resolves with the result.
   * 
   * @template T - The type of the result
   * @param {any} task - The task data to send to the worker
   * @returns {Promise<T>} A promise that resolves with the computation result
   * @throws {Error} If Web Workers are not supported or worker is null
   */
  public async compute<T>(task: any): Promise<T> {
    if (!this.worker) {
      throw new Error('Web Workers are not supported in this environment');
    }

    return new Promise((resolve) => {
      const id = Math.random().toString(36).substring(7);
      this.callbacks.set(id, resolve);
      if (this.worker) {
        this.worker.postMessage({ id, task });
      } else {
        throw new Error('Worker was unexpectedly null');
      }
    });
  }

  /**
   * Terminates the worker and clears all pending callbacks.
   * 
   * Call this method when the worker is no longer needed to free resources.
   */
  public terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.callbacks.clear();
  }
}

/**
 * A utility class for incrementally loading and rendering large datasets.
 * 
 * Instead of loading and rendering all items at once (which could cause
 * performance issues), this class allows loading items in smaller batches,
 * improving initial load time and interface responsiveness.
 * 
 * @template T - The type of items being loaded
 */
export class ProgressiveLoader {
  /** Array of all items to be loaded */
  private items: any[] = [];
  /** Number of items loaded so far */
  private loadedCount: number = 0;
  /** Number of items to load in each batch */
  private readonly batchSize: number;
  /** Callback function to handle each loaded batch */
  private readonly onBatchLoaded: (items: any[]) => void;

  /**
   * Creates a new ProgressiveLoader instance.
   * 
   * @param {any[]} items - Array of all items to be loaded
   * @param {number} batchSize - Number of items to load in each batch
   * @param {(items: any[]) => void} onBatchLoaded - Callback function to handle each loaded batch
   */
  constructor(
    items: any[],
    batchSize: number,
    onBatchLoaded: (items: any[]) => void
  ) {
    this.items = items;
    this.batchSize = batchSize;
    this.onBatchLoaded = onBatchLoaded;
  }

  /**
   * Loads the next batch of items.
   * 
   * @returns {boolean} True if there are more items to load, false if all items have been loaded
   */
  public loadNext(): boolean {
    if (this.loadedCount >= this.items.length) {
      return false;
    }

    const batch = this.items.slice(
      this.loadedCount,
      this.loadedCount + this.batchSize
    );
    this.loadedCount += batch.length;
    this.onBatchLoaded(batch);

    return this.loadedCount < this.items.length;
  }

  /**
   * Resets the loader to the beginning, so items can be loaded again.
   */
  public reset(): void {
    this.loadedCount = 0;
  }

  /**
   * Gets the current progress as a ratio between 0 and 1.
   * 
   * @returns {number} A value between 0 and 1 representing loading progress
   */
  public get progress(): number {
    return this.loadedCount / this.items.length;
  }
} 