import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const apiPort = process.env.API_PORT || "3001";
const vitePort = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT, 10) : 3000;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    ...(vitePort !== undefined && { port: vitePort, strictPort: true }),
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
});
