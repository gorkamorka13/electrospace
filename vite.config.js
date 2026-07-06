/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

import { cloudflare } from "@cloudflare/vite-plugin";

let gitVersion = ''
try {
  gitVersion = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch (e) {
  gitVersion = 'unknown'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: { __GIT_VERSION__: JSON.stringify(gitVersion) },
})