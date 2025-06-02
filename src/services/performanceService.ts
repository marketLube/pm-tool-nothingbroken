// Performance monitoring and optimization service
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'memory' | 'network' | 'user' | 'database';
  metadata?: Record<string, any>;
}

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  private observers: Map<string, PerformanceObserver> = new Map();
  
  constructor() {
    this.initializeObservers();
    this.startMemoryMonitoring();
  }
  
  private initializeObservers() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: 'navigation',
            value: entry.duration,
            timestamp: Date.now(),
            type: 'timing',
            metadata: {
              entryType: entry.entryType,
              name: entry.name
            }
          });
        });
      });
      
      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('Navigation timing not supported');
      }
      
      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: 'resource_load',
            value: entry.duration,
            timestamp: Date.now(),
            type: 'network',
            metadata: {
              resource: entry.name,
              size: (entry as any).transferSize || 0
            }
          });
        });
      });
      
      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource timing not supported');
      }
      
      // Monitor user interactions
      const measureObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: entry.duration,
            timestamp: Date.now(),
            type: 'user',
            metadata: {
              entryType: entry.entryType
            }
          });
        });
      });
      
      try {
        measureObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('measure', measureObserver);
      } catch (error) {
        console.warn('Measure timing not supported');
      }
    }
  }
  
  private startMemoryMonitoring() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      setInterval(() => {
        const memory = this.getMemoryStats();
        this.recordMetric({
          name: 'memory_usage',
          value: memory.usagePercentage,
          timestamp: Date.now(),
          type: 'memory',
          metadata: memory
        });
      }, 30000); // Every 30 seconds
    }
  }
  
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Log performance issues
    this.checkPerformanceThresholds(metric);
  }
  
  private checkPerformanceThresholds(metric: PerformanceMetric) {
    const thresholds = {
      'database_query': 1000, // 1 second
      'component_render': 16, // 16ms (60fps)
      'user_search': 500, // 500ms
      'memory_usage': 80, // 80%
      'resource_load': 3000 // 3 seconds
    };
    
    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded: ${metric.name} took ${metric.value}ms (threshold: ${threshold}ms)`);
      
      // Could send to monitoring service here
      this.reportPerformanceIssue(metric, threshold);
    }
  }
  
  private reportPerformanceIssue(metric: PerformanceMetric, threshold: number) {
    // In a real application, this would send data to a monitoring service
    const issue = {
      metric: metric.name,
      actualValue: metric.value,
      threshold,
      timestamp: metric.timestamp,
      severity: metric.value > threshold * 2 ? 'high' : 'medium'
    };
    
    console.table(issue);
  }
  
  // Measure operation performance
  measureOperation<T>(operationName: string, operation: () => T): T;
  measureOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T>;
  measureOperation<T>(operationName: string, operation: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          this.recordMetric({
            name: operationName,
            value: duration,
            timestamp: Date.now(),
            type: 'timing'
          });
        });
      } else {
        const duration = performance.now() - startTime;
        this.recordMetric({
          name: operationName,
          value: duration,
          timestamp: Date.now(),
          type: 'timing'
        });
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name: `${operationName}_error`,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        metadata: { error: (error as Error).message }
      });
      throw error;
    }
  }
  
  // Get memory statistics
  getMemoryStats(): MemoryStats {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercentage: 0
    };
  }
  
  // Get performance summary
  getPerformanceSummary(timeRangeMs: number = 300000) { // Last 5 minutes
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= timeRangeMs);
    
    const summary = {
      totalMetrics: recentMetrics.length,
      averageResponseTime: 0,
      slowestOperations: [] as { name: string; value: number }[],
      memoryUsage: this.getMemoryStats(),
      errorCount: 0,
      performanceScore: 100
    };
    
    if (recentMetrics.length === 0) return summary;
    
    // Calculate averages by type
    const timingMetrics = recentMetrics.filter(m => m.type === 'timing' && !m.name.includes('_error'));
    const errorMetrics = recentMetrics.filter(m => m.name.includes('_error'));
    
    summary.errorCount = errorMetrics.length;
    
    if (timingMetrics.length > 0) {
      summary.averageResponseTime = timingMetrics.reduce((sum, m) => sum + m.value, 0) / timingMetrics.length;
    }
    
    // Find slowest operations
    summary.slowestOperations = timingMetrics
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(m => ({ name: m.name, value: m.value }));
    
    // Calculate performance score (0-100)
    let score = 100;
    
    // Deduct points for slow operations
    if (summary.averageResponseTime > 1000) score -= 30;
    else if (summary.averageResponseTime > 500) score -= 15;
    
    // Deduct points for high memory usage
    if (summary.memoryUsage.usagePercentage > 80) score -= 25;
    else if (summary.memoryUsage.usagePercentage > 60) score -= 10;
    
    // Deduct points for errors
    score -= Math.min(errorMetrics.length * 5, 40);
    
    summary.performanceScore = Math.max(0, score);
    
    return summary;
  }
  
  // Clear old metrics
  clearMetrics() {
    this.metrics = [];
  }
  
  // Export metrics for analysis
  exportMetrics() {
    return {
      metrics: [...this.metrics],
      summary: this.getPerformanceSummary(),
      timestamp: Date.now()
    };
  }
  
  // Cleanup observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
  }
}

// React Hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const measureRender = (componentName: string) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        return performanceService.measureOperation(
          `${componentName}_${propertyKey}`,
          () => originalMethod.apply(this, args)
        );
      };
      
      return descriptor;
    };
  };
  
  const measureAsync = async <T,>(operationName: string, operation: () => Promise<T>): Promise<T> => {
    return performanceService.measureOperation(operationName, operation);
  };
  
  const getMetrics = () => performanceService.getPerformanceSummary();
  
  return {
    measureRender,
    measureAsync,
    getMetrics,
    recordMetric: (metric: PerformanceMetric) => performanceService.recordMetric(metric)
  };
};

// Singleton instance
export const performanceService = new PerformanceService();

// Helper functions for common measurements
export const measureDatabaseQuery = <T,>(queryName: string, query: () => Promise<T>): Promise<T> => {
  return performanceService.measureOperation(`database_query_${queryName}`, query);
};

export const measureComponentRender = <T,>(componentName: string, renderFn: () => T): T => {
  return performanceService.measureOperation(`component_render_${componentName}`, renderFn);
};

export const measureUserSearch = <T,>(searchFn: () => Promise<T>): Promise<T> => {
  return performanceService.measureOperation('user_search', searchFn);
};

// Performance optimization utilities
export const optimizationUtils = {
  // Debounce function with performance tracking
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    operationName: string
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        performanceService.measureOperation(operationName, () => func(...args));
      }, wait);
    };
  },
  
  // Throttle function with performance tracking
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number,
    operationName: string
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        performanceService.measureOperation(operationName, () => func(...args));
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },
  
  // Memoization with performance tracking
  memoize: <T extends (...args: any[]) => any>(
    func: T,
    operationName: string
  ): T => {
    const cache = new Map();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        performanceService.recordMetric({
          name: `${operationName}_cache_hit`,
          value: 0,
          timestamp: Date.now(),
          type: 'timing'
        });
        return cache.get(key);
      }
      
      const result = performanceService.measureOperation(operationName, () => func(...args));
      cache.set(key, result);
      return result;
    }) as T;
  }
}; 