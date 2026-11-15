import { useState } from 'react';
import { type UiLanguage, getStrings, providerLabel } from '../lib/i18n';
import { type Provider, getProvider } from '../lib/providers';
import { LanguageToggle } from './LanguageToggle';

interface StartOverlayProps {
  lang: UiLanguage;
  /** Provider saved in this browser; decides where messages go */
  provider: Provider;
  onStart: () => void;
  onLanguageChange: (language: UiLanguage) => void;
}

interface Tech {
  id: string;
  name: string;
  code: string;
}

const TECH: Tech[] = [
  {
    id: 'core',
    name: '@aituber-onair/core',
    code: `const core = new AITuberOnAirCore({
  chatProvider: 'gemini-nano',
  chatOptions: { systemPrompt },
});
core.on(AITuberOnAirCoreEvent.ASSISTANT_RESPONSE, ({ screenplay }) => {
  speak(screenplay.text, screenplay.emotion); // 'happy' など
});
await core.processChat('自己紹介して');`,
  },
  {
    id: 'voice',
    name: '@aituber-onair/voice',
    code: `const piper = new PiperPlusEngine();
piper.setAssets({
  basePath: '/piper/',
  modelFile: 'sample-voice-v2.onnx',
  modelConfigFile: 'sample-voice-v2.onnx.json',
  voiceFile: 'mei_normal.htsvoice',
});
const wav = await piper.fetchAudio({ style: 'talk', message: 'こんにちは' }, '');`,
  },
  {
    id: 'mesh',
    name: 'mesh-avatar',
    code: `const avatar = await loadMeshAvatar(canvas, '/avatar/miko-qipao.mavatar');
avatar.setSpeaking(true);
avatar.setVoiceLevel(0.6); // 音量に合わせて口が動く
avatar.setEmotion('happy'); // 表情とモーション`,
  },
  {
    id: 'nano',
    name: 'Gemini Nano',
    code: `const session = await LanguageModel.create({
  expectedInputs: [{ type: 'text', languages: ['ja'] }],
});
const reply = await session.prompt('自己紹介して');`,
  },
];

/** First screen. The tap that starts the demo also unlocks audio playback. */
export function StartOverlay({
  lang,
  provider,
  onStart,
  onLanguageChange,
}: StartOverlayProps) {
  const strings = getStrings(lang);
  const info = getProvider(provider);
  const external = info.auth !== 'none';
  const [active, setActive] = useState<Tech | null>(null);
  const [open, setOpen] = useState(false);
  const techSummaries = strings.start.techSummaries;

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-title"
    >
      <div className="overlay-card">
        <LanguageToggle lang={lang} onChange={onLanguageChange} />
        <p className="overlay-eyebrow">AITuber OnAir</p>
        <h1 id="start-title">{strings.start.title}</h1>
        <p className="overlay-text">{strings.start.lead}</p>

        <button type="button" className="start" onClick={onStart}>
          {strings.start.start}
        </button>

        <button
          type="button"
          className={`how-toggle${open ? ' how-toggle-open' : ''}`}
          aria-expanded={open}
          aria-controls="how-it-works"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="how-chevron" aria-hidden="true">
            ›
          </span>
          {strings.start.howToggle}
        </button>

        {open && (
          <div id="how-it-works" className="how-body">
            <p className="how-lead">
              {strings.start.howLead.map((line, index) => (
                <span key={line}>
                  {index > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>

            <ol className="steps" aria-label={strings.start.stepsAria}>
              {strings.start.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="step"
                  style={{ animationDelay: `${0.1 + index * 0.15}s` }}
                >
                  <span className="step-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="step-body">
                    <strong>{step.title}</strong>
                    <span>{step.detail}</span>
                  </span>
                </li>
              ))}
            </ol>

            <section className="tech" aria-label={strings.start.techAria}>
              <p className="tech-heading">{strings.start.techHeading}</p>
              <ul className="tech-list" onMouseLeave={() => setActive(null)}>
                {TECH.map((tech, index) => (
                  <li key={tech.id}>
                    <button
                      type="button"
                      className={`tech-chip${active?.id === tech.id ? ' tech-chip-active' : ''}`}
                      style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                      onMouseEnter={() => setActive(tech)}
                      onFocus={() => setActive(tech)}
                      onClick={() => setActive(tech)}
                      aria-pressed={active?.id === tech.id}
                    >
                      <code>{tech.name}</code>
                      <span>
                        {techSummaries[tech.id as keyof typeof techSummaries]}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="tech-code" aria-live="polite">
                {active ? (
                  <pre key={active.id} className="code-pop">
                    <code>{active.code}</code>
                  </pre>
                ) : (
                  <p className="tech-hint">{strings.start.techHint}</p>
                )}
              </div>
            </section>
          </div>
        )}

        <p className="overlay-note">
          {strings.start.noteSound}
          {external
            ? strings.start.noteExternal(providerLabel(provider, lang))
            : strings.start.noteLocal}
        </p>
      </div>
    </div>
  );
}
