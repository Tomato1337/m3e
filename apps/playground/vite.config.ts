import react from '@vitejs/plugin-react'
import { defineConfig, defaultClientConditions } from 'vite'

// The kit's browser floor (see AGENTS.md): no lowering of light-dark(), nesting or @starting-style.
const targets = ['chrome123', 'safari17.5']

export default defineConfig({
  plugins: [react()],
  // Kit packages from their sources, not dist/ (see tsconfig.base.json).
  resolve: { conditions: ['m3e-source', ...defaultClientConditions] },
  base: './',
  build: { target: ['es2023', ...targets], cssTarget: targets },
})
