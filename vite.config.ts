import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { openFromDisk } from "./vite.plugins";

export default defineConfig({
  base: "./",
  plugins: [react(), openFromDisk()],
  build: { rollupOptions: { output: { format: "iife", inlineDynamicImports: true } } },
});
