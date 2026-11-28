import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// The local-Whisper worker is bundled from @aituber-onair/transcription
// (npm -w @aituber-onair/transcription run build:package) and served at a
// stable URL so on-device speech recognition works in dev and in the build.
const LOCAL_WHISPER_WORKER_FILE = 'local-whisper.worker.js';
const localWhisperWorkerPath = fileURLToPath(
  new URL(
    `../../packages/transcription/dist/${LOCAL_WHISPER_WORKER_FILE}`,
    import.meta.url,
  ),
);

function localWhisperWorker(): Plugin {
  return {
    name: 'local-whisper-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (path !== `/${LOCAL_WHISPER_WORKER_FILE}`) {
          next();
          return;
        }
        try {
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.end(readFileSync(localWhisperWorkerPath));
        } catch {
          res.statusCode = 404;
          res.end(
            `// Build @aituber-onair/transcription first: npm -w @aituber-onair/transcription run build:package`,
          );
        }
      });
    },
    generateBundle() {
      try {
        this.emitFile({
          type: 'asset',
          fileName: LOCAL_WHISPER_WORKER_FILE,
          source: readFileSync(localWhisperWorkerPath),
        });
      } catch {
        this.warn(
          `${LOCAL_WHISPER_WORKER_FILE} was not built; local Whisper voice input will not work in this build.`,
        );
      }
    },
  };
}

// VITE_BASE_PATH is set by the GitHub Pages workflow (e.g. "/aituber-onair/mesh-avatar-chat/").
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), localWhisperWorker()],
  server: { allowedHosts: ['.e2b.app'] },
});
