import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import AccessGate from './components/AccessGate';
import App from './App';
import './index.css';
import '@shared/styles/landscape.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AccessGate>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AccessGate>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);