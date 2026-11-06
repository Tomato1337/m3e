import '@fontsource-variable/roboto-flex/wdth.css'
import '@tomato1337/m3e-react/styles.css'
import './playground.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
