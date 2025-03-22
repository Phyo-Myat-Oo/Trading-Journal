import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to prevent double-rendering
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
