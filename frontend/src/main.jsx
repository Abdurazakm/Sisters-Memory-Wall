import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --- SERVICE WORKER REGISTRATION ---
// This enables background notifications and mobile app features
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW Registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('SW Registration failed:', error);
      });
  });
}