import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './index.css';
// App.tsx is no longer the entry point, but we need the styles if they were in App.css.
// However, App.tsx imported App.css. Let's import App.css here to be safe if it has global styles.
import './App.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
