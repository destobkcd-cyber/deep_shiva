import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
        // If your backend expects no /api prefix, also add:
        // rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
