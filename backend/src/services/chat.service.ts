import axios from 'axios';
import { Types } from 'mongoose';
import ChatHistory, { ChatIntent } from '../models/ChatHistory.model';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { KNOWLEDGE, FALLBACK_ANSWER, KnowledgeEntry, ChatAction } from './chatKnowledge';

export interface ChatReply {
  reply: string;
  intent: ChatIntent;
  actions: ChatAction[];
  followUps: string[];
  sourceIds: string[];
  engine: 'knowledge_base' | 'llm';
  emergency: boolean;
}

const DANGER_PATTERNS = [
  /\b(help me|save me|bachao|bachaao)\b/, /being (followed|chased|attacked|stalked)/, /(he|they|someone) (is|are) (following|chasing|attacking|hitting|touching)/,
  /\b(attack(ed|ing)? me|grabbed me|forcing me|kidnap|molest(ing|ed)? me|raping|trying to rape)\b/, /i('m| am) (in danger|not safe|scared right now|being)/, /\b(right now|just now)\b.*\b(unsafe|danger|follow|attack)/,
];

function score(message: string, entry: KnowledgeEntry): number {
  let s = 0;
  for (const kw of entry.keywords) {
    if (message.includes(kw)) s += kw.includes(' ') ? 3 : kw.length <= 3 ? 1 : 1.6;
  }
  return s;
}

export function retrieve(message: string, limit = 3): { entry: KnowledgeEntry; score: number }[] {
  const m = message.toLowerCase();
  return KNOWLEDGE.map((entry) => ({ entry, score: score(m, entry) }))
    .filter((r) => r.score >= 1.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export class ChatService {
  async respond(userId: string, sessionId: string, message: string, language = 'en'): Promise<ChatReply> {
    const lower = message.toLowerCase();
    const emergency = DANGER_PATTERNS.some((p) => p.test(lower));
    const hits = retrieve(message);
    const top = emergency ? KNOWLEDGE.find((k) => k.id === 'emergency_now')! : hits[0]?.entry;

    let result: ChatReply = {
      reply: top ? top.answer : FALLBACK_ANSWER,
      intent: top?.intent ?? 'general',
      actions: top?.actions ?? [{ type: 'call', number: '112', label: 'Call 112' }],
      followUps: top?.followUps ?? ['What are my rights?', 'How do I file an FIR?', 'Emergency numbers'],
      sourceIds: top ? [top.id] : [],
      engine: 'knowledge_base',
      emergency,
    };

    // Danger: never wait for an LLM. Otherwise try to give a grounded, conversational answer.
    if (!emergency && env.ANTHROPIC_API_KEY) {
      const llm = await this.askLLM(userId, sessionId, message, hits.map((h) => h.entry), language).catch((e) => {
        logger.warn('Chat LLM failed, using knowledge base', { error: e instanceof Error ? e.message : String(e) });
        return null;
      });
      if (llm) result = { ...result, reply: llm, engine: 'llm' };
    }

    void this.persist(userId, sessionId, message, result);
    return result;
  }

  private async askLLM(userId: string, sessionId: string, message: string, context: KnowledgeEntry[], language: string): Promise<string | null> {
    const history = await ChatHistory.find({ userId: new Types.ObjectId(userId), sessionId }).sort({ createdAt: -1 }).limit(6);
    const turns = history.reverse().map((h) => ({ role: h.role, content: h.message }));
    const ctx = context.length ? context.map((c) => `### ${c.title}\n${c.answer}`).join('\n\n') : '(no matching reference text)';

    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: env.CHAT_MODEL,
        max_tokens: 600,
        system:
          'You are Sathi, the safety companion inside SafeSathi, an app for women in India. Be warm, calm and practical. ' +
          'Keep answers under 180 words, using short bullets. Ground every legal or helpline statement ONLY in the REFERENCE text below; ' +
          'if it is not covered, say you are not certain and point to 112, 181 or free legal aid 15100 rather than guessing. Never invent section numbers or phone numbers. ' +
          'You are not a lawyer; do not promise legal outcomes. If there is any sign of present danger, tell the user to press SOS or call 112 first. ' +
          `Reply in the user's language (preferred: ${language}); Hinglish is fine if the user writes that way.\n\nREFERENCE:\n${ctx}`,
        messages: [...turns, { role: 'user', content: message }],
      },
      { headers: { 'x-api-key': env.ANTHROPIC_API_KEY as string, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, timeout: 15000 }
    );
    const text = (data?.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim();
    return text || null;
  }

  private async persist(userId: string, sessionId: string, message: string, r: ChatReply): Promise<void> {
    try {
      await ChatHistory.create([
        { userId, sessionId, role: 'user', message: message.slice(0, 4000), intent: r.intent },
        { userId, sessionId, role: 'assistant', message: r.reply.slice(0, 4000), intent: r.intent, sourceDocIds: r.sourceIds },
      ]);
    } catch (e) {
      logger.debug('Chat history not saved', { error: e instanceof Error ? e.message : String(e) });
    }
  }

  async history(userId: string, sessionId: string) {
    return ChatHistory.find({ userId, sessionId }).sort({ createdAt: 1 }).limit(60);
  }
}
