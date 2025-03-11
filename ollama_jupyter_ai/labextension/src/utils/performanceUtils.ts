// Debounce function to prevent excessive API calls
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

// Batch processor for multiple requests
export class BatchProcessor<T> {
  private batch: T[] = [];
  private processingPromise: Promise<void> | null = null;
  private readonly maxBatchSize: number;
  private readonly processingDelay: number;
  private readonly processor: (items: T[]) => Promise<void>;
  
  constructor(
    processor: (items: T[]) => Promise<void>,
    maxBatchSize: number = 5,
    processingDelay: number = 100
  ) {
    this.processor = processor;
    this.maxBatchSize = maxBatchSize;
    this.processingDelay = processingDelay;
  }
  
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
  
  private async process(): Promise<void> {
    const items = [...this.batch];
    this.batch = [];
    this.processingPromise = null;
    
    if (items.length > 0) {
      await this.processor(items);
    }
  }
}

// Web Worker wrapper for heavy computations
export class ComputationWorker {
  private worker: Worker | null = null;
  private callbacks: Map<string, (result: any) => void> = new Map();
  
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
  
  public terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.callbacks.clear();
  }
}

// Progressive loader for long conversations
export class ProgressiveLoader {
  private items: any[] = [];
  private loadedCount: number = 0;
  private readonly batchSize: number;
  private readonly onBatchLoaded: (items: any[]) => void;
  
  constructor(
    items: any[],
    batchSize: number,
    onBatchLoaded: (items: any[]) => void
  ) {
    this.items = items;
    this.batchSize = batchSize;
    this.onBatchLoaded = onBatchLoaded;
  }
  
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
  
  public reset(): void {
    this.loadedCount = 0;
  }
  
  public get progress(): number {
    return this.loadedCount / this.items.length;
  }
} 