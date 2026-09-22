import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this app from /<repo>/, so the deploy workflow sets VITE_BASE.
// Locally it defaults to "/".
const base = process.env.VITE_BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    // One bundle on purpose: all chart data ships with the app so it works offline.
    chunkSizeWarningLimit: 900,
  },
});
