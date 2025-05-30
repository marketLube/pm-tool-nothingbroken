// Performance monitoring utility for debugging slow operations
class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static isEnabled = process.env.NODE_ENV === 'development';

  static start(label: string): void {
    if (!this.isEnabled) return;
    this.timers.set(label, performance.now());
    console.time(label);
  }

  static end(label: string): number {
    if (!this.isEnabled) return 0;
    
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Performance timer "${label}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    console.timeEnd(label);
    
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: "${label}" took ${duration.toFixed(2)}ms`);
    } else if (duration > 500) {
      console.info(`⏱️ Moderate operation: "${label}" took ${duration.toFixed(2)}ms`);
    }

    this.timers.delete(label);
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => this.end(label)) as T;
      }
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

export default PerformanceMonitor; 