import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// base './' so the built page works from any sub-path (e.g. https://example.com/console/)
export default defineConfig({ plugins: [react(), tailwindcss()], base: './' })
