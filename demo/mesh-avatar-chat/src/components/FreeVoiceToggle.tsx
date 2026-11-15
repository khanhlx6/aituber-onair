import { type UiLanguage, getStrings } from '../lib/i18n';

interface FreeVoiceToggleProps {
  lang: UiLanguage;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Switch for the free voice that ships with the browser currently open
 * (Web Speech API). When off, replies appear as text only and nothing is
 * spoken aloud.
 */
export function FreeVoiceToggle({
  lang,
  enabled,
  onChange,
}: FreeVoiceToggleProps) {
  const strings = getStrings(lang);
  return (
    <label className="switch-row">
      <input
        type="checkbox"
        role="switch"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span className="switch-label">{strings.voice.freeVoiceToggle}</span>
    </label>
  );
}
