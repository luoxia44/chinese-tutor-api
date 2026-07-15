// Summarizer — turns a finished transcript into a SessionSummary (SPEC §4.2 Layer 1).
// Runs async on session end; does NOT block the user. Cheap zh-strong model recommended
// (Qwen/DeepSeek) — configurable via SUMMARIZER_* env. Falls back to a heuristic when no key.
// ≙ SwiftUI Core/LLM/SummarizerClient.swift
import { config } from '../../config.js';
import { newSessionSummary } from '../memory/models.js';

const EXTRACTION_PROMPT = `你是一个对话分析助手。下面是一位中文学习者和一个 AI 陪练角色的对话记录。
请提取结构化信息，只输出 JSON，不要任何解释。格式：
{
  "topicsCovered": ["聊到的话题，简短中文短语"],
  "newFactsLearned": ["关于这位学习者的客观事实，例如 '养了一只叫Miumiu的猫'、'在上海工作'"],
  "preferredName": "如果对话中得知学习者的名字/称呼就填，否则空字符串",
  "interests": ["学习者表达过的兴趣爱好"],
  "recurringErrors": ["学习者反复出现的中文语言问题，没有就空数组"],
  "oneLineSummary": "一句话概括这次对话，例如 '聊了第一次见面，得知 ta 喜欢猫'"
}`;

export class Summarizer {
  constructor(cfg = config.summarizer) {
    this.cfg = cfg;
  }

  /**
   * @param {object} args { sessionId, userId, companionId, durationSec, transcript: {role,content}[] }
   * @returns {Promise<SessionSummary>}
   */
  async summarize(args) {
    const { transcript = [] } = args;
    const base = {
      sessionId: args.sessionId,
      userId: args.userId,
      companionId: args.companionId,
      durationSec: args.durationSec || 0,
    };

    const useLLM = !!this.cfg.apiKey; // 有 key 就用真 LLM 提取；不再绑死 ENGINE=minimax（生产 ENGINE=mock 但有千问 key）
    let extracted;
    try {
      extracted = useLLM ? await this._extractWithLLM(transcript) : this._extractHeuristic(transcript);
    } catch (e) {
      console.warn('[summarizer] LLM extraction failed, using heuristic:', e.message);
      extracted = this._extractHeuristic(transcript);
    }

    const summary = newSessionSummary({
      ...base,
      topicsCovered: extracted.topicsCovered || [],
      newFactsLearned: (extracted.newFactsLearned || []).map((t) => ({ text: t, learnedAt: new Date().toISOString(), sourceSessionId: base.sessionId })),
      languageNotes: {
        recurringErrors: extracted.recurringErrors || [],
        vocabUserStruggled: [],
        levelObservation: extracted.levelObservation || '',
      },
      oneLineSummary: extracted.oneLineSummary || this._fallbackOneLine(transcript),
    });
    // Carried out-of-band for the user-profile merge (newSessionSummary whitelists fields,
    // so these must be attached AFTER construction).
    summary._preferredName = extracted.preferredName || '';
    summary._interests = extracted.interests || [];
    return summary;
  }

  async _extractWithLLM(transcript) {
    const convo = transcript.map((m) => `${m.role === 'user' ? '学习者' : 'AI'}：${m.content}`).join('\n');
    const res = await fetch(this.cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: convo },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!res.ok) throw new Error(`summarizer ${res.status}`);
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';
    const jsonStr = (raw.match(/\{[\s\S]*\}/) || ['{}'])[0];
    return JSON.parse(jsonStr);
  }

  // Heuristic fallback so memory works offline too (no key).
  _extractHeuristic(transcript) {
    const userTurns = transcript.filter((m) => m.role === 'user').map((m) => m.content);
    const facts = [];
    let preferredName = '';
    const interests = [];
    for (const t of userTurns) {
      // Only "我叫…/my name is…" count as a name — avoid "我是美国人/学生" false positives.
      const nameMatch = t.match(/我叫\s*([一-龥A-Za-z]{1,8})|(?:my name is|i'?m called)\s+([A-Za-z]+)/i);
      if (nameMatch) { const nm = (nameMatch[1] || nameMatch[2] || '').trim(); if (nm && !/[人国]$|学生$/.test(nm)) preferredName = nm; }
      const likeMatch = t.match(/我喜欢([^，。！？,.!?]{1,10})|我爱([^，。！？,.!?]{1,10})|I like ([A-Za-z ]{1,20})/i);
      if (likeMatch) interests.push((likeMatch[1] || likeMatch[2] || likeMatch[3]).trim());
    }
    return {
      topicsCovered: userTurns.slice(0, 3).map((t) => t.slice(0, 12)),
      newFactsLearned: preferredName ? [`称呼是 ${preferredName}`] : [],
      preferredName,
      interests,
      recurringErrors: [],
      oneLineSummary: this._fallbackOneLine(transcript),
    };
  }

  _fallbackOneLine(transcript) {
    const n = transcript.filter((m) => m.role === 'user').length;
    return n ? `进行了一次约 ${n} 轮的中文对话练习。` : '一次简短的对话。';
  }
}
