import { useState } from 'react';
import type { GeminiNanoStatus } from '../hooks/useGeminiNano';
import {
  type DemoSettings,
  PIPER_SPEED_RANGE,
  type VoiceKind,
} from '../hooks/useSettings';
import type { PiperStatus } from '../hooks/useTts';
import {
  type UiLanguage,
  UI_LANGUAGES,
  getStrings,
  providerLabel,
} from '../lib/i18n';
import {
  type KeyedProvider,
  PROVIDERS,
  type Provider,
  getProvider,
  isKeyedProvider,
} from '../lib/providers';
import { FreeVoiceToggle } from './FreeVoiceToggle';

interface SettingsSheetProps {
  lang: UiLanguage;
  settings: DemoSettings;
  nano: {
    status: GeminiNanoStatus;
    progress: number | null;
    prepare: () => void;
  };
  piperStatus: PiperStatus;
  voices: SpeechSynthesisVoice[];
  onUpdateUi: (patch: Partial<DemoSettings['ui']>) => void;
  onUpdateLlm: (patch: Partial<DemoSettings['llm']>) => void;
  onUpdateTts: (patch: Partial<DemoSettings['tts']>) => void;
  onSetApiKey: (provider: KeyedProvider, key: string) => void;
  onSetOpenaiCompatible: (
    patch: Partial<DemoSettings['llm']['openaiCompatible']>,
  ) => void;
  onPreparePiper: () => void;
  /** Free browser-voice toggle (shared with the main screen) */
  onVoiceEnabledChange: (enabled: boolean) => void;
  onReset: () => void;
  /** Removes saved settings and API keys from this browser */
  onClearStored: () => void;
  /** Removes the downloaded voice files from this browser */
  onClearVoiceCache: () => Promise<boolean>;
  onClose: () => void;
}

export function SettingsSheet({
  lang,
  settings,
  nano,
  piperStatus,
  voices,
  onUpdateUi,
  onUpdateLlm,
  onUpdateTts,
  onSetApiKey,
  onSetOpenaiCompatible,
  onPreparePiper,
  onVoiceEnabledChange,
  onReset,
  onClearStored,
  onClearVoiceCache,
  onClose,
}: SettingsSheetProps) {
  const strings = getStrings(lang);
  const [notice, setNotice] = useState('');
  const provider = settings.llm.provider;
  const info = getProvider(provider);
  const tts = settings.tts;
  /** The Miko voice model speaks Japanese only */
  const mikoVoice = lang === 'ja';

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id="settings-title">{strings.settings.title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={strings.settings.close}
          >
            ×
          </button>
        </div>

        <fieldset className="group">
          <legend>{strings.settings.langLegend}</legend>
          <select
            value={lang}
            onChange={(event) =>
              onUpdateUi({ language: event.target.value as UiLanguage })
            }
          >
            {UI_LANGUAGES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nativeName}
              </option>
            ))}
          </select>
        </fieldset>

        <fieldset className="group">
          <legend>{strings.settings.aiLegend}</legend>
          <select
            value={provider}
            onChange={(event) =>
              onUpdateLlm({ provider: event.target.value as Provider })
            }
          >
            {PROVIDERS.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.browser}>
                {providerLabel(item.id, lang)}
                {item.browser ? '' : strings.settings.providerNoBrowser}
              </option>
            ))}
          </select>
          {info.auth === 'none' && (
            <p className="hint">
              Gemini Nano:{' '}
              {strings.settings.nanoLabel(nano.status, nano.progress)}
              {nano.status === 'downloadable' && (
                <button type="button" className="link" onClick={nano.prepare}>
                  {strings.settings.prepare}
                </button>
              )}
            </p>
          )}
          {isKeyedProvider(provider) && (
            <>
              <input
                type="password"
                className="text"
                placeholder={strings.settings.apiKeyPlaceholder(
                  providerLabel(provider, lang),
                )}
                value={settings.llm.apiKeys[provider] ?? ''}
                onChange={(event) => onSetApiKey(provider, event.target.value)}
                autoComplete="off"
              />
              <p className="hint">{strings.settings.apiKeyHint}</p>
            </>
          )}
          {info.auth === 'endpoint' && (
            <>
              <input
                type="url"
                className="text"
                placeholder={strings.settings.endpointUrlPlaceholder}
                value={settings.llm.openaiCompatible.endpoint}
                onChange={(event) =>
                  onSetOpenaiCompatible({ endpoint: event.target.value })
                }
                autoComplete="off"
              />
              <input
                type="text"
                className="text"
                placeholder={strings.settings.modelPlaceholder}
                value={settings.llm.openaiCompatible.model}
                onChange={(event) =>
                  onSetOpenaiCompatible({ model: event.target.value })
                }
                autoComplete="off"
              />
              <p className="hint">{strings.settings.endpointHint}</p>
            </>
          )}
        </fieldset>

        <fieldset className="group">
          <legend>{strings.settings.voiceLegend}</legend>
          <FreeVoiceToggle
            lang={lang}
            enabled={settings.tts.enabled}
            onChange={onVoiceEnabledChange}
          />
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={tts.engine === 'webSpeech'}
              onChange={() => onUpdateTts({ engine: 'webSpeech' as VoiceKind })}
            />
            {strings.settings.webSpeech}
          </label>
          {tts.engine === 'webSpeech' && voices.length > 0 && (
            <select
              value={tts.webSpeechVoice}
              onChange={(event) =>
                onUpdateTts({ webSpeechVoice: event.target.value })
              }
            >
              <option value="">{strings.settings.autoVoice}</option>
              {voices.map((item) => (
                <option key={item.voiceURI} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
          <label className="radio">
            <input
              type="radio"
              name="voice"
              checked={tts.engine === 'piperPlus'}
              disabled={!mikoVoice || piperStatus !== 'ready'}
              onChange={() => onUpdateTts({ engine: 'piperPlus' as VoiceKind })}
            />
            {strings.settings.mikoVoice}
          </label>
          {!mikoVoice && <p className="hint">{strings.voice.mikoJaOnly}</p>}
          {mikoVoice && piperStatus === 'ready' && (
            <label className="slider">
              <span>
                {strings.settings.mikoSpeed}{' '}
                <strong>{tts.piperSpeed.toFixed(2)}×</strong>
              </span>
              <input
                type="range"
                min={PIPER_SPEED_RANGE.min}
                max={PIPER_SPEED_RANGE.max}
                step={PIPER_SPEED_RANGE.step}
                value={tts.piperSpeed}
                onChange={(event) =>
                  onUpdateTts({ piperSpeed: Number(event.target.value) })
                }
              />
            </label>
          )}
          {mikoVoice && piperStatus === 'idle' && (
            <button type="button" className="link" onClick={onPreparePiper}>
              {strings.settings.prepareMikoFull}
            </button>
          )}
          {mikoVoice && piperStatus === 'loading' && (
            <p className="hint">{strings.settings.preparing}</p>
          )}
          {mikoVoice && piperStatus === 'missing' && (
            <p className="hint">{strings.settings.missing}</p>
          )}
          {mikoVoice && piperStatus === 'error' && (
            <p className="hint">{strings.settings.prepareError}</p>
          )}
        </fieldset>

        <div className="sheet-actions">
          <button type="button" className="button-outline" onClick={onReset}>
            {strings.settings.resetChat}
          </button>
        </div>

        <fieldset className="group">
          <legend>{strings.settings.dataLegend}</legend>
          <div className="data-actions">
            <button
              type="button"
              className="button-outline button-danger"
              onClick={() => {
                onClearStored();
                setNotice(strings.settings.clearStoredDone);
              }}
            >
              {strings.settings.clearStored}
            </button>
            <button
              type="button"
              className="button-outline button-danger"
              onClick={() => {
                void onClearVoiceCache().then((removed) =>
                  setNotice(
                    removed
                      ? strings.settings.clearVoiceDone
                      : strings.settings.clearVoiceNone,
                  ),
                );
              }}
            >
              {strings.settings.clearVoice}
            </button>
          </div>
          <p className="hint">{strings.settings.dataHint}</p>
          {notice && (
            <p className="hint notice" role="status">
              {notice}
            </p>
          )}
        </fieldset>

        <p className="credits">
          {strings.settings.creditsLead}
          <a
            href="https://github.com/ayutaz/piper-plus"
            target="_blank"
            rel="noreferrer"
          >
            piper-plus
          </a>
          {strings.settings.creditsTail}
        </p>
      </div>
    </div>
  );
}
