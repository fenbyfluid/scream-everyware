import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App';
import { Classes, FocusStyleManager } from '@blueprintjs/core';

const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

if (prefersDarkScheme.matches) {
  document.body.classList.add(Classes.DARK);
}

prefersDarkScheme.addEventListener('change', ev => {
  document.body.classList.toggle(Classes.DARK, ev.matches);
});

FocusStyleManager.onlyShowFocusOnTabs();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

