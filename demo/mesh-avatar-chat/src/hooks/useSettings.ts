import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_UI_LANGUAGE, type UiLanguage } from '../lib/i18n';
import {
  type KeyedProvider,
  PROVIDERS,
  type Provider,
  getProvider,
} from '../lib/providers';

export type VoiceKind = 'webSpeech' | 'piperPlus';

/** Speech-to-text engine for the mic: cloud Web Speech or on-device Whisper. */
export type SttEngine = 'webSpeech' | 'localWhisper';
export type WhisperModelSize = 'tiny' | 'base' | 'small';

/**
 * Settings persisted in this browser only. API keys are included so a visitor
 * does not have to re-enter them; they never leave the browser except in the
 * requests to the provider the visitor chose.
 *
 * Grouped by concern (`ui`, `llm`, `tts`) so new areas such as avatar options
 * can be added as new top-level groups without touching the others. Bump
 * `version` and extend `migrate()` when a stored shape changes; anything else
 * stored under this key is ignored.
 */
export interface DemoSettings {
  version: 4;
  ui: {
    /** Interface / conversation language */
    language: UiLanguage;
  };
  llm: {
    provider: Provider;
    apiKeys: Partial<Record<KeyedProvider, string>>;
    openaiCompatible: {
      /** Origin, `/v1` base, or full chat completions URL */
      endpoint: string;
      model: string;
    };
  };
  tts: {
    engine: VoiceKind;
    /** Whether replies are spoken at all (the free browser voice toggle) */
    enabled: boolean;
    /** Web Speech voice name; empty picks the best Japanese voice automatically */
    webSpeechVoice: string;
    /** Speaking speed of the Miko voice (piper-plus length scale inverse) */
    piperSpeed: number;
  };
  stt: {
    /** Speech-to-text engine used when composing with the mic */
    engine: SttEngine;
    /** On-device Whisper model size (downloaded once on first use) */
    whisperModel: WhisperModelSize;
  };
}

const STORAGE_KEY = 'aituber-onair-mesh-avatar-chat';

export const DEFAULT_PIPER_SPEED = 1.0;
export const PIPER_SPEED_RANGE = { min: 0.7, max: 1.2, step: 0.05 };

function makeDefaults(): DemoSettings {
  return {
    version: 4,
    ui: { language: DEFAULT_UI_LANGUAGE },
    llm: {
      provider: 'gemini-nano',
      apiKeys: {},
      openaiCompatible: { endpoint: '', model: '' },
    },
    tts: {
      engine: 'webSpeech',
      enabled: true,
      webSpeechVoice: '',
      piperSpeed: DEFAULT_PIPER_SPEED,
    },
    stt: {
      engine: 'webSpeech',
      whisperModel: 'tiny',
    },
  };
}

export const DEFAULT_SETTINGS: DemoSettings = makeDefaults();

/** v1 stores predate the `ui` group; keep their llm/tts data. */
function migrate(raw: unknown): DemoSettings {
  if (!raw || typeof raw !== 'object') return makeDefaults();
  const stored = raw as Partial<Omit<DemoSettings, 'version'>> & {
    version?: number;
  };
  if (
    stored.version !== 1 &&
    stored.version !== 2 &&
    stored.version !== 3 &&
    stored.version !== 4
  ) {
    return makeDefaults();
  }
  return {
    version: 4,
    ui: { ...makeDefaults().ui, ...stored.ui },
    llm: {
      ...DEFAULT_SETTINGS.llm,
      ...stored.llm,
      apiKeys: { ...stored.llm?.apiKeys },
      openaiCompatible: {
        ...DEFAULT_SETTINGS.llm.openaiCompatible,
        ...stored.llm?.openaiCompatible,
      },
    },
    tts: { ...DEFAULT_SETTINGS.tts, ...stored.tts },
    stt: { ...DEFAULT_SETTINGS.stt, ...stored.stt },
  };
}

function load(): DemoSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const settings = migrate(raw ? JSON.parse(raw) : null);
    // A provider this build no longer offers falls back to the default.
    if (!PROVIDERS.some((provider) => provider.id === settings.llm.provider)) {
      settings.llm.provider = DEFAULT_SETTINGS.llm.provider;
    }
    return settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<DemoSettings>(load);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage may be unavailable (private mode); keep in memory
    }
  }, [settings]);

  /** Removes everything this page saved in localStorage and returns to defaults. */
  const clearStored = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to remove
    }
    skipPersistRef.current = true;
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const updateUi = useCallback((patch: Partial<DemoSettings['ui']>) => {
    setSettings((prev) => ({ ...prev, ui: { ...prev.ui, ...patch } }));
  }, []);

  const updateLlm = useCallback((patch: Partial<DemoSettings['llm']>) => {
    setSettings((prev) => ({ ...prev, llm: { ...prev.llm, ...patch } }));
  }, []);

  const updateTts = useCallback((patch: Partial<DemoSettings['tts']>) => {
    setSettings((prev) => ({ ...prev, tts: { ...prev.tts, ...patch } }));
  }, []);

  const updateStt = useCallback((patch: Partial<DemoSettings['stt']>) => {
    setSettings((prev) => ({ ...prev, stt: { ...prev.stt, ...patch } }));
  }, []);

  const setApiKey = useCallback((provider: KeyedProvider, key: string) => {
    setSettings((prev) => ({
      ...prev,
      llm: { ...prev.llm, apiKeys: { ...prev.llm.apiKeys, [provider]: key } },
    }));
  }, []);

  const setOpenaiCompatible = useCallback(
    (patch: Partial<DemoSettings['llm']['openaiCompatible']>) => {
      setSettings((prev) => ({
        ...prev,
        llm: {
          ...prev.llm,
          openaiCompatible: { ...prev.llm.openaiCompatible, ...patch },
        },
      }));
    },
    [],
  );

  const provider = getProvider(settings.llm.provider);
  const apiKey =
    provider.auth === 'apiKey'
      ? (
          settings.llm.apiKeys[settings.llm.provider as KeyedProvider] ?? ''
        ).trim()
      : '';

  return {
    settings,
    updateUi,
    updateLlm,
    updateTts,
    updateStt,
    setApiKey,
    setOpenaiCompatible,
    clearStored,
    apiKey,
  };
}
