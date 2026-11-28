// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTts } from '../src/hooks/useTts';

const mocks = vi.hoisted(() => ({
  pending: [] as { resolve: () => void; reject: (error: Error) => void }[],
  stop: vi.fn(),
  fetchAudio: vi.fn(async () => new ArrayBuffer(8)),
}));

vi.mock('@aituber-onair/core', () => ({
  WebSpeechEngine: class {
    speakDirectly() {
      return new Promise<void>((resolve, reject) => {
        mocks.pending.push({ resolve, reject });
      });
    }
    stopSpeaking() {
      mocks.stop();
    }
  },
  PiperPlusEngine: class {
    static isAvailable() {
      return true;
    }
    setAssets() {}
    setNoiseScale() {}
    async initialize() {}
    setSpeed() {}
    fetchAudio() {
      return mocks.fetchAudio();
    }
    async dispose() {}
  },
}));
vi.mock('../src/lib/webSpeechVoice', () => ({
  SPEECH_LANG: { en: 'en-US', vi: 'vi-VN', ja: 'ja-JP' },
  pickVoiceFor: () => undefined,
}));

const play = vi.fn<() => Promise<void>>();
const stopPlayback = vi.fn();
const envelope = { start: vi.fn(), stop: vi.fn() };
let latest: ReturnType<typeof useTts>;
let root: Root;
let container: HTMLDivElement;

function Probe() {
  const tts = useTts({
    play,
    stopPlayback,
    setPlaybackVolume: vi.fn(),
    pausePlayback: vi.fn(),
    resumePlayback: vi.fn(),
    envelope,
  });
  useEffect(() => {
    latest = tts;
  }, [tts]);
  return <div data-testid="caption">{tts.speechCaption}</div>;
}

const webOptions = { voice: 'webSpeech', lang: 'en' } as const;
const piperOptions = { voice: 'piperPlus', lang: 'ja' } as const;

beforeEach(async () => {
  vi.useFakeTimers();
  mocks.pending.length = 0;
  mocks.stop.mockClear();
  mocks.fetchAudio.mockClear();
  play.mockReset();
  stopPlayback.mockClear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('speechSynthesis', { resume: vi.fn(), pause: vi.fn() });
  vi.stubGlobal('SpeechSynthesisUtterance', class {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true })),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Probe />));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('speech captions', () => {
  it('shows cleaned reply while speaking, keeps it on pause and clears on finish', async () => {
    await act(async () => {
      void latest.speak('[happy] Hello there! 😊', webOptions);
      await Promise.resolve();
    });
    expect(latest.speechCaption).toBe('Hello there!');
    expect(container.textContent).toBe('Hello there!');
    await act(async () => latest.pause());
    expect(latest.speechCaption).toBe('Hello there!');
    await act(async () => latest.resume());
    await act(async () => mocks.pending[0].resolve());
    expect(latest.speechCaption).toBe('');
  });

  it('clears on stop and shows the same reply again on replay', async () => {
    await act(async () => {
      void latest.speak('A message', webOptions);
      await Promise.resolve();
    });
    await act(async () => latest.stop());
    expect(latest.speechCaption).toBe('');
    await act(async () => {
      latest.replay();
      await Promise.resolve();
    });
    expect(latest.speechCaption).toBe('A message');
    await act(async () => mocks.pending[1].resolve());
    expect(latest.speechCaption).toBe('');
  });

  it('does not let an interrupted reply clear or stop its replacement', async () => {
    await act(async () => {
      void latest.speak('Old', webOptions);
      await Promise.resolve();
    });
    await act(async () => {
      void latest.speak('New reply', webOptions);
      await Promise.resolve();
    });
    await act(async () => mocks.pending[0].resolve());
    expect(latest.speechCaption).toBe('New reply');
    await act(async () => mocks.pending[1].resolve());
    expect(latest.speechCaption).toBe('');
  });

  it('does not let an old timeout stop a newer reply', async () => {
    await act(async () => {
      void latest.speak('Old', webOptions);
      await Promise.resolve();
    });
    await act(async () => {
      void latest.speak('A much longer replacement', webOptions);
      await Promise.resolve();
    });
    const stopCount = mocks.stop.mock.calls.length;
    await act(async () => vi.advanceTimersByTime(5050));
    expect(mocks.stop).toHaveBeenCalledTimes(stopCount);
    expect(latest.speechCaption).toBe('A much longer replacement');
    await act(async () => mocks.pending[1].resolve());
  });

  it('does not show a Piper caption if stopped during synthesis', async () => {
    let finishSynthesis!: (buffer: ArrayBuffer) => void;
    mocks.fetchAudio.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSynthesis = resolve;
        }),
    );
    await act(async () => latest.preparePiper());
    await act(async () => {
      void latest.speak('こんにちは。', piperOptions);
      await Promise.resolve();
    });
    expect(latest.speechCaption).toBe('');
    await act(async () => latest.stop());
    await act(async () => finishSynthesis(new ArrayBuffer(8)));
    expect(latest.speechCaption).toBe('');
    expect(play).not.toHaveBeenCalled();
  });

  it('clears captions when speech fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      void latest.speak('Broken', webOptions);
      await Promise.resolve();
    });
    await act(async () => mocks.pending[0].reject(new Error('failed')));
    expect(latest.speechCaption).toBe('');
    warn.mockRestore();
  });

  it('waits for Piper audio before showing captions and clears when it ends', async () => {
    let finish!: () => void;
    play.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await act(async () => latest.preparePiper());
    await act(async () => {
      void latest.speak('こんにちは。', piperOptions);
      await Promise.resolve();
    });
    expect(latest.speechCaption).toBe('こんにちは。');
    await act(async () => finish());
    expect(latest.speechCaption).toBe('');
  });
});
