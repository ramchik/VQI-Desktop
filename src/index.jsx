import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const loadingEl = document.getElementById('loading');
if (loadingEl) loadingEl.style.display = 'none';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
