import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createRealtimeTranscriptionSession,
  isTranscriptionProviderSupported,
  TranscriptionSessionError,
  type RealtimeTranscriptionSession,
  type TranscriptionErrorCode,
} from '@aituber-onair/transcription';
import type { UiLanguage } from '../lib/i18n';
import { SPEECH_LANG } from '../lib/webSpeechVoice';

export interface UseSpeechInputOptions {
  /** UI language; the recognizer follows it (vi-VN / en-US / ja-JP). */
  lang: UiLanguage;
  /** Called once with the finished utterance (final transcript). */
  onFinal: (text: string) => void;
  /** Stop any speaking before listening, so TTS never feeds back into the mic. */
  stopSpeaking: () => void;
}

export interface UseSpeechInput {
  supported: boolean;
  listening: boolean;
  /** Live (interim) transcript while the user speaks. */
  interim: string;
  error: TranscriptionErrorCode | null;
  toggle: () => void;
  clearError: () => void;
}

export function useSpeechInput({
  lang,
  onFinal,
  stopSpeaking,
}: UseSpeechInputOptions): UseSpeechInput {
  const supported = useMemo(
    () => isTranscriptionProviderSupported('web-speech'),
    [],
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<TranscriptionErrorCode | null>(null);
  const sessionRef = useRef<RealtimeTranscriptionSession | null>(null);
  const onFinalRef = useRef(onFinal);
  const stopSpeakingRef = useRef(stopSpeaking);
  useEffect(() => {
    onFinalRef.current = onFinal;
    stopSpeakingRef.current = stopSpeaking;
  }, [onFinal, stopSpeaking]);

  const stop = useCallback(async () => {
    setListening(false);
    setInterim('');
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      return;
    }
    try {
      await session.stop();
    } catch {
      // The recognizer may already have ended on its own.
    }
    await session.dispose();
  }, []);

  const start = useCallback(() => {
    if (!supported || sessionRef.current) {
      return;
    }
    stopSpeakingRef.current();
    setError(null);
    setInterim('');
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: SPEECH_LANG[lang],
      // One utterance per press: the first pause finalizes and the result is sent.
      continuous: false,
    });
    session.onTranscript(({ text, isFinal }) => {
      setInterim(text);
      if (isFinal) {
        void stop();
        const value = text.trim();
        if (value) {
          onFinalRef.current(value);
        }
      }
    });
    session.onError((err) => {
      setError(err.code);
      void stop();
    });
    sessionRef.current = session;
    setListening(true);
    session.start().catch((err: unknown) => {
      setError(
        err instanceof TranscriptionSessionError ? err.code : 'provider-error',
      );
      void stop();
    });
  }, [lang, supported, stop]);

  const toggle = useCallback(() => {
    if (sessionRef.current) {
      void stop();
      return;
    }
    start();
  }, [start, stop]);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) {
        void session.dispose();
      }
    };
  }, []);

  return {
    supported,
    listening,
    interim,
    error,
    toggle,
    clearError: useCallback(() => setError(null), []),
  };
}
