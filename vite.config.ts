import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function copyPublicExcludingGeneratedAssets() {
  const publicDir = path.resolve('public');
  const excludedDir = path.join('dashboard-assets', 'generated');

  const copyDir = (source: string, target: string, relative = '') => {
    if (relative === excludedDir) return;
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
      if (nextRelative === excludedDir || nextRelative.startsWith(`${excludedDir}${path.sep}`)) continue;
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        copyDir(sourcePath, targetPath, nextRelative);
      } else if (entry.isFile()) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  };

  return {
    name: 'copy-public-excluding-generated-assets',
    closeBundle() {
      copyDir(publicDir, path.resolve('dist'));
    }
  };
}

export default defineConfig({
  plugins: [react(), copyPublicExcludingGeneratedAssets()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:4317'
    }
  },
  build: {
    copyPublicDir: false
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts'
  }
});
