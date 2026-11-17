import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type MutableRefObject,
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
  /** Controlled draft text; spoken sentences and chips are inserted into it */
  draft: string;
  onDraftChange: Dispatch<SetStateAction<string>>;
  /** Insert text at the caret (speech final or suggestion chip) */
  onDraftAppend: (text: string) => void;
  /** Receives the insert routine so speech can target the caret */
  insertTextRef: MutableRefObject<((text: string) => void) | null>;
  /** Show the suggestion chips (chat start, or right after speaking) */
  showSuggestions: boolean;
  /** Candidate sentences: corrections of the latest utterance */
  suggestions: string[];
  /** Speech input: speak instead of typing (browser speech recognition) */
  micSupported: boolean;
  micListening: boolean;
  micInterim: string;
  micErrorText: string;
  micLoadingText: string;
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
  insertTextRef,
  showSuggestions,
  suggestions,
  micSupported,
  micListening,
  micInterim,
  micErrorText,
  micLoadingText,
  onMicToggle,
  onSend,
}: ChatPanelProps) {
  const strings = getStrings(lang);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, partial]);

  // The in-progress utterance trails the editable draft as a ghost suffix.
  const liveInterim = micListening ? micInterim.trim() : '';
  const suffix = liveInterim
    ? `${draft && !draft.endsWith(' ') ? ' ' : ''}${liveInterim}`
    : '';
  const composed = `${draft}${suffix}`;

  // The box starts at 2 rows and grows with the text, up to 5 rows.
  useEffect(() => {
    const resize = () => {
      const el = inputRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
      const max = lineHeight * 5;
      el.style.height = `${Math.min(el.scrollHeight, max)}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [composed]);

  /**
   * Editor-style insert: replaces the selection (or sits at the caret), so a
   * mistyped stretch can be selected and overwritten with a suggestion, and
   * the next spoken sentence lands wherever the caret was left.
   */
  const insertAtSelection = (text: string) => {
    const value = text.trim();
    if (!value) return;
    const input = inputRef.current;
    const selStart = input?.selectionStart ?? null;
    const selEnd = input?.selectionEnd ?? null;
    const limit = draft.length;
    const start =
      selStart === null ? limit : Math.max(0, Math.min(selStart, limit));
    const end =
      selEnd === null ? start : Math.max(start, Math.min(selEnd, limit));
    const before = draft.slice(0, start);
    const after = draft.slice(end);
    const glue =
      start === end && end === limit && before && !before.endsWith(' ')
        ? ' '
        : '';
    const caret = before.length + glue.length + value.length;
    onDraftChange(`${before}${glue}${value}${after}`);
    // Keep the user's focus; park the caret right after the inserted text.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el && document.activeElement === el) {
        el.setSelectionRange(caret, caret);
      }
    });
  };

  // Speech lands while the user watches: expose the insert routine so
  // utterances go to the caret the user picked, wherever that is.
  useEffect(() => {
    insertTextRef.current = insertAtSelection;
    return () => {
      insertTextRef.current = null;
    };
  });

  /** Move focus from the mic button into the box — only when needed. */
  const focusInput = () => {
    const input = inputRef.current;
    if (!input || document.activeElement === input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    // The trailing interim suffix is not user text; edits stay in the draft.
    if (suffix && value.endsWith(suffix)) {
      onDraftChange(value.slice(0, value.length - suffix.length));
      return;
    }
    onDraftChange(value);
  };

  const sendNow = () => {
    const text = composed.trim();
    if (!text || disabled || isProcessing) return;
    onSend(text);
    onDraftChange('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendNow();
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
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              className="chip"
              disabled={disabled || isProcessing}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => onDraftAppend(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <textarea
          ref={inputRef}
          className="chat-input"
          rows={2}
          value={composed}
          onChange={handleChange}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendNow();
            }
          }}
          placeholder={
            micListening
              ? strings.chat.micListening
              : disabled && disabledHint
                ? disabledHint
                : strings.chat.placeholder
          }
          aria-label={strings.chat.message}
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="button"
          className={`mic${micListening ? ' mic-listening' : ''}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            onMicToggle();
            focusInput();
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
      {!micErrorText && micLoadingText && (
        <p className="mic-status" role="status">
          {micLoadingText}
        </p>
      )}
    </section>
  );
}
