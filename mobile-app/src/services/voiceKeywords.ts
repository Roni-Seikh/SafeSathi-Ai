/**
 * Pure keyword matcher for on-device speech transcripts (no native code → unit-testable).
 *
 * Two strengths:
 *  - strong: unambiguous distress phrases ("bachao", "save me", "help me", "let go of me") → can fire immediately
 *  - weak:   a single "help"/"stop" is also ordinary speech ("can you help me with…") → needs a repeat or a
 *            cancellable countdown, which is what keeps false alarms low.
 */
export type KeywordId = 'help' | 'save_me' | 'bachao' | 'chere_din' | 'stop' | 'none';
export type Strength = 'strong' | 'weak';

export interface KeywordMatch {
  keyword: KeywordId;
  strength: Strength;
  matched: string;
}

interface Phrase { id: KeywordId; text: string }

const STRONG: Phrase[] = [
  // English
  ...['save me', 'somebody save me', 'please save me', 'help me', 'somebody help', 'someone help', 'please help', 'help us', 'help help', 'call the police', 'call police']
    .map((text) => ({ id: (text.includes('save') ? 'save_me' : 'help') as KeywordId, text })),
  ...['let me go', 'let go of me', 'leave me alone', 'get off me', 'dont touch me', 'do not touch me', 'stop it', 'please stop', 'stop stop']
    .map((text) => ({ id: (text.startsWith('stop') || text.includes('stop') ? 'stop' : 'chere_din') as KeywordId, text })),
  // Hindi / Hinglish (romanised + Devanagari)
  ...['bachao', 'bachaao', 'bacchao', 'bachao bachao', 'mujhe bachao', 'koi bachao', 'बचाओ', 'मुझे बचाओ', 'कोई बचाओ'].map((text) => ({ id: 'bachao' as KeywordId, text })),
  ...['chhod do', 'chod do', 'chhodo', 'chodo', 'mujhe chhod do', 'mujhe chodo', 'chhodo mujhe', 'छोड़ दो', 'छोड़ो', 'मुझे छोड़ दो', 'haath mat lagao', 'mat chhuo', 'हाथ मत लगाओ']
    .map((text) => ({ id: 'chere_din' as KeywordId, text })),
  // Bengali (romanised + script)
  ...['bachao', 'amake bachao', 'বাঁচাও', 'বাচাও', 'আমাকে বাঁচাও', 'বাঁচান'].map((text) => ({ id: 'bachao' as KeywordId, text })),
  ...['chere dao', 'chhere dao', 'ছেড়ে দাও', 'ছাড়ো', 'আমাকে ছেড়ে দাও', 'ছুঁবে না', 'ছোঁবে না'].map((text) => ({ id: 'chere_din' as KeywordId, text })),
];

const WEAK: Phrase[] = [
  { id: 'help', text: 'help' }, { id: 'help', text: 'हेल्प' }, { id: 'help', text: 'মদদ' }, { id: 'help', text: 'সাহায্য' },
  { id: 'stop', text: 'stop' },
];

/** Strip punctuation (ASCII only — keeps Devanagari/Bengali intact on Hermes), lower-case, collapse spaces. */
export function normalise(s: string): string {
  return s.toLowerCase().replace(/[.,!?;:"“”()[\]{}\-_]/g, ' ').replace(/['’`]/g, '').replace(/\s+/g, ' ').trim();
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Phrases that are ordinary requests in many sentences ("help me with…", "please stop the music"). */
const CONTEXT_SENSITIVE = new Set(['help me', 'help us', 'please help', 'please stop', 'stop it', 'call police', 'call the police']);
const REQUEST_FOLLOWERS = new Set(['with', 'to', 'out', 'find', 'understand', 'carry', 'choose', 'decide', 'pick', 'the', 'this', 'that', 'my', 'a', 'an', 'get', 'move', 'tonight', 'tomorrow', 'later', 'if', 'when', 'because', 'since', 'in', 'on', 'for', 'about', 'learn', 'write', 'fix', 'plan', 'look']);
const POLITE_LEADINS = /\b(can|could|would|will|should|shall|do|did|how)\s+(you|u|someone|anyone|i|we)\s*$/;

/** True if the matched phrase sits inside a normal sentence rather than being a cry for help. */
function looksLikeOrdinaryRequest(text: string, phrase: string): boolean {
  const p = normalise(phrase);
  if (!CONTEXT_SENSITIVE.has(p)) return false;
  const idx = (' ' + text + ' ').indexOf(' ' + p + ' ');
  if (idx < 0) return false;
  const before = text.slice(0, Math.max(0, idx)).trim();
  const after = text.slice(idx + p.length).trim();
  const next = after.split(' ')[0] ?? '';
  return POLITE_LEADINS.test(before) || REQUEST_FOLLOWERS.has(next);
}

function containsPhrase(text: string, tokens: string[], phrase: string): boolean {
  const p = normalise(phrase);
  if (!p) return false;
  if (p.includes(' ')) return (' ' + text + ' ').includes(' ' + p + ' ');
  // single word: exact token, or 1 typo for words ≥ 6 letters (recognisers often mangle "bachao" → "bachaao"/"bachau")
  return tokens.some((t) => t === p || (p.length >= 6 && /^[a-z]+$/.test(p) && editDistance(t, p, 1) <= 1));
}

export function matchKeywords(transcript: string, customSafeWord?: string): KeywordMatch | null {
  const text = normalise(transcript);
  if (!text) return null;
  const tokens = text.split(' ');

  const safe = customSafeWord ? normalise(customSafeWord) : '';
  if (safe.length >= 3 && containsPhrase(text, tokens, safe)) return { keyword: 'help', strength: 'strong', matched: safe };

  let downgraded: KeywordMatch | null = null;
  for (const p of STRONG) {
    if (!containsPhrase(text, tokens, p.text)) continue;
    if (looksLikeOrdinaryRequest(text, p.text)) { downgraded = downgraded ?? { keyword: p.id, strength: 'weak', matched: p.text }; continue; }
    return { keyword: p.id, strength: 'strong', matched: p.text };
  }

  // "help" said twice anywhere in the utterance = a call for help, not a request
  const helpHits = tokens.filter((t) => t === 'help' || t === 'हेल्प').length;
  if (helpHits >= 2) return { keyword: 'help', strength: 'strong', matched: 'help help' };

  if (downgraded) return downgraded;
  for (const p of WEAK) if (containsPhrase(text, tokens, p.text)) return { keyword: p.id, strength: 'weak', matched: p.text };
  return null;
}

/** Words fed to the recogniser as hints (Android 13+ honours them) so rare words like "bachao" win over look-alikes. */
export const CONTEXTUAL_HINTS = ['help', 'help me', 'save me', 'bachao', 'bachao bachao', 'mujhe bachao', 'chhod do', 'let go of me', 'leave me alone', 'stop it', 'बचाओ', 'छोड़ दो', 'বাঁচাও', 'ছেড়ে দাও'];
