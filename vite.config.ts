import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@shared": root("./shared"), "@": root("./src") },
  },
  server: {
    host: true,
    port: 5173,
    proxy: { "/api": "http://localhost:8080" },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "server/**/*.test.ts",
      "shared/**/*.test.ts",
      "src/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
      "roku/**/*.test.ts",
    ],
  },
});
