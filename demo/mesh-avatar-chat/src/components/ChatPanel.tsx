import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useRef,
} from 'react';
import type { ChatMessage } from '../hooks/useChatCore';
import { type UiLanguage, getStrings } from '../lib/i18n';

interface ChatPanelProps {
  lang: UiLanguage;
  messages: ChatMessage[];
  partial: string;
  isProcessing: boolean;
  error: string;
  disabled: boolean;
  /** Shown in the input while the page cannot take messages yet */
  disabledHint?: string;
  /** Controlled draft text; spoken sentences accumulate here too */
  draft: string;
  onDraftChange: Dispatch<SetStateAction<string>>;
  /** Append text (speech final or sample chip); moves the caret to the end */
  onDraftAppend: (text: string) => void;
  /** Show the sample-sentence chips (chat start, or right after speaking) */
  showSuggestions: boolean;
  /** Bumped on every append; drives the caret back into the input */
  appendSeq: number;
  /** Speech input: speak instead of typing (browser speech recognition) */
  micSupported: boolean;
  micListening: boolean;
  micInterim: string;
  micErrorText: string;
  onMicToggle: () => void;
  onSend: (text: string) => void;
}

export function ChatPanel({
  lang,
  messages,
  partial,
  isProcessing,
  error,
  disabled,
  disabledHint,
  draft,
  onDraftChange,
  onDraftAppend,
  showSuggestions,
  appendSeq,
  micSupported,
  micListening,
  micInterim,
  micErrorText,
  onMicToggle,
  onSend,
}: ChatPanelProps) {
  const strings = getStrings(lang);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, partial]);

  // Speech lands hands-free: keep the caret in the box so the user can keep
  // talking (sentence 2, 3...) and press Send when ready.
  useEffect(() => {
    if (appendSeq === 0) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [appendSeq]);

  const liveInterim = micListening ? micInterim.trim() : '';
  const composed = liveInterim
    ? draft.trim()
      ? `${draft.trim()} ${liveInterim}`
      : liveInterim
    : draft;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = composed.trim();
    if (!text || disabled || isProcessing) return;
    onSend(text);
    onDraftChange('');
  };

  const micLabel = micListening
    ? strings.chat.micStop
    : micSupported
      ? strings.chat.micListen
      : strings.chat.micUnsupported;

  return (
    <section className="chat" aria-label={strings.chat.label}>
      <div ref={listRef} className="chat-log" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`bubble bubble-${message.role}`}>
            {message.text}
          </div>
        ))}
        {isProcessing && (
          <div className="bubble bubble-assistant bubble-partial">
            {partial || strings.chat.thinking}
          </div>
        )}
        {error && <div className="chat-error">{error}</div>}
      </div>
      {showSuggestions && (
        <div className="suggestions">
          {strings.chat.suggestions.map((text) => (
            <button
              key={text}
              type="button"
              className="chip"
              disabled={disabled || isProcessing}
              onClick={() => onDraftAppend(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          ref={inputRef}
          className="chat-input"
          value={composed}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={
            micListening
              ? strings.chat.micListening
              : disabled && disabledHint
                ? disabledHint
                : strings.chat.placeholder
          }
          aria-label={strings.chat.message}
          disabled={disabled}
          readOnly={micListening}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="button"
          className={`mic${micListening ? ' mic-listening' : ''}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            onMicToggle();
            inputRef.current?.focus();
          }}
          disabled={
            !micListening && (disabled || !micSupported || isProcessing)
          }
          title={micLabel}
          aria-label={micLabel}
          aria-pressed={micListening}
        >
          {micListening ? (
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="7" y="7" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <line x1="12" y1="18" x2="12" y2="21" />
            </svg>
          )}
        </button>
        <button
          type="submit"
          className="send"
          disabled={disabled || isProcessing || !composed.trim()}
        >
          {strings.chat.send}
        </button>
      </form>
      {micErrorText && (
        <p className="mic-status" role="status">
          {micErrorText}
        </p>
      )}
    </section>
  );
}
