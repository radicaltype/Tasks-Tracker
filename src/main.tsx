import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerSW} from 'virtual:pwa-register';
import ErrorBoundary from './components/ErrorBoundary.tsx';

// In development, unregister any lingering service workers to avoid stale bundle caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('New content available, refreshing...');
      },
      onOfflineReady() {
        console.log('Tasks Tracker is ready for offline use');
      },
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

