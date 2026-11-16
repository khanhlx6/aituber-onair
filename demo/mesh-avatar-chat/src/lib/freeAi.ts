/**
 * Free AI with no API key (Pollinations text API, anonymous tier).
 * This is what answers on phones and any browser where Gemini Nano is
 * missing and no API key is configured — quality improves the moment a
 * free Groq/Gemini key is added in the settings.
 */
const FREE_AI_ENDPOINT = 'https://text.pollinations.ai';
const FREE_AI_MODEL = 'openai-fast';
const FREE_AI_TIMEOUT_MS = 30_000;

export async function freeAiComplete(
  system: string,
  prompt: string,
): Promise<string> {
  const url =
    `${FREE_AI_ENDPOINT}/${encodeURIComponent(prompt)}` +
    `?model=${FREE_AI_MODEL}&system=${encodeURIComponent(system)}`;
  const res = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(FREE_AI_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`free AI HTTP ${res.status}`);
  const text = (await res.text()).trim();
  if (!text) throw new Error('free AI returned nothing');
  return text;
}

export interface FreeAiTurn {
  role: 'user' | 'assistant';
  text: string;
}

/** One free-AI chat reply; the short demo history is flattened into the prompt. */
export async function freeAiChat(
  system: string,
  history: FreeAiTurn[],
  input: string,
): Promise<string> {
  const turns = history
    .slice(-6)
    .map(
      (turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.text}`,
    )
    .join('\n');
  const prompt = turns
    ? `${turns}\nUser: ${input}\nAssistant:`
    : `User: ${input}\nAssistant:`;
  return freeAiComplete(system, prompt);
}
