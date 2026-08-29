import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    // Bundle analysis — only active with ANALYZE=true
    ...(process.env.ANALYZE
      ? [visualizer({ open: true, gzipSize: true, brotliSize: true, filename: "dist/stats.html" })]
      : []),
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      "skytravel-client-production-dc5f.up.railway.app",
      "sky-travel.tours",
      "www.sky-travel.tours",
    ],
    proxy: {
      // In production nginx proxies /blog to the API server, which renders the
      // blog server-side (Express + Markdown). Without this, Vite's SPA fallback
      // serves index.html for /blog and the React app renders instead.
      "/blog": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: [
      "skytravel-client-production-dc5f.up.railway.app",
      "sky-travel.tours",
      "www.sky-travel.tours",
    ],
  },
  build: {
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/@tiptap") || id.includes("node_modules/prosemirror")) {
            return "vendor-tiptap";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
});
