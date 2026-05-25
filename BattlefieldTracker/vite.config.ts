import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// runtimeErrorOverlay removed - it can insert a full-screen dev overlay
// that interferes with Leaflet map rendering. Disabled for local dev.

export default defineConfig({
  plugins: [
    react(),
    // runtimeErrorOverlay removed
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/api': 'http://localhost:5000',
      // Proxy WebSocket connections for the app to the backend server
      '/ws': {
        target: 'http://localhost:5000',
        ws: true,
      },
    },
    // Ensure the HMR client connects to the backend port when the app
    // is served through the express dev server (middleware mode).
    // This prevents the Vite client from attempting to use an undefined
    // port (which shows up as ws://localhost:undefined/... in the console).
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5000,
    },
  },
});
