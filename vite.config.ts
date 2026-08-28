import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const socialAssetNames = new Set(["farm1.webp", "gina3.webp", "shawn3.webp", "shawn-gina-hero.webp"]);

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames(assetInfo) {
          return assetInfo.name && socialAssetNames.has(assetInfo.name) ? "social/[name][extname]" : "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
