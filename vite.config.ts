import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true, proxy: { '/socket.io': { target: process.env.TABLE_TEST_SERVER || 'http://127.0.0.1:3001', ws: true } } }, test: { include: ['tests/**/*.test.ts'] } } as Parameters<typeof defineConfig>[0]);
