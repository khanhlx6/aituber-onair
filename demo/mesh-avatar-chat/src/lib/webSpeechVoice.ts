import { getWebSpeechVoiceList } from '@aituber-onair/core';
import type { UiLanguage } from './i18n';

/**
 * Voices per language in rough order of quality. Web Speech only exposes what
 * the browser and OS ship, so the best available voice differs per environment:
 * Edge offers neural voices, Android ships Google's voice, macOS has Kyoko
 * (Japanese) but ships no Vietnamese voice.
 */
const PREFERRED_VOICES: Record<UiLanguage, RegExp[]> = {
  ja: [
    /nanami/i, // Edge: Microsoft Nanami Online (Natural)
    /google/i, // Chrome on Android / ChromeOS
    /ayumi/i, // Windows
    /sayaka/i, // Windows
    /o-?ren/i, // macOS (premium voice)
    /kyoko/i, // macOS (default voice)
    /haruka/i, // Windows
  ],
  vi: [
    /hoai\s?my/i, // Windows / Edge: Microsoft HoaiMy (Natural)
    /google/i, // Chrome on Android / ChromeOS
    /nam\s?minh/i, // Windows: Microsoft NamMinh
    /an/i, // Windows: Microsoft An
    /linh/i, // macOS (premium voice)
  ],
};

const LANG_PREFIX: Record<UiLanguage, string> = { ja: 'ja', vi: 'vi' };

export function isVoiceFor(
  lang: UiLanguage,
  voice: SpeechSynthesisVoice,
): boolean {
  return voice.lang
    .toLowerCase()
    .replace('_', '-')
    .startsWith(LANG_PREFIX[lang]);
}

export async function listVoicesFor(
  lang: UiLanguage,
): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return [];
  try {
    const voices = await getWebSpeechVoiceList({ timeoutMs: 1500 });
    return voices.filter((voice) => isVoiceFor(lang, voice));
  } catch {
    return [];
  }
}

/** Pick the preferred voice by name, or the best voice for the language. */
export function pickVoiceFor(
  lang: UiLanguage,
  voices: SpeechSynthesisVoice[],
  preferredName?: string,
): SpeechSynthesisVoice | undefined {
  if (preferredName) {
    const chosen = voices.find(
      (voice) =>
        voice.name === preferredName || voice.voiceURI === preferredName,
    );
    if (chosen) return chosen;
  }
  for (const pattern of PREFERRED_VOICES[lang]) {
    const match = voices.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return voices[0];
}
