import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Tipografías de foundries argentinas (ver styles/tokens.css)
import '@fontsource-variable/encode-sans/standard.css';
import '@fontsource-variable/alegreya';
import '@fontsource-variable/alegreya/wght-italic.css';
import './styles/global.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
