import type { Timeline } from './types.js';

/**
 * Subtitle sidecars (SRT / WebVTT / ASS) derived from a resolved timeline.
 *
 * Cues follow the rendered subtitle pages, so the exported captions follow the same page intervals as the rendered text.
 * Export formats have their own timestamp precision. Page timing already
 * accounts for real speech audio in `plan`/`gen`, and for the estimate rate in
 * `captions --estimate`.
 *
 * Times are kept as integer milliseconds to make rounding deterministic across
 * platforms; SRT and WebVTT use different decimal separators, while ASS
 * timestamps are rounded to centiseconds.
 */
export interface CaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

export type CaptionFormat = 'srt' | 'vtt' | 'ass' | 'both' | 'all';

export interface CaptionOptions {
  /** Prefix every cue with the speaker display name, for dialogues. */
  names?: Record<string, string>;
}

/** Text must not contain the cue timing delimiter, or parsers split the cue. */
function sanitize(text: string): string {
  return text.replace(/-->/g, '→');
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** Format integer milliseconds as `HH:MM:SS,mmm` (SRT) or `HH:MM:SS.mmm`. */
export function formatTimestamp(
  milliseconds: number,
  separator: ',' | '.',
): string {
  const total = Math.max(0, Math.round(milliseconds));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${separator}${pad(total % 1000, 3)}`;
}

/** One cue per rendered subtitle page; gaps between lines are preserved. */
export function timelineCues(
  timeline: Timeline,
  options: CaptionOptions = {},
): CaptionCue[] {
  const cues: CaptionCue[] = [];
  for (const line of timeline.lines) {
    const name = options.names?.[line.speaker];
    for (const page of line.pages) {
      const rows = page.rows.map((row) => row.trim()).filter(Boolean);
      if (!rows.length) continue;
      if (name) rows[0] = `${name}: ${rows[0]}`;
      const previous = cues[cues.length - 1];
      const startMs = Math.max(
        Math.round(page.start * 1000),
        previous ? previous.endMs : 0,
      );
      // Zero-length cues are invalid; keep at least one millisecond.
      const endMs = Math.max(Math.round(page.end * 1000), startMs + 1);
      cues.push({ startMs, endMs, text: sanitize(rows.join('\n')) });
    }
  }
  return cues;
}

function blocks(cues: CaptionCue[], separator: ',' | '.'): string[] {
  return cues.map(
    (cue, index) =>
      `${index + 1}\n${formatTimestamp(cue.startMs, separator)} --> ${formatTimestamp(cue.endMs, separator)}\n${cue.text}`,
  );
}

/** SubRip file content, numbered from 1 and newline-terminated. */
export function toSrt(cues: CaptionCue[]): string {
  const body = blocks(cues, ',');
  return body.length ? `${body.join('\n\n')}\n` : '';
}

/** WebVTT file content with the mandatory header and dot separator. */
export function toVtt(cues: CaptionCue[]): string {
  const body = blocks(cues, '.');
  return body.length ? `WEBVTT\n\n${body.join('\n\n')}\n` : 'WEBVTT\n';
}

/** ASS uses centiseconds, rather than the milliseconds used by SRT/VTT. */
function assTimestamp(centiseconds: number): string {
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const seconds = Math.floor((centiseconds % 6_000) / 100);
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds % 100)}`;
}

/**
 * ASS interprets braces as override tags and backslashes as control sequences.
 * Use visually similar fullwidth characters so arbitrary dialogue cannot inject
 * formatting or turn literal text such as \\N into a line break.
 */
function assText(text: string): string {
  return (
    text
      .replace(/\r\n?/g, '\n')
      .replace(/\\/g, '＼')
      .replace(/\{/g, '｛')
      .replace(/\}/g, '｝')
      // biome-ignore lint/suspicious/noControlCharactersInRegex: Strip control characters from subtitle events.
      .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, ' ')
      .replace(/\n/g, '\\N')
  );
}

/** ASS sidecar with a basic bottom-centered, outlined style. */
export function toAss(
  cues: CaptionCue[],
  dimensions: { width: number; height: number },
): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${dimensions.width}
PlayResY: ${dimensions.height}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Noto Sans CJK JP,42,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,35,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
  let previousEnd = 0;
  const events = cues.map((cue) => {
    // Keep every event positive and non-overlapping after 10 ms quantization.
    const start = Math.max(Math.round(cue.startMs / 10), previousEnd);
    const end = Math.max(Math.round(cue.endMs / 10), start + 1);
    previousEnd = end;
    return `Dialogue: 0,${assTimestamp(start)},${assTimestamp(end)},Default,,0,0,0,,${assText(cue.text)}`;
  });
  return `${header}\n${events.length ? `${events.join('\n')}\n` : ''}`;
}
