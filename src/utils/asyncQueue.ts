// Async Operation Queue for handling race conditions and ensuring data integrity
export class AsyncOperationQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second
  
  constructor(maxRetries = 3, retryDelay = 1000) {
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }
  
  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let lastError: Error | undefined;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
          try {
            const result = await operation();
            resolve(result);
            return;
          } catch (error) {
            lastError = error as Error;
            console.warn(`Operation attempt ${attempt} failed:`, error);
            
            if (attempt < this.maxRetries) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
          }
        }
        
        reject(lastError || new Error('Operation failed after all retries'));
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        console.error('Queue operation failed:', error);
      }
    }
    
    this.isProcessing = false;
  }
  
  getQueueSize(): number {
    return this.queue.length;
  }
  
  isQueueProcessing(): boolean {
    return this.isProcessing;
  }
  
  clear(): void {
    this.queue = [];
  }
}

// Global instances for different operation types
export const userOperationQueue = new AsyncOperationQueue(3, 1000);
export const passwordOperationQueue = new AsyncOperationQueue(2, 500);
export const dataUpdateQueue = new AsyncOperationQueue(3, 2000);

// Helper function for debounced operations
export const createDebouncedOperation = <T extends any[]>(
  fn: (...args: T) => Promise<any>,
  delay: number
): ((...args: T) => Promise<any>) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: { resolve: (value: any) => void; reject: (error: any) => void } | null = null;
  
  return (...args: T): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // If there's a pending promise, reject it
      if (pendingPromise) {
        pendingPromise.reject(new Error('Operation cancelled by newer call'));
      }
      
      pendingPromise = { resolve, reject };
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (pendingPromise) {
            pendingPromise.resolve(result);
            pendingPromise = null;
          }
        } catch (error) {
          if (pendingPromise) {
            pendingPromise.reject(error);
            pendingPromise = null;
          }
        }
      }, delay);
    });
  };
}; 