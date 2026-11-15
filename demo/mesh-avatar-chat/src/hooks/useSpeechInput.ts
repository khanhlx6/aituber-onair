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
  /**
   * Called with each finished utterance. The mic stays open afterwards, so
   * the user can keep talking; only `stop`/`toggle` turn it off.
   */
  onFinal: (text: string) => void;
  /** Stop any speaking before listening, so TTS never feeds back into the mic. */
  stopSpeaking: () => void;
}

export interface UseSpeechInput {
  supported: boolean;
  listening: boolean;
  /** Live (interim) transcript of the sentence being spoken right now. */
  interim: string;
  error: TranscriptionErrorCode | null;
  /** Turn the mic on/off. */
  toggle: () => void;
  /** Turn the mic off (used when the message is sent). */
  stop: () => void;
  clearError: () => void;
}

/** Consecutive recognizer failures tolerated before the mic gives up. */
const MAX_ERROR_STREAK = 3;

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
  /** While true the mic keeps reviving recognizer runs (one per utterance). */
  const wantListeningRef = useRef(false);
  const errorStreakRef = useRef(0);
  const onFinalRef = useRef(onFinal);
  const stopSpeakingRef = useRef(stopSpeaking);
  const langRef = useRef(lang);
  useEffect(() => {
    onFinalRef.current = onFinal;
    stopSpeakingRef.current = stopSpeaking;
    langRef.current = lang;
  }, [onFinal, stopSpeaking, lang]);

  /** Set after mount so `revive` can restart without a circular reference. */
  const startSessionRef = useRef<() => void>(() => {});

  /** Create and wire one recognizer run; later runs replace it. */
  const startSession = useCallback(() => {
    if (!wantListeningRef.current) return;
    const session = createRealtimeTranscriptionSession({
      provider: 'web-speech',
      language: SPEECH_LANG[langRef.current],
      // Continuous keeps one run alive across sentences on desktop; when a
      // browser ends the run early, `revive` starts a fresh one right away.
      continuous: true,
    });

    let reachedListening = false;

    const revive = () => {
      if (sessionRef.current !== session || !wantListeningRef.current) return;
      sessionRef.current = null;
      void session.dispose().catch(() => undefined);
      startSessionRef.current();
    };

    const fail = (code: TranscriptionErrorCode) => {
      wantListeningRef.current = false;
      sessionRef.current = null;
      void session.dispose().catch(() => undefined);
      setListening(false);
      setInterim('');
      setError(code);
    };

    session.onTranscript(({ text, isFinal }) => {
      if (sessionRef.current !== session || !wantListeningRef.current) return;
      if (!isFinal) {
        setInterim(text);
        return;
      }
      setInterim('');
      const value = text.trim();
      if (!value) return;
      errorStreakRef.current = 0;
      onFinalRef.current(value);
    });

    session.onError((err) => {
      if (sessionRef.current !== session || !wantListeningRef.current) return;
      if (err.code === 'permission-denied') {
        fail(err.code);
        return;
      }
      if (err.code !== 'no-speech') {
        errorStreakRef.current += 1;
        if (errorStreakRef.current >= MAX_ERROR_STREAK) {
          fail('provider-error');
          return;
        }
      }
      // Quiet between sentences (or a flaky run): keep the mic open.
      revive();
    });

    session.onStateChange((state) => {
      if (sessionRef.current !== session || !wantListeningRef.current) return;
      if (state === 'listening') {
        reachedListening = true;
        return;
      }
      // The run ended on its own (some mobile browsers stop after a result,
      // the network drops...): pick up where it left off.
      if (reachedListening && (state === 'idle' || state === 'error')) revive();
    });

    sessionRef.current = session;
    session.start().catch((err: unknown) => {
      if (sessionRef.current !== session || !wantListeningRef.current) return;
      fail(
        err instanceof TranscriptionSessionError ? err.code : 'provider-error',
      );
    });
  }, []);

  useEffect(() => {
    startSessionRef.current = startSession;
  }, [startSession]);

  const startLoop = useCallback(() => {
    if (!supported || wantListeningRef.current) return;
    stopSpeakingRef.current();
    setError(null);
    setInterim('');
    errorStreakRef.current = 0;
    wantListeningRef.current = true;
    setListening(true);
    startSession();
  }, [supported, startSession]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    errorStreakRef.current = 0;
    const session = sessionRef.current;
    sessionRef.current = null;
    setListening(false);
    setInterim('');
    if (!session) return;
    void (async () => {
      try {
        await session.stop();
        await session.dispose();
      } catch {
        // The run may already have ended.
      }
    })();
  }, []);

  const toggle = useCallback(() => {
    if (wantListeningRef.current) {
      stop();
      return;
    }
    startLoop();
  }, [startLoop, stop]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (session) void session.dispose().catch(() => undefined);
    };
  }, []);

  return {
    supported,
    listening,
    interim,
    error,
    toggle,
    stop,
    clearError: useCallback(() => setError(null), []),
  };
}
