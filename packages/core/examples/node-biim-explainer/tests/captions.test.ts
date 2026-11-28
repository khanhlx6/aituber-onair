import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  formatTimestamp,
  timelineCues,
  toAss,
  toSrt,
  toVtt,
} from '../src/captions.js';
import { runCli } from '../src/gen/cli.js';
import { estimateDurations, resolveTimeline } from '../src/timeline.js';
import type { BiimScript, Timeline } from '../src/types.js';

async function fixture(): Promise<BiimScript> {
  return JSON.parse(await readFile('samples/biim-hello-sine.json', 'utf8'));
}

async function estimatedTimeline(): Promise<{
  script: BiimScript;
  timeline: Timeline;
}> {
  const script = await fixture();
  return {
    script,
    timeline: resolveTimeline(script, estimateDurations(script, 8), true),
  };
}

describe('caption timestamps', () => {
  it('formats hours, minutes, seconds and milliseconds with the requested separator', () => {
    expect(formatTimestamp(0, ',')).toBe('00:00:00,000');
    expect(formatTimestamp(1_234, ',')).toBe('00:00:01,234');
    expect(formatTimestamp(3_723_045, ',')).toBe('01:02:03,045');
    expect(formatTimestamp(3_723_045, '.')).toBe('01:02:03.045');
    expect(formatTimestamp(-5, ',')).toBe('00:00:00,000');
    expect(formatTimestamp(999.6, '.')).toBe('00:00:01.000');
  });
});

describe('caption cues from a timeline', () => {
  it('emits one cue per rendered subtitle page, in order, without overlaps', async () => {
    const { timeline } = await estimatedTimeline();
    const cues = timelineCues(timeline);
    const pages = timeline.lines.flatMap((line) => line.pages);

    expect(cues.length).toBeGreaterThan(0);
    expect(cues).toHaveLength(pages.length);
    for (const [i, cue] of cues.entries()) {
      expect(cue.endMs).toBeGreaterThan(cue.startMs);
      expect(cue.text).not.toContain('-->');
      if (i) expect(cue.startMs).toBeGreaterThanOrEqual(cues[i - 1].endMs);
    }
    expect(cues[0].startMs).toBe(0);
    // Cue text is the rendered page, so captions match the burned-in frames.
    for (const [i, page] of pages.entries())
      expect(cues[i].text).toBe(page.rows.join('\n'));
  });

  it('prefixes the speaker name only when requested', async () => {
    const { timeline } = await estimatedTimeline();
    const plain = timelineCues(timeline);
    const named = timelineCues(timeline, { names: { dango: 'だんご' } });

    expect(plain[0].text.startsWith('だんご: ')).toBe(false);
    expect(named[0].text.startsWith('だんご: ')).toBe(true);
    expect(named).toHaveLength(plain.length);
    expect(named[0].text.split('\n')).toHaveLength(
      plain[0].text.split('\n').length,
    );
  });

  it('keeps silence between lines instead of stretching cues across it', async () => {
    const { script } = await estimatedTimeline();
    script.lines[1].at = '@intro-1:end+1.5';
    const timeline = resolveTimeline(
      script,
      estimateDurations(script, 8),
      true,
    );
    const cues = timelineCues(timeline);
    const firstPageEnd = Math.round(
      (timeline.lines[0].pages.at(-1) as { end: number }).end * 1000,
    );
    const secondPageStart = Math.round(timeline.lines[1].pages[0].start * 1000);

    expect(secondPageStart - firstPageEnd).toBeGreaterThanOrEqual(1500);
    const gap = cues.find(
      (cue, i) => i > 0 && cue.startMs - cues[i - 1].endMs > 1000,
    );
    expect(gap).toBeDefined();
  });

  it('gives a zero-length page a one millisecond cue instead of dropping it', () => {
    const timeline = {
      estimated: false,
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 1,
      lines: [
        {
          index: 0,
          speaker: 'a',
          text: 'x',
          spoken: true,
          start: 0,
          end: 1,
          pages: [{ start: 0.5, end: 0.5, rows: ['same'] }],
        },
      ],
      main: [],
      panels: [],
      effects: [],
    } as unknown as Timeline;
    const [cue] = timelineCues(timeline);
    expect(cue.endMs - cue.startMs).toBe(1);
  });
});

describe('caption serialization', () => {
  it('writes numbered SRT blocks and a WebVTT header', async () => {
    const { timeline } = await estimatedTimeline();
    const cues = timelineCues(timeline);
    const srt = toSrt(cues);
    const vtt = toVtt(cues);

    expect(srt.startsWith('1\n00:00:00,000 --> ')).toBe(true);
    expect(srt.endsWith('\n')).toBe(true);
    expect(srt).toContain('\n\n2\n');
    expect(vtt.startsWith('WEBVTT\n\n1\n00:00:00.000 --> ')).toBe(true);
    expect(vtt).not.toMatch(/\d{2},\d{3}/);
    expect(srt.trimEnd().split('\n\n')).toHaveLength(cues.length);
    expect(vtt.trimEnd().split('\n\n')).toHaveLength(cues.length + 1);
  });

  it('writes ASS style, canvas dimensions, centisecond timing, and escaped text', () => {
    const ass = toAss(
      [
        {
          startMs: 59_996,
          endMs: 3_723_045,
          text: 'A, B\n第二行 {\\pos(0,0)} \\N',
        },
        { startMs: 3_723_045, endMs: 3_723_046, text: 'short' },
        { startMs: 3_723_046, endMs: 3_723_047, text: 'next' },
      ],
      { width: 1440, height: 1080 },
    );
    expect(ass).toContain('PlayResX: 1440\nPlayResY: 1080');
    expect(ass).toContain('[V4+ Styles]');
    expect(ass).toContain('Style: Default,Noto Sans CJK JP,42,');
    expect(ass).toContain('[Events]\nFormat: Layer, Start, End,');
    expect(ass).toContain(
      'Dialogue: 0,0:01:00.00,1:02:03.05,Default,,0,0,0,,A, B\\N第二行 ｛＼pos(0,0)｝ ＼N\n',
    );
    expect(ass).toContain(
      'Dialogue: 0,1:02:03.05,1:02:03.06,Default,,0,0,0,,short\n',
    );
    expect(ass).toContain(
      'Dialogue: 0,1:02:03.06,1:02:03.07,Default,,0,0,0,,next\n',
    );
    expect(toAss([], { width: 1920, height: 1080 })).not.toContain('Dialogue:');
  });

  it('produces an empty SRT body and a header-only WebVTT for no cues', () => {
    expect(toSrt([])).toBe('');
    expect(toVtt([])).toBe('WEBVTT\n');
  });

  it('never emits the cue delimiter inside cue text', () => {
    const timeline = {
      estimated: false,
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 2,
      lines: [
        {
          index: 0,
          speaker: 'a',
          text: 'x',
          spoken: true,
          start: 0,
          end: 2,
          pages: [{ start: 0, end: 2, rows: ['A --> B'] }],
        },
      ],
      main: [],
      panels: [],
      effects: [],
    } as unknown as Timeline;
    expect(timelineCues(timeline)[0].text).toBe('A → B');
  });
});

describe('captions CLI command', () => {
  it('writes selected sidecars, preserves both as the default, and reports cue counts', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'biim-captions-'));
    try {
      const input = path.join(dir, 'script.json');
      const script = await fixture();
      // Absolute image paths keep the rewritten script valid outside samples/.
      script.speakers.dango.image = path.resolve('assets/yukkuri/dango');
      script.lines = script.lines.map((line, i) => ({
        ...line,
        spoken: false,
        duration: 1 + i / 2,
      }));
      script.main = [{ at: 0, color: '#14283d' }];
      script.panels = [];
      script.timer = undefined;
      script.counter = undefined;
      script.output = 'out.mp4';
      await writeFile(input, JSON.stringify(script));

      const output = path.join(dir, 'work', 'subs');
      const lines: string[] = [];
      const log = vi
        .spyOn(console, 'log')
        .mockImplementation((message: string) => {
          lines.push(message);
        });
      try {
        await runCli(['captions', input, '--out', output, '--estimate']);
      } finally {
        log.mockRestore();
      }

      const srt = await readFile(`${output}.srt`, 'utf8');
      const vtt = await readFile(`${output}.vtt`, 'utf8');
      expect(srt.startsWith('1\n00:00:00,000 --> ')).toBe(true);
      expect(vtt.startsWith('WEBVTT\n')).toBe(true);
      expect(lines).toContain(`${output}.srt`);
      expect(lines).toContain(`${output}.vtt`);
      expect(lines.at(-1)).toMatch(/^Wrote \d+ cues from estimated timing\.$/);
      await expect(readFile(`${output}.ass`, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });

      const assOnly = path.join(dir, 'ass-only');
      await runCli([
        'captions',
        input,
        '--out',
        assOnly,
        '--estimate',
        '--format',
        'ass',
        '--names',
      ]);
      const ass = await readFile(`${assOnly}.ass`, 'utf8');
      expect(ass).toContain('[Events]');
      expect(ass).toContain('だんご: ');
      await expect(readFile(`${assOnly}.srt`, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });
      await expect(readFile(`${assOnly}.vtt`, 'utf8')).rejects.toMatchObject({
        code: 'ENOENT',
      });

      const all = path.join(dir, 'all');
      await runCli([
        'captions',
        input,
        '--out',
        all,
        '--estimate',
        '--format',
        'all',
      ]);
      for (const ext of ['srt', 'vtt', 'ass'])
        expect(await readFile(`${all}.${ext}`, 'utf8')).not.toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects caption-only flags on other commands and unknown formats', async () => {
    const input = 'samples/biim-hello-sine.json';
    await expect(
      runCli(['validate', input, '--format', 'srt']),
    ).rejects.toThrow('--format and --names are only valid for captions');
    await expect(runCli(['validate', input, '--names'])).rejects.toThrow(
      '--format and --names are only valid for captions',
    );
    await expect(
      runCli(['captions', input, '--format', 'invalid']),
    ).rejects.toThrow('--format must be srt, vtt, ass, both or all');
    await expect(
      runCli(['validate', input, '--format', 'both']),
    ).rejects.toThrow('--format and --names are only valid for captions');
  });
});
