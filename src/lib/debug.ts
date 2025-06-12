// src/lib/debug.ts
const DEBUG = process.env.NODE_ENV === 'development';

export const debugLog = {
  api: (message: string, data?: unknown) => {
    if (DEBUG) {
      console.log(`[API] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  
  component: (componentName: string, message: string, data?: unknown) => {
    if (DEBUG) {
      console.log(`[${componentName}] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
  
  subscription: (channel: string, event: string, data?: unknown) => {
    if (DEBUG) {
      console.log(`[SUB: ${channel}] ${event}`, data || '');
    }
  },
  
  performance: (label: string, start: number) => {
    if (DEBUG) {
      const duration = Date.now() - start;
      console.log(`[PERF] ${label}: ${duration}ms`);
    }
  }
};