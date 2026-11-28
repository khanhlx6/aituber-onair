import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { FreeVoiceToggle } from './components/FreeVoiceToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { MeshAvatarCanvas } from './components/MeshAvatarCanvas';
import { QrShareButton } from './components/QrShareButton';
import { SettingsSheet } from './components/SettingsSheet';
import { StartOverlay } from './components/StartOverlay';
import { type VoiceMode, VoiceStage } from './components/VoiceStage';
import { useAudioMotion } from './hooks/useAudioMotion';
import { type AssistantReply, useChatCore } from './hooks/useChatCore';
import { useGeminiNano } from './hooks/useGeminiNano';
import { type DemoSettings, useSettings } from './hooks/useSettings';
import { useSpeechEnvelope } from './hooks/useSpeechEnvelope';
import { useSpeechInput } from './hooks/useSpeechInput';
import { useSpeechSuggestions } from './hooks/useSpeechSuggestions';
import { useTts } from './hooks/useTts';
import { type UiLanguage, getStrings } from './lib/i18n';
import { listVoicesFor } from './lib/webSpeechVoice';

/** Phones and metered connections should not download about 150MB on their own. */
function shouldAutoPreparePiper(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  if (connection?.saveData) return false;
  if (window.matchMedia('(pointer: coarse)').matches) return false;
  return window.innerWidth >= 760;
}

export default function App() {
  const {
    settings,
    updateUi,
    updateLlm,
    updateTts,
    updateStt,
    setApiKey,
    setOpenaiCompatible,
    clearStored,
    apiKey,
  } = useSettings();
  const nano = useGeminiNano();
  const audioMotion = useAudioMotion();
  const envelope = useSpeechEnvelope();
  const tts = useTts({
    play: audioMotion.play,
    stopPlayback: audioMotion.stop,
    setPlaybackVolume: audioMotion.setVolume,
    pausePlayback: audioMotion.pause,
    resumePlayback: audioMotion.resume,
    envelope,
  });
  const [started, setStarted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [emotion, setEmotion] = useState<{ tag: string; seq: number } | null>(
    null,
  );
  const [justSwitched, setJustSwitched] = useState(false);
  /** The visitor chose to talk with the browser voice before Miko's was ready */
  const [webSpeechEarly, setWebSpeechEarly] = useState(false);
  const autoSwitchedRef = useRef(false);
  /** True once Miko's voice took over; after that, the browser voice is an explicit choice */
  const [autoSwitched, setAutoSwitched] = useState(false);
  const greetedRef = useRef(false);
  const emotionSeqRef = useRef(0);
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const lang = settings.ui.language;
  const strings = useMemo(() => getStrings(lang), [lang]);
  const systemPrompt = strings.prompt.system;
  /** The Miko voice model speaks Japanese only */
  const mikoVoice = lang === 'ja';

  const nanoReady = nano.status === 'available';

  const speakReply = useCallback(
    (reply: AssistantReply) => {
      if (reply.emotion) {
        emotionSeqRef.current += 1;
        setEmotion({ tag: reply.emotion, seq: emotionSeqRef.current });
      }
      const current = settingsRef.current.tts;
      if (!current.enabled) return;
      void tts.speak(reply.text, {
        voice: current.engine,
        lang,
        webSpeechVoice: current.webSpeechVoice,
        piperSpeed: current.piperSpeed,
      });
    },
    [tts, lang],
  );

  /** Speaks any text on demand (per-message speaker button, replay). */
  const speakText = useCallback(
    (text: string) => {
      const current = settingsRef.current.tts;
      void tts.speak(text, {
        voice: current.engine,
        lang,
        webSpeechVoice: current.webSpeechVoice,
        piperSpeed: current.piperSpeed,
      });
    },
    [tts, lang],
  );

  const fallbackReply = useMemo<AssistantReply>(
    () => ({ text: strings.prompt.fallback, emotion: 'sad' }),
    [strings],
  );

  const chat = useChatCore({
    provider: settings.llm.provider,
    lang,
    apiKey,
    openaiCompatible: settings.llm.openaiCompatible,
    nanoReady,
    systemPrompt,
    fallbackReply,
    onReply: speakReply,
  });

  useEffect(() => {
    void listVoicesFor(lang).then(tts.setVoices);
  }, [lang, tts.setVoices]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = strings.app.docTitle;
  }, [lang, strings]);

  /** Switching language also resets the browser-voice choice (voice names differ per language). */
  const handleUpdateUi = useCallback(
    (patch: Partial<DemoSettings['ui']>) => {
      if (patch.language && patch.language !== lang) {
        // Voice names differ per language; the Miko voice is Japanese-only.
        updateTts(
          patch.language === 'ja'
            ? { webSpeechVoice: '' }
            : { engine: 'webSpeech', webSpeechVoice: '' },
        );
      }
      updateUi(patch);
    },
    [lang, updateTts, updateUi],
  );

  const handleLanguageChange = useCallback(
    (language: UiLanguage) => handleUpdateUi({ language }),
    [handleUpdateUi],
  );

  /** Free browser-voice toggle: off means replies appear as text only. */
  const handleVoiceEnabledChange = useCallback(
    (enabled: boolean) => {
      updateTts({ enabled });
      if (!enabled) tts.stop();
    },
    [tts, updateTts],
  );

  const voiceMode: VoiceMode = !mikoVoice
    ? 'web'
    : settings.tts.engine === 'piperPlus' && tts.piperReady
      ? 'piper'
      : webSpeechEarly || (autoSwitched && settings.tts.engine === 'webSpeech')
        ? 'web'
        : 'waiting';

  const handleStart = useCallback(() => {
    setStarted(true);
    if (nano.status === 'available') nano.warmUp();
    // The 150MB Miko voice download only makes sense for Japanese.
    if (mikoVoice && shouldAutoPreparePiper()) void tts.preparePiper();
  }, [nano, tts, mikoVoice]);

  // Miko greets once, with whichever voice becomes usable first: her own when
  // it is ready, or the browser voice if the visitor asked not to wait.
  useEffect(() => {
    if (!started || greetedRef.current || voiceMode === 'waiting') return;
    greetedRef.current = true;
    const greeting = chat.canChat
      ? { text: strings.prompt.greetingReady, emotion: 'happy' }
      : { text: strings.prompt.greetingNoModel, emotion: 'happy' };
    chat.addAssistantMessage(greeting.text);
    speakReply(greeting);
  }, [started, voiceMode, chat, speakReply, strings]);

  // The Miko voice takes over once, as soon as it is ready; the visitor can
  // still go back to the browser voice from the settings.
  useEffect(() => {
    if (!started || !mikoVoice || !tts.piperReady || autoSwitchedRef.current)
      return;
    autoSwitchedRef.current = true;
    updateTts({ engine: 'piperPlus' });
    const mark = window.setTimeout(() => setAutoSwitched(true), 0);
    if (!webSpeechEarly) return () => window.clearTimeout(mark);
    const show = window.setTimeout(() => setJustSwitched(true), 0);
    const hide = window.setTimeout(() => setJustSwitched(false), 6000);
    return () => {
      window.clearTimeout(mark);
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [started, mikoVoice, tts.piperReady, updateTts, webSpeechEarly]);

  const handleUseWebSpeech = useCallback(() => {
    setWebSpeechEarly(true);
    updateTts({ engine: 'webSpeech' });
  }, [updateTts]);

  const handleUsePiper = useCallback(() => {
    updateTts({ engine: 'piperPlus' });
  }, [updateTts]);

  const handleReset = useCallback(() => {
    tts.stop();
    chat.reset();
    setSettingsOpen(false);
  }, [chat, tts]);

  const voiceLevel = Math.max(audioMotion.voiceLevel, envelope.level);
  const isSpeaking = audioMotion.isSpeaking || envelope.active;
  const [draft, setDraft] = useState('');
  const [suggestFromSpeech, setSuggestFromSpeech] = useState(false);
  /** ChatPanel registers its insert-at-caret routine here */
  const insertTextRef = useRef<((text: string) => void) | null>(null);

  const appendToDraft = useCallback((text: string) => {
    const value = text.trim();
    if (!value) return;
    const insert = insertTextRef.current;
    if (insert) {
      insert(value);
      return;
    }
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${value}` : value));
  }, []);

  const suggest = useSpeechSuggestions({
    lang,
    provider: settings.llm.provider,
    apiKey,
    openaiCompatible: settings.llm.openaiCompatible,
    nanoReady,
  });

  const speechInput = useSpeechInput({
    lang,
    engine: settings.stt.engine,
    whisperModel: settings.stt.whisperModel,
    onFinal: (text) => {
      appendToDraft(text);
      setSuggestFromSpeech(true);
      suggest.request(text);
    },
    stopSpeaking: () => tts.stop(),
  });
  const { stop: stopMic } = speechInput;
  const micErrorText = speechInput.error
    ? speechInput.error === 'permission-denied'
      ? strings.chat.micErrorPermission
      : speechInput.error === 'no-speech'
        ? strings.chat.micErrorNoSpeech
        : strings.chat.micError
    : '';
  const micLoadingText = speechInput.loadProgress
    ? strings.chat.micModelLoading(
        speechInput.loadProgress.phase === 'download'
          ? Math.round((speechInput.loadProgress.progress ?? 0) * 100)
          : null,
      )
    : '';

  const handleSend = useCallback(
    (text: string) => {
      stopMic();
      setSuggestFromSpeech(false);
      suggest.clear();
      void chat.send(text);
    },
    [stopMic, suggest, chat],
  );

  const chatDisabled = !started || voiceMode === 'waiting';

  const nanoBanner = useMemo(() => {
    if (settings.llm.provider !== 'gemini-nano') return null;
    if (nano.status === 'downloadable') {
      return (
        <div className="banner">
          <span>{strings.app.nanoPrepareLead}</span>
          <button type="button" className="link" onClick={nano.prepare}>
            {strings.app.nanoPrepare}
          </button>
        </div>
      );
    }
    if (nano.status === 'downloading') {
      return (
        <div className="banner">
          <span className="spinner" aria-hidden="true" />
          <span>{strings.app.nanoDownloading(nano.progress)}</span>
        </div>
      );
    }
    return null;
  }, [
    nano.prepare,
    nano.progress,
    nano.status,
    settings.llm.provider,
    strings,
  ]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">AITuber OnAir</span>
        <nav className="topbar-links" aria-label={strings.app.navLinks}>
          <LanguageToggle lang={lang} onChange={handleLanguageChange} />
          <QrShareButton lang={lang} />
          <button
            type="button"
            className="icon-button"
            onClick={() => setSettingsOpen(true)}
            aria-label={strings.app.settings}
            title={strings.app.settings}
          >
            ⚙
          </button>
        </nav>
      </header>

      <main className="stage">
        <section
          className="avatar-pane"
          aria-label={strings.app.avatar}
          data-speaking={isSpeaking ? 'true' : 'false'}
        >
          <div className="avatar-display">
            <MeshAvatarCanvas
              voiceLevel={voiceLevel}
              isSpeaking={isSpeaking}
              emotion={emotion}
            />
            {showCaptions && tts.speechCaption && (
              <div className="speech-caption" aria-hidden="true">
                {tts.speechCaption}
              </div>
            )}
          </div>
          <div className="voice-toggle-row">
            <FreeVoiceToggle
              lang={lang}
              enabled={settings.tts.enabled}
              onChange={handleVoiceEnabledChange}
            />
            <button
              type="button"
              className="caption-toggle"
              aria-pressed={showCaptions}
              onClick={() => setShowCaptions((visible) => !visible)}
            >
              {strings.voice.captions}
            </button>
          </div>
          <VoiceStage
            lang={lang}
            mikoVoice={mikoVoice}
            mode={voiceMode}
            piperStatus={tts.piperStatus}
            piperProgress={tts.piperProgress}
            justSwitched={justSwitched}
            onPrepare={() => void tts.preparePiper()}
            onUseWebSpeech={handleUseWebSpeech}
            onUsePiper={handleUsePiper}
          />
        </section>
        <section className="chat-pane">
          {nanoBanner}
          <ChatPanel
            lang={lang}
            messages={chat.messages}
            partial={chat.partial}
            isProcessing={chat.isProcessing}
            error={chat.error}
            disabled={chatDisabled}
            disabledHint={strings.app.chatDisabledHint}
            draft={draft}
            onDraftChange={setDraft}
            onDraftAppend={appendToDraft}
            insertTextRef={insertTextRef}
            showSuggestions={chat.messages.length <= 1 || suggestFromSpeech}
            suggestions={
              suggest.items.length > 0
                ? suggest.items
                : strings.chat.suggestions
            }
            micSupported={speechInput.supported}
            micListening={speechInput.listening}
            micInterim={speechInput.interim}
            micErrorText={micErrorText}
            micLoadingText={micLoadingText}
            onMicToggle={speechInput.toggle}
            speaking={isSpeaking}
            speechPaused={tts.speechPaused}
            hasSpeechReplay={tts.hasReplay}
            speechVolume={tts.speechVolume}
            speechRate={tts.speechRate}
            onSpeakMessage={speakText}
            onReplay={tts.replay}
            onPauseResume={() => {
              if (tts.speechPaused) tts.resume();
              else tts.pause();
            }}
            onStopSpeaking={tts.stop}
            onVolumeChange={tts.setSpeechVolume}
            onRateChange={tts.setSpeechRate}
            onSend={handleSend}
          />
        </section>
      </main>

      {!started && (
        <StartOverlay
          lang={lang}
          provider={settings.llm.provider}
          voiceEnabled={settings.tts.enabled}
          onStart={handleStart}
          onLanguageChange={handleLanguageChange}
          onVoiceEnabledChange={handleVoiceEnabledChange}
        />
      )}
      {settingsOpen && (
        <SettingsSheet
          lang={lang}
          settings={settings}
          nano={nano}
          piperStatus={tts.piperStatus}
          voices={tts.voices}
          onUpdateUi={handleUpdateUi}
          onUpdateLlm={updateLlm}
          onUpdateTts={updateTts}
          onUpdateStt={updateStt}
          onSetApiKey={setApiKey}
          onSetOpenaiCompatible={setOpenaiCompatible}
          onPreparePiper={() => void tts.preparePiper()}
          onVoiceEnabledChange={handleVoiceEnabledChange}
          onReset={handleReset}
          onClearStored={clearStored}
          onClearVoiceCache={tts.clearPiperCache}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
