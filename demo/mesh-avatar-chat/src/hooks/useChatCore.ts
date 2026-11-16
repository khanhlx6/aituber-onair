import {
  AITuberOnAirCore,
  AITuberOnAirCoreEvent,
  resolveOpenAICompatibleEndpoint,
} from '@aituber-onair/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { freeAiChat, type FreeAiTurn } from '../lib/freeAi';
import { type UiLanguage, getStrings } from '../lib/i18n';
import {
  GROQ_ENDPOINT,
  GROQ_MODEL,
  type Provider,
  getProvider,
} from '../lib/providers';
import {
  NANO_FALLBACK_LANGUAGES,
  type NanoLanguages,
  resolveNanoLanguages,
} from './useGeminiNano';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantReply {
  text: string;
  emotion?: string;
}

export interface UseChatCoreOptions {
  provider: Provider;
  /** Language of the conversation; drives prompts and error text */
  lang: UiLanguage;
  apiKey: string;
  /** For the OpenAI-compatible provider: server URL and model name */
  openaiCompatible: { endpoint: string; model: string };
  /** Whether Chrome's built-in model can answer right now */
  nanoReady: boolean;
  systemPrompt: string;
  /** What the character says when no language model is reachable */
  fallbackReply: AssistantReply;
  onReply: (reply: AssistantReply) => void;
}

interface ResponsePayload {
  message?: { content?: string } | string;
  rawText?: string;
  screenplay?: { emotion?: string; text?: string };
}

let messageSeq = 0;
const nextId = () => `${Date.now()}-${++messageSeq}`;

/** Wires AITuberOnAirCore to a message list; speech is handled by the caller. */
export function useChatCore({
  provider,
  lang,
  apiKey,
  openaiCompatible,
  nanoReady,
  systemPrompt,
  fallbackReply,
  onReply,
}: UseChatCoreOptions) {
  const coreRef = useRef<AITuberOnAirCore | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partial, setPartial] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  /** Prompt API languages for the UI language, with a safe fallback */
  const [nanoLanguages, setNanoLanguages] = useState<NanoLanguages>(
    NANO_FALLBACK_LANGUAGES,
  );
  const onReplyRef = useRef(onReply);
  const fallbackRef = useRef(fallbackReply);
  const systemPromptRef = useRef(systemPrompt);
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    let cancelled = false;
    void resolveNanoLanguages(lang).then((resolved) => {
      if (!cancelled) setNanoLanguages(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    onReplyRef.current = onReply;
    fallbackRef.current = fallbackReply;
    systemPromptRef.current = systemPrompt;
  }, [onReply, fallbackReply, systemPrompt]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const info = getProvider(provider);
  /** Groq (free tier) rides the OpenAI-compatible path with its own endpoint */
  const isGroq = provider === 'groq';
  let compatibleUrl = '';
  const compatibleSource = isGroq ? GROQ_ENDPOINT : openaiCompatible.endpoint;
  if ((info.auth === 'endpoint' || isGroq) && compatibleSource.trim()) {
    try {
      compatibleUrl =
        resolveOpenAICompatibleEndpoint(compatibleSource).chatCompletionsUrl;
    } catch {
      compatibleUrl = '';
    }
  }
  const compatibleModel = isGroq ? GROQ_MODEL : openaiCompatible.model.trim();
  const canChat = (() => {
    if (!info.browser) return false;
    if (isGroq) return apiKey.trim().length > 0 && compatibleUrl.length > 0;
    if (info.auth === 'none') return nanoReady;
    if (info.auth === 'endpoint') return compatibleUrl.length > 0;
    return apiKey.trim().length > 0;
  })();

  useEffect(() => {
    if (!canChat) {
      coreRef.current?.dispose();
      coreRef.current = null;
      return;
    }

    const strings = getStrings(lang);
    const core = new AITuberOnAirCore({
      apiKey,
      chatProvider: isGroq ? 'openai-compatible' : provider,
      ...(provider === 'gemini-nano'
        ? {
            model: 'gemini-nano',
            providerOptions: {
              // Reuse one Prompt API session instead of rebuilding it per turn.
              sessionMode: 'persistent' as const,
              // Declaring the UI language lets the browser download language
              // support material (improves e.g. Vietnamese replies).
              expectedInputLanguages: nanoLanguages.inputs,
              expectedOutputLanguages: nanoLanguages.outputs,
              // Few-shot turns: Gemini Nano follows the reply length and the
              // leading emotion tag far more reliably when it sees examples.
              initialPrompts: strings.prompt.nanoExamples.map((example) => ({
                ...example,
              })),
            },
          }
        : {}),
      ...(info.auth === 'endpoint' || isGroq
        ? {
            model: compatibleModel || 'local-model',
            providerOptions: { endpoint: compatibleUrl },
          }
        : {}),
      chatOptions: { systemPrompt },
      debug: false,
    });

    core.on(AITuberOnAirCoreEvent.PROCESSING_START, () => {
      setError('');
      setIsProcessing(true);
      setPartial('');
    });
    core.on(AITuberOnAirCoreEvent.PROCESSING_END, () => {
      setIsProcessing(false);
      setPartial('');
    });
    core.on(AITuberOnAirCoreEvent.ASSISTANT_PARTIAL, (data: unknown) => {
      const text =
        typeof data === 'string'
          ? data
          : ((data as ResponsePayload)?.rawText ?? '');
      setPartial(text.replace(/^\s*\[[a-z]+\]\s*/i, ''));
    });
    core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, (data: unknown) => {
      let text = '';
      let emotion: string | undefined;
      if (typeof data === 'string') {
        text = data;
      } else {
        const payload = data as ResponsePayload;
        const content =
          typeof payload.message === 'string'
            ? payload.message
            : payload.message?.content;
        text =
          payload.screenplay?.text?.trim() || content || payload.rawText || '';
        emotion = payload.screenplay?.emotion;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text },
      ]);
      onReplyRef.current({ text, emotion });
    });
    core.on(AITuberOnAirCoreEvent.ERROR, (err: unknown) => {
      console.error('AITuberOnAirCore error:', err);
      setError(err instanceof Error ? err.message : strings.prompt.replyError);
      setIsProcessing(false);
    });

    coreRef.current = core;
    return () => {
      core.dispose();
      if (coreRef.current === core) coreRef.current = null;
    };
  }, [
    apiKey,
    canChat,
    isGroq,
    lang,
    nanoLanguages,
    provider,
    systemPrompt,
    info.auth,
    compatibleUrl,
    compatibleModel,
  ]);

  const send = useCallback(async (input: string) => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);
    const core = coreRef.current;
    if (core) {
      await core.processChat(text);
      return;
    }
    // No configured model: the free no-key AI answers, the canned reply last.
    setIsProcessing(true);
    setPartial('');
    setError('');
    try {
      const history: FreeAiTurn[] = messagesRef.current.map((message) => ({
        role: message.role,
        text: message.text,
      }));
      const raw = await freeAiChat(systemPromptRef.current, history, text);
      const tagged = raw.match(
        /^\s*\[(happy|sad|angry|surprised|relaxed|neutral)\]\s*/i,
      );
      const emotion = tagged?.[1]?.toLowerCase();
      const body = tagged ? raw.slice(tagged[0].length) : raw;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: body },
      ]);
      onReplyRef.current({ text: body, emotion });
    } catch (err) {
      console.error('Free AI error:', err);
      const reply = fallbackRef.current;
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', text: reply.text },
      ]);
      onReplyRef.current(reply);
    } finally {
      setIsProcessing(false);
      setPartial('');
    }
  }, []);

  const addAssistantMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', text }]);
  }, []);

  const reset = useCallback(() => {
    coreRef.current?.clearChatHistory();
    setMessages([]);
    setPartial('');
    setError('');
  }, []);

  return {
    messages,
    partial,
    isProcessing,
    error,
    canChat,
    send,
    addAssistantMessage,
    reset,
  };
}
