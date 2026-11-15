import { UI_LANGUAGES, type UiLanguage } from '../lib/i18n';

interface LanguageToggleProps {
  lang: UiLanguage;
  onChange: (language: UiLanguage) => void;
}

/**
 * Compact segmented control shown on the main screen (top bar and start
 * overlay) so the language can be switched without opening the settings.
 * Labels always stay in their native names.
 */
export function LanguageToggle({ lang, onChange }: LanguageToggleProps) {
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {UI_LANGUAGES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={lang === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.nativeName}
        </button>
      ))}
    </div>
  );
}
