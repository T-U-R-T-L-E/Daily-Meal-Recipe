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
