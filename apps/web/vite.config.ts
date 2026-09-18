import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@lorekeeper/shared", "@lorekeeper/validation"] },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.WEB_PORT ?? 5173),
    strictPort: true,
    proxy: {
      "/api": process.env.API_PROXY_TARGET ?? `http://localhost:${process.env.PORT ?? 3001}`,
      "/health": process.env.API_PROXY_TARGET ?? `http://localhost:${process.env.PORT ?? 3001}`,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
