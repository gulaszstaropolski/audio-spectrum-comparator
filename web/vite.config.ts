import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/audio-spectrum-comparator/",
  plugins: [react()],
});
