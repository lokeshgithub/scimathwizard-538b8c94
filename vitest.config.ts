import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "src/hooks/**",
        "src/services/**",
        "src/utils/**",
        "src/components/quiz/**",
      ],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "**/test/**",
        "src/integrations/**",
      ],
      thresholds: {
        // Track improvement over time — start with achievable targets
        lines: 30,
        functions: 25,
        branches: 20,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
