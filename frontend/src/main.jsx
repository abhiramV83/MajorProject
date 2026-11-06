import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';

import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SidebarProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                className: 'text-xs font-bold rounded-2xl p-3.5 shadow-dock backdrop-blur-md',
                style: {
                  background: 'var(--bg-overlay)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-ui)',
                  borderRadius: '1rem',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--risk-low-fill)',
                    secondary: 'var(--bg-surface)',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'var(--risk-high-fill)',
                    secondary: 'var(--bg-surface)',
                  },
                },
              }}
            />
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
