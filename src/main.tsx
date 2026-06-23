import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Patch for "Cannot set property fetch of #<Window> which has only a getter"
// Some libraries or environments might try to override fetch.
try {
  const patchFetch = (target: any) => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(target, 'fetch');
      if (descriptor && descriptor.get && !descriptor.set) {
        if (descriptor.configurable) {
          Object.defineProperty(target, 'fetch', {
            get: descriptor.get,
            set: (v) => { 
              console.warn("Fetch override attempted on target. Shadowing with new value.", v);
              try {
                Object.defineProperty(target, 'fetch', {
                  value: v,
                  writable: true,
                  configurable: true,
                  enumerable: true
                });
              } catch (innerError) {
                console.error("Failed to re-define fetch with value", innerError);
                // Fallback: just attach to target as a different property or ignore
              }
            },
            configurable: true,
            enumerable: true
          });
          return true;
        } else if (target === window) {
          // If window.fetch is not configurable, we check if we can define it on the instance
          // but if it's already there and not configurable, we can't do much.
          // We try one last time with a try-catch
          try {
            Object.defineProperty(window, 'fetch', {
              value: window.fetch,
              writable: true,
              configurable: true,
              enumerable: true
            });
            return true;
          } catch (e) {
            console.warn("window.fetch is strictly non-configurable. Patch ignored.");
          }
        }
      }
    } catch (e) {
      console.warn("Patch logic failed for target", target, e);
    }
    return false;
  };

  const windowPatched = patchFetch(window);
  if (!windowPatched) {
    if ((window as any).Window && (window as any).Window.prototype) {
      patchFetch((window as any).Window.prototype);
    }
  }
} catch (e) {
  console.warn("Could not patch fetch getter", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register PWA Service Worker for App downloadability compatibility
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('PWA Service Worker registered successfully:', reg.scope);
    }).catch((err) => {
      console.warn('PWA Service Worker registration failed:', err);
    });
  });
}

// Self-healing handler for browser-level IndexedDB corruption or clearing site data failures
if (typeof window !== 'undefined') {
  const healIndexedDb = (errorMessage: string): boolean => {
    const isCorruptionError = 
      errorMessage.includes('refusing to open IndexedDB') || 
      errorMessage.includes('potential corruption of the IndexedDB') ||
      errorMessage.includes('lastClosedDbVersion') ||
      errorMessage.includes('IndexedDB database data');
      
    if (isCorruptionError) {
      console.warn("[Self-Healing] Detected corrupt browser IndexedDB partition. Purging caches and rebuilding database structure...");
      try {
        localStorage.clear();
        sessionStorage.clear();
        if (window.indexedDB) {
          const fsDbName = "firestore/[DEFAULT]/confident-monument-s6tp2/ai-studio-6beb5136-c069-4cf3-85bb-75cf12bb6163";
          window.indexedDB.deleteDatabase(fsDbName);
          window.indexedDB.deleteDatabase("firebase-auth-storage");
        }
      } catch (e) {
        console.error("IndexedDB healing failure", e);
      }
      setTimeout(() => {
        window.location.reload();
      }, 300);
      return true;
    }
    return false;
  };

  window.addEventListener('error', (event: ErrorEvent) => {
    const msg = event.message || (event.error && event.error.message) || '';
    if (msg.includes('Script error.') || msg === 'Script error' || msg === '') {
      try {
        event.preventDefault();
        event.stopImmediatePropagation();
      } catch (e) {}
      return;
    }
    if (healIndexedDb(msg)) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (e) {}
    }
  }, true);

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const error = event.reason;
    const msg = error ? (error.message || String(error)) : '';
    if (msg.includes('Script error.') || msg === 'Script error') {
      try {
        event.preventDefault();
        event.stopImmediatePropagation();
      } catch (e) {}
      return;
    }
    if (healIndexedDb(msg)) {
      try {
        event.preventDefault();
        event.stopPropagation();
      } catch (e) {}
    }
  }, true);

  // Safely intercept and filter cross-origin script error telemetry
  try {
    const rawConsoleError = console.error;
    console.error = function(...args: any[]) {
      const logStr = args.map(a => String(a)).join(' ');
      if (logStr.includes('Script error.') || logStr.includes('Script error')) {
        return;
      }
      rawConsoleError.apply(console, args);
    };
  } catch (e) {}
}
