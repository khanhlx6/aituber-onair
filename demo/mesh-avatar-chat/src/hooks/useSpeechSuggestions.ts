import {
  ChatServiceFactory,
  type ChatProviderName,
  type ChatServiceOptionsByProvider,
  type Message,
  resolveOpenAICompatibleEndpoint,
} from '@aituber-onair/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type UiLanguage, getStrings } from '../lib/i18n';
import { type Provider, getProvider } from '../lib/providers';
import {
  NANO_FALLBACK_LANGUAGES,
  type NanoLanguages,
  resolveNanoLanguages,
} from './useGeminiNano';

export interface UseSpeechSuggestionsOptions {
  lang: UiLanguage;
  /** Same provider setup as the chat; used when Gemini Nano is not ready */
  provider: Provider;
  apiKey: string;
  openaiCompatible: { endpoint: string; model: string };
  /** Whether Chrome's built-in model can answer right now */
  nanoReady: boolean;
}

export interface UseSpeechSuggestions {
  /** Quick candidates for the latest utterance (fixes when it is mistyped) */
  items: string[];
  generating: boolean;
  /** Build suggestions for a finished utterance; older requests are dropped */
  request: (utterance: string) => void;
  clear: () => void;
}

/** Deterministic, always-free candidates shown while (or instead of) a model. */
function heuristicVariants(utterance: string, lang: UiLanguage): string[] {
  const base = utterance.trim();
  if (!base) return [];
  const core = base.replace(/[.?!…。！？]+$/u, '').trim() || base;
  if (lang === 'ja') {
    return [`${core}。`, `${core}？`, `${core}！`];
  }
  const first = core.charAt(0).toLocaleUpperCase() + core.slice(1);
  return [`${first}.`, `${first}?`, `${first}!`];
}

/** Pull up to three plain rewrite lines out of a model reply. */
function parseVariants(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw
      .trim()
      .replace(/^[-*•]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= 3) break;
  }
  return out;
}

/** One stateless chat call (its own session; never touches chat history). */
function runOneShot(
  name: ChatProviderName,
  options: ChatServiceOptionsByProvider[ChatProviderName],
  systemPrompt: string,
  userText: string,
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let complete = '';
    let service: ReturnType<typeof ChatServiceFactory.createChatService>;
    try {
      service = ChatServiceFactory.createChatService(name, options);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ];
    service
      .processChat(
        messages,
        () => {},
        async (text: string) => {
          complete = text;
        },
      )
      .then(() => {
        service.dispose?.();
        resolve(parseVariants(complete));
      })
      .catch((err: unknown) => {
        service.dispose?.();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}

/**
 * Suggestion chips for the last spoken utterance: corrected rewrites so a
 * mistyped recording can be fixed with one tap. Gemini Nano (free, on-device)
 * generates them when available, then the configured chat provider, and the
 * plain heuristic variants are always shown as an instant baseline.
 */
export function useSpeechSuggestions({
  lang,
  provider,
  apiKey,
  openaiCompatible,
  nanoReady,
}: UseSpeechSuggestionsOptions): UseSpeechSuggestions {
  const [items, setItems] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const requestSeqRef = useRef(0);
  const optionsRef = useRef({
    lang,
    provider,
    apiKey,
    openaiCompatible,
    nanoReady,
  });
  useEffect(() => {
    optionsRef.current = {
      lang,
      provider,
      apiKey,
      openaiCompatible,
      nanoReady,
    };
  }, [lang, provider, apiKey, openaiCompatible, nanoReady]);

  /** Prompt API languages for the UI language, with a safe fallback */
  const [nanoLanguages, setNanoLanguages] = useState<NanoLanguages>(
    NANO_FALLBACK_LANGUAGES,
  );
  useEffect(() => {
    let cancelled = false;
    void resolveNanoLanguages(lang).then((resolved) => {
      if (!cancelled) setNanoLanguages(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);
  const nanoLanguagesRef = useRef(nanoLanguages);
  useEffect(() => {
    nanoLanguagesRef.current = nanoLanguages;
  }, [nanoLanguages]);

  const request = useCallback((utterance: string) => {
    const trimmed = utterance.trim();
    if (!trimmed) return;
    const seq = ++requestSeqRef.current;
    const baseline = heuristicVariants(trimmed, optionsRef.current.lang);
    // Instant, free candidates first; a model upgrade may follow.
    setItems(baseline);
    setGenerating(true);
    void (async () => {
      const opts = optionsRef.current;
      const system = getStrings(opts.lang).prompt.suggestSystem;
      let modelVariants: string[] = [];
      try {
        if (opts.nanoReady) {
          modelVariants = await runOneShot(
            'gemini-nano',
            {
              model: 'gemini-nano',
              expectedInputLanguages: nanoLanguagesRef.current.inputs,
              expectedOutputLanguages: nanoLanguagesRef.current.outputs,
            },
            system,
            trimmed,
          );
        } else {
          const info = getProvider(opts.provider);
          if (info.auth === 'endpoint') {
            const endpoint = opts.openaiCompatible.endpoint.trim();
            if (!endpoint) throw new Error('no endpoint');
            const { chatCompletionsUrl } =
              resolveOpenAICompatibleEndpoint(endpoint);
            modelVariants = await runOneShot(
              'openai-compatible',
              {
                apiKey: opts.apiKey,
                model: opts.openaiCompatible.model.trim() || 'local-model',
                endpoint: chatCompletionsUrl,
              },
              system,
              trimmed,
            );
          } else if (info.auth === 'apiKey' && opts.apiKey.trim()) {
            modelVariants = await runOneShot(
              opts.provider,
              { apiKey: opts.apiKey.trim() },
              system,
              trimmed,
            );
          }
        }
      } catch {
        // The heuristic baseline stays visible; nothing else to do.
      }
      if (seq !== requestSeqRef.current) return;
      const merged = [...modelVariants];
      for (const candidate of baseline) {
        if (merged.length >= 3) break;
        if (!merged.includes(candidate)) merged.push(candidate);
      }
      if (merged.length > 0) setItems(merged.slice(0, 3));
      setGenerating(false);
    })();
  }, []);

  const clear = useCallback(() => {
    requestSeqRef.current += 1;
    setItems([]);
    setGenerating(false);
  }, []);

  return { items, generating, request, clear };
}
