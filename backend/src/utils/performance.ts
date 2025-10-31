/**
 * Performance monitoring utility
 * Tracks query execution times and provides insights
 */

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: any;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000; // Keep only last 1000 metrics
  private enabled: boolean;

  constructor() {
    // Only enable in development or when explicitly enabled
    this.enabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_PERF_MONITOR === 'true';
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): () => void {
    if (!this.enabled) {
      return () => {}; // No-op in production
    }

    const startTime = Date.now();
    
    return (metadata?: any) => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, metadata);
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(operation: string, duration: number, metadata?: any): void {
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    });

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`, metadata);
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
  } {
    const filteredMetrics = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    // Use floor for p95 to avoid out-of-bounds access
    const p95Index = Math.floor(durations.length * 0.95);

    return {
      count: filteredMetrics.length,
      avgDuration: sum / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.min(p95Index, durations.length - 1)]
    };
  }

  /**
   * Get all operations being tracked
   */
  getOperations(): string[] {
    const operations = new Set(this.metrics.map(m => m.operation));
    return Array.from(operations);
  }

  /**
   * Get slow operations (> threshold)
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Generate a performance report
   */
  generateReport(): string {
    const operations = this.getOperations();
    let report = '=== Performance Report ===\n\n';

    for (const op of operations) {
      const stats = this.getStats(op);
      report += `${op}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg: ${stats.avgDuration.toFixed(2)}ms\n`;
      report += `  Min: ${stats.minDuration}ms\n`;
      report += `  Max: ${stats.maxDuration}ms\n`;
      report += `  P95: ${stats.p95Duration}ms\n\n`;
    }

    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      report += `\n=== Slow Operations (${slowOps.length}) ===\n`;
      slowOps.slice(0, 10).forEach(op => {
        report += `  ${op.operation}: ${op.duration}ms at ${new Date(op.timestamp).toISOString()}\n`;
      });
    }

    return report;
  }
}

// Create singleton instance
export const perfMonitor = new PerformanceMonitor();

/**
 * Decorator for timing async functions
 */
export function timed(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const endTimer = perfMonitor.startTimer(name);
      try {
        const result = await originalMethod.apply(this, args);
        endTimer({ success: true });
        return result;
      } catch (error) {
        endTimer({ success: false, error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}
