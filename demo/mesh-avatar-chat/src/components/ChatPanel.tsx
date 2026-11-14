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
    if (!text || disabled || isProcessing) return;
    onSend(text);
    setDraft('');
  };

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
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            disabled && disabledHint ? disabledHint : strings.chat.placeholder
          }
          aria-label={strings.chat.message}
          disabled={disabled}
          autoComplete="off"
          enterKeyHint="send"
        />
        <button
          type="submit"
          className="send"
          disabled={disabled || isProcessing || !draft.trim()}
        >
          {strings.chat.send}
        </button>
      </form>
    </section>
  );
}
