import { type FormEvent, useEffect, useRef, useState } from 'react';
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
  micSupported,
  micListening,
  micInterim,
  micErrorText,
  onMicToggle,
  onSend,
}: ChatPanelProps) {
  const strings = getStrings(lang);
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, partial]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled || isProcessing || micListening) return;
    onSend(text);
    setDraft('');
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
      {messages.length <= 1 && (
        <div className="suggestions">
          {strings.chat.suggestions.map((text) => (
            <button
              key={text}
              type="button"
              className="chip"
              disabled={disabled || isProcessing}
              onClick={() => onSend(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <input
          className="chat-input"
          value={micListening ? micInterim : draft}
          onChange={(event) => setDraft(event.target.value)}
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
          onClick={onMicToggle}
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
          disabled={disabled || isProcessing || micListening || !draft.trim()}
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
