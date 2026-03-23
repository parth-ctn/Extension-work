import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "node:url";
import { copyFileSync } from "fs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Plugin to copy CSS file to dist with proper name
const copyChatCssPlugin = () => ({
  name: 'copy-chat-css',
  writeBundle() {
    try {
      // Copy the chat widget CSS to dist as content.css for extension to load
      const srcPath = resolve(rootDir, 'src/content/chat-widget.css');
      const destPath = resolve(rootDir, 'dist/content.css');
      copyFileSync(srcPath, destPath);
      console.log('✓ Copied chat-widget.css to dist/content.css');
    } catch (error) {
      console.warn('Failed to copy CSS:', error.message);
    }
  }
});

export default defineConfig({
  plugins: [
    react(),
    copyChatCssPlugin()
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split heavy vendors into named chunks to keep each < 500k
        manualChunks(id) {
          if (!id) return undefined;
          if (id.includes('node_modules')) {
            if (/react|react-dom/.test(id)) return 'vendor-react';
            if (id.includes('katex')) return 'vendor-katex';
            if (id.includes('highlight.js')) return 'vendor-highlight';
            if (id.includes('js-beautify')) return 'vendor-beautify';
            if (id.includes('marked') || id.includes('dompurify')) return 'vendor-markdown';
            if (id.includes('webextension-polyfill')) return 'vendor-polyfill';
            return 'vendor';
          }
          return undefined;
        },
        // Chrome disallows files that start with "_" at any level.
        // Ensure helpers like _commonjsHelpers.js are renamed safely.
        entryFileNames: (chunkInfo) => {
          const name = (chunkInfo?.name || "[name]").replace(/^_+/, "x-");
          return `${name}.js`;
        },
        chunkFileNames: (chunkInfo) => {
          const name = (chunkInfo?.name || "[name]").replace(/^_+/, "x-");
          return `${name}.js`;
        },
        assetFileNames: (assetInfo) => {
          const full = assetInfo?.name || "[name].[ext]";
          const parts = full.split("/");
          const base = parts.pop() || full;
          const sanitized = base.replace(/^_+/, "x-");
          return sanitized;
        }
      },
      input: {
        popup: resolve(rootDir, "index.html"),
        background: resolve(rootDir, "src/background/index.js"),
        content: resolve(rootDir, "src/content/index.jsx")
      }
    },
    outDir: "dist"
  }
});
