import { useCallback, useEffect, useRef, useState } from 'react';

export type GeminiNanoStatus =
  | 'checking'
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'error';

interface LanguageModelAPI {
  availability(options?: Record<string, unknown>): Promise<string>;
  create(options?: Record<string, unknown>): Promise<{ destroy(): void }>;
}

const MODEL_IO = {
  expectedInputs: [{ type: 'text', languages: ['ja'] }],
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
};

/** Known-good Prompt API languages; used when the UI language is unsupported. */
export const NANO_FALLBACK_LANGUAGES = {
  inputs: ['ja', 'en'],
  outputs: ['ja'],
};

/**
 * Languages Chrome's LanguageModel API accepts right now. It validates these
 * strictly since the language pack feature: any other code (e.g. 'vi') makes
 * session creation abort, so declarations are limited to this list and the
 * prompt steers the reply language instead.
 */
export const NANO_SUPPORTED_LANGUAGES = ['de', 'en', 'es', 'fr', 'ja'];

export interface NanoLanguages {
  inputs: string[];
  outputs: string[];
}

/**
 * Resolve the `expectedInputs`/`expectedOutputs` languages for session
 * creation. Only codes Chrome currently supports may be declared — a
 * declaration outside that list aborts session creation — so the UI language
 * is used when it is supported and dropped otherwise; the prompt steers the
 * reply language either way.
 */
export async function resolveNanoLanguages(
  code: string,
): Promise<NanoLanguages> {
  const unique = (list: string[]) =>
    list.filter((item, index, all) => all.indexOf(item) === index);
  const supported = (list: string[]) =>
    list.filter((item) => NANO_SUPPORTED_LANGUAGES.includes(item));
  const preferred: NanoLanguages = {
    inputs: supported(unique([code, 'ja', 'en'])),
    outputs: supported(unique([code, 'ja', 'en'])),
  };
  const lm = getLanguageModel();
  if (!lm || preferred.outputs.length === 0) return NANO_FALLBACK_LANGUAGES;
  try {
    const result = await lm.availability({
      expectedInputs: [{ type: 'text', languages: preferred.inputs }],
      expectedOutputs: [{ type: 'text', languages: preferred.outputs }],
    });
    return result === 'unavailable' ? NANO_FALLBACK_LANGUAGES : preferred;
  } catch {
    return NANO_FALLBACK_LANGUAGES;
  }
}

function getLanguageModel(): LanguageModelAPI | undefined {
  return (globalThis as Record<string, unknown>).LanguageModel as
    | LanguageModelAPI
    | undefined;
}

/** Availability of Chrome's built-in Gemini Nano, plus a user-triggered download. */
export function useGeminiNano() {
  const [status, setStatus] = useState<GeminiNanoStatus>('checking');
  const [progress, setProgress] = useState<number | null>(null);
  const preparingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      const lm = getLanguageModel();
      if (!lm) {
        if (!cancelled) setStatus('unavailable');
        return;
      }
      try {
        const result = await lm.availability(MODEL_IO);
        if (cancelled) return;
        if (
          result === 'available' ||
          result === 'downloading' ||
          result === 'downloadable'
        ) {
          setStatus(result);
        } else {
          setStatus('unavailable');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  /** Must be called from a user gesture: Chrome only starts the download then. */
  const prepare = useCallback(() => {
    const lm = getLanguageModel();
    if (!lm || preparingRef.current) return;
    preparingRef.current = true;
    setStatus('downloading');
    setProgress(0);
    lm.create({
      ...MODEL_IO,
      monitor: (monitor: {
        addEventListener(
          event: string,
          handler: (event: { loaded: number }) => void,
        ): void;
      }) => {
        monitor.addEventListener('downloadprogress', (event) => {
          if (mountedRef.current) {
            setProgress(Math.round((event.loaded || 0) * 100));
          }
        });
      },
    })
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
        if (mountedRef.current) {
          setStatus('available');
          setProgress(null);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setStatus('error');
          setProgress(null);
        }
      })
      .finally(() => {
        preparingRef.current = false;
      });
  }, []);

  /** Loads the model into memory ahead of the first reply (fire and forget). */
  const warmUp = useCallback(() => {
    const lm = getLanguageModel();
    if (!lm) return;
    lm.create(MODEL_IO)
      .then((session) => {
        try {
          session.destroy();
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // availability() already reported the state; nothing to do here
      });
  }, []);

  return { status, progress, prepare, warmUp };
}
