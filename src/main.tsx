import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useThemeStore } from './store/themeStore'

// Apply saved / system theme before first paint of the app shell
useThemeStore.getState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
