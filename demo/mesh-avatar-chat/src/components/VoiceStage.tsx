import type { PiperStatus } from '../hooks/useTts';
import { type UiLanguage, getStrings } from '../lib/i18n';

export type VoiceMode = 'waiting' | 'web' | 'piper';

interface VoiceStageProps {
  lang: UiLanguage;
  /** False when the Miko voice cannot speak the UI language (it is Japanese-only) */
  mikoVoice: boolean;
  mode: VoiceMode;
  piperStatus: PiperStatus;
  /** 0..1 while the voice files download */
  piperProgress: number | null;
  /** True for a few seconds after the Miko voice took over */
  justSwitched: boolean;
  onPrepare: () => void;
  onUseWebSpeech: () => void;
  onUsePiper: () => void;
}

/**
 * Under the avatar: what the page is doing about the voice. Visitors are
 * developers, so it names the parts at work.
 */
export function VoiceStage({
  lang,
  mikoVoice,
  mode,
  piperStatus,
  piperProgress,
  justSwitched,
  onPrepare,
  onUseWebSpeech,
  onUsePiper,
}: VoiceStageProps) {
  const strings = getStrings(lang);

  const browserPill = (subtitle: string) => (
    <div className="voice-pill">
      <span className="voice-icon" aria-hidden="true">
        ♪
      </span>
      <span>
        {strings.voice.currentVoice}{' '}
        <strong>{strings.voice.browserName}</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  );

  // Languages without the Miko voice (Japanese-only model) use the browser
  // voice outright; there is nothing to prepare or switch to.
  if (!mikoVoice) {
    return (
      <div className="voice-stage">
        {browserPill(strings.voice.browserSub)}
        <p className="voice-progress-text">{strings.voice.webOnlyNote}</p>
      </div>
    );
  }

  if (mode === 'piper') {
    return (
      <div className="voice-stage">
        <div
          className={`voice-pill voice-pill-miko${justSwitched ? ' voice-pill-pop' : ''}`}
        >
          <span className="voice-icon" aria-hidden="true">
            ✦
          </span>
          <span>
            {strings.voice.currentVoice}{' '}
            <strong>{strings.voice.mikoName}</strong>
            <small>{strings.voice.mikoSub}</small>
          </span>
        </div>
        {justSwitched && (
          <p className="voice-toast" role="status">
            {strings.voice.switchedToast}
          </p>
        )}
      </div>
    );
  }

  if (piperStatus === 'loading') {
    const percent =
      piperProgress === null ? null : Math.round(piperProgress * 100);
    return (
      <div className="voice-stage">
        <div className="voice-progress" role="status">
          <span className="voice-progress-text">
            {percent === null || percent >= 100
              ? strings.voice.loadingTail
              : strings.voice.downloadPct(percent)}
            <small>{strings.voice.downloadNote}</small>
          </span>
          <span
            className={`voice-progress-bar${percent === null || percent >= 100 ? ' voice-progress-bar-busy' : ''}`}
            aria-hidden="true"
          >
            <span
              className="voice-progress-fill"
              style={{ width: `${percent ?? 0}%` }}
            />
          </span>
        </div>
        {mode === 'waiting' ? (
          <button
            type="button"
            className="link voice-link"
            onClick={onUseWebSpeech}
          >
            {strings.voice.useWebNow}
          </button>
        ) : (
          <div className="voice-pill">
            <span className="voice-icon" aria-hidden="true">
              ♪
            </span>
            <span>
              {strings.voice.currentVoice}{' '}
              <strong>{strings.voice.browserName}</strong>
              <small>{strings.voice.browserSubSwitching}</small>
            </span>
          </div>
        )}
      </div>
    );
  }

  if (piperStatus === 'ready') {
    return (
      <div className="voice-stage">
        {browserPill(strings.voice.browserSub)}
        <button type="button" className="link voice-link" onClick={onUsePiper}>
          {strings.voice.switchToMiko}
        </button>
      </div>
    );
  }

  // idle (not started automatically), missing or error
  return (
    <div className="voice-stage">
      {piperStatus === 'idle' && (
        <button type="button" className="prepare" onClick={onPrepare}>
          {strings.voice.prepareMiko}
        </button>
      )}
      {piperStatus === 'error' && (
        <p className="voice-progress-text">{strings.voice.prepareFailed}</p>
      )}
      {mode === 'web' ? (
        browserPill(strings.voice.browserSub)
      ) : (
        <button
          type="button"
          className="link voice-link"
          onClick={onUseWebSpeech}
        >
          {strings.voice.useWebAlt}
        </button>
      )}
    </div>
  );
}
