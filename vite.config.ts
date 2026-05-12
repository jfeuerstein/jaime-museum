import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { adminUploadPlugin } from './vite-plugin-admin-upload'

export default defineConfig({
  plugins: [react(), adminUploadPlugin()],
  server: {
    port: 5180,
    strictPort: true,
  },
})
