import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const raiz = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: raiz },
      // "server-only" acusa erro fora do Next; nos testes o código roda como servidor mesmo.
      { find: /^server-only$/, replacement: `${raiz}tests/server-only.ts` },
    ],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // Um banco de testes só: um arquivo por vez evita um teste apagar o que o outro está usando.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
})
