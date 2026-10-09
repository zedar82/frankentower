import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  rundotGameLibrariesPlugin,
  rundotGamePlaygroundPlugin,
  rundotStorageCheckPlugin,
} from '@series-inc/rundot-game-sdk/vite';

export default defineConfig(({ command, mode }) => ({
  base: './',
  plugins: [
    {
      name: 'exclude-development-storage',
      generateBundle() {
        if (mode === 'offline')
          this.error('Offline builds are development-only; use the default production build.');
        for (const id of this.getModuleIds()) {
          if (/[/\\]offline-storage\.ts$/.test(id) && this.getModuleInfo(id)?.isIncluded)
            this.error('Development storage entered the production bundle.');
        }
      },
    },
    react(),
    ...(mode === 'offline'
      ? []
      : command === 'serve'
        ? [rundotGameLibrariesPlugin(), rundotGamePlaygroundPlugin({ target: 'playground' })]
        : [rundotGameLibrariesPlugin(), rundotStorageCheckPlugin()]),
  ],
  build: { outDir: 'dist', target: 'es2022' },
}));
