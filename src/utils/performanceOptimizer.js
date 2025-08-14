/**
 * Performance Optimization Utilities
 * Helps manage memory, reduce re-renders, and improve overall application performance
 */

// Debounce function to limit function calls
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function to limit function calls
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization cache for expensive calculations
class MemoCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

// Global memoization cache
const memoCache = new MemoCache();

// Memoized function wrapper
export const memoize = (fn, keyFn = (...args) => JSON.stringify(args)) => {
  return (...args) => {
    const key = keyFn(...args);
    const cached = memoCache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = fn(...args);
    memoCache.set(key, result);
    return result;
  };
};

// Object pool for frequently created objects
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    
    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  get() {
    return this.pool.pop() || this.createFn();
  }

  release(obj) {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

// Performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  start(label) {
    this.startTimes.set(label, performance.now());
  }

  end(label) {
    const startTime = this.startTimes.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.set(label, duration);
      this.startTimes.delete(label);
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  clear() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Global performance monitor
export const performanceMonitor = new PerformanceMonitor();

// Memory management utilities
export const memoryOptimizer = {
  // Force garbage collection if available
  forceGC() {
    if (window.gc) {
      window.gc();
    }
  },

  // Monitor memory usage
  getMemoryInfo() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Check if memory usage is high
  isMemoryHigh(threshold = 0.8) {
    const memoryInfo = this.getMemoryInfo();
    if (memoryInfo) {
      return memoryInfo.used / memoryInfo.limit > threshold;
    }
    return false;
  }
};

// React-specific optimizations
export const reactOptimizer = {
  // Prevent unnecessary re-renders by comparing props
  shouldComponentUpdate(oldProps, newProps, keysToCompare = []) {
    if (keysToCompare.length === 0) {
      keysToCompare = Object.keys(oldProps);
    }
    
    return keysToCompare.some(key => {
      const oldValue = oldProps[key];
      const newValue = newProps[key];
      
      if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        return oldValue.length !== newValue.length || 
               oldValue.some((item, index) => item !== newValue[index]);
      }
      
      return oldValue !== newValue;
    });
  },

  // Create stable references for objects
  createStableRef(obj) {
    const ref = { current: obj };
    Object.freeze(ref);
    return ref;
  }
};

// Animation frame optimization
export const animationOptimizer = {
  frameId: null,
  
  // Optimized requestAnimationFrame with throttling
  requestFrame(callback, fps = 60) {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    
    const interval = 1000 / fps;
    let lastTime = 0;
    
    const animate = (currentTime) => {
      if (currentTime - lastTime >= interval) {
        callback(currentTime);
        lastTime = currentTime;
      }
      this.frameId = requestAnimationFrame(animate);
    };
    
    this.frameId = requestAnimationFrame(animate);
  },
  
  // Cancel animation frame
  cancelFrame() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
};

// Event listener optimization
export const eventOptimizer = {
  // Passive event listeners for better scroll performance
  addPassiveListener(element, event, handler) {
    element.addEventListener(event, handler, { passive: true });
    return () => element.removeEventListener(event, handler);
  },

  // Throttled event listener
  addThrottledListener(element, event, handler, delay = 16) {
    const throttledHandler = throttle(handler, delay);
    element.addEventListener(event, throttledHandler);
    return () => element.removeEventListener(event, throttledHandler);
  }
};

// Export utilities
export default {
  debounce,
  throttle,
  memoize,
  ObjectPool,
  performanceMonitor,
  memoryOptimizer,
  reactOptimizer,
  animationOptimizer,
  eventOptimizer
}; 