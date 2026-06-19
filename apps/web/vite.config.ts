import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/agents": {
        target: "http://localhost:8787",
        changeOrigin: true,
        ws: true,
      },
      "/api/email": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
      "/api/snapshots": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
