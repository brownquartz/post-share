// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Get the root container and initialize React 18 root
const container = document.getElementById('root');
const root = createRoot(container);

// Use production basename for GitHub Pages, fallback to '/' in development
const basename = process.env.PUBLIC_URL;

root.render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>
);
