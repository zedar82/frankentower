import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rundotGameLibrariesPlugin, rundotGamePlaygroundPlugin, rundotStorageCheckPlugin } from '@series-inc/rundot-game-sdk/vite';

export default defineConfig(({ command, mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'offline' ? [] : command === 'serve' ? [rundotGameLibrariesPlugin(), rundotGamePlaygroundPlugin({ target: 'playground' })] : [rundotGameLibrariesPlugin(), rundotStorageCheckPlugin()])],
  build: { outDir: 'dist', target: 'es2022' },
}));
