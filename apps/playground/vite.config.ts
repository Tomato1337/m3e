import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The kit's browser floor (see AGENTS.md): no lowering of light-dark(), nesting or @starting-style.
const targets = ['chrome123', 'safari17.5']

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { target: ['es2023', ...targets], cssTarget: targets },
})
