// MemoryStore — persistence + injection for the two-layer memory model (SPEC §4).
// MVP storage = JSON files on disk (swap for Supabase/Firebase later; interface stays).
// Recall is "最近 N 条 + 全部 facts" — NOT vectors (that's Phase 2, SPEC §4.4 "别过度工程").
// ≙ SwiftUI Core/Memory/MemoryStore.swift
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { ROOT } from '../../config.js';
import { newUserProfile, newCompanionRelationship } from './models.js';
import { backupFile, removeBackup, hydrate } from './RemoteBackup.js';

const DIR = resolve(ROOT, 'data', 'memory');

// 启动时从云端恢复记忆文件（Render 免费档磁盘是临时的）。server.js 在 listen 前 await 它。
export function hydrateMemory() {
  return hydrate(DIR);
}
const RECENT_SUMMARIES = 3; // 最近 N 条
const MAX_NOTEBOOK = 300;   // 知识本上限，超出丢最旧的
const RECALL_POINTS = 2;    // 每次通话往人设里带几条待复习的说法

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}
function profilePath(userId) {
  return resolve(DIR, `${safe(userId)}.profile.json`);
}
function relPath(userId, companionId) {
  return resolve(DIR, `${safe(userId)}__${safe(companionId)}.relationship.json`);
}
function usagePath(userId) {
  return resolve(DIR, `${safe(userId)}.usage.json`);
}
function notebookPath(userId) {
  return resolve(DIR, `${safe(userId)}.notebook.json`);
}
function safe(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_');
}
function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}
function writeJson(path, obj) {
  ensureDir();
  const content = JSON.stringify(obj, null, 2);
  writeFileSync(path, content, 'utf8');
  backupFile(basename(path), content); // 异步推云端，不阻塞
}

export const MemoryStore = {
  // ── Layer 2: user-level profile (shared across all companions) ──
  getProfile(userId) {
    return readJson(profilePath(userId), newUserProfile(userId));
  },
  saveProfile(profile) {
    profile.updatedAt = new Date().toISOString();
    writeJson(profilePath(profile.userId), profile);
    return profile;
  },

  // ── 免费额度用量（按用户累计，防清本地数据绕过；服务端口径）──
  getUsageSec(userId) {
    return readJson(usagePath(userId), { sec: 0 }).sec || 0;
  },
  addUsageSec(userId, sec) {
    const u = readJson(usagePath(userId), { sec: 0 });
    u.sec = (u.sec || 0) + Math.max(0, Math.round(sec || 0));
    writeJson(usagePath(userId), u);
    return u.sec;
  },

  // ── 知识本：跨对话累积的"更地道的说法"（Coach 产出，用户可回看/标记学会）──
  // 按用户存一份（不分角色）——学到的说法是跟着人走的，不该被拆散在各个角色下面。
  getNotebook(userId) {
    const nb = readJson(notebookPath(userId), null);
    if (!nb || !Array.isArray(nb.entries)) return { userId, entries: [], updatedAt: '' };
    return nb;
  },
  saveNotebook(nb) {
    nb.updatedAt = new Date().toISOString();
    writeJson(notebookPath(nb.userId), nb);
    return nb;
  },
  /**
   * 把一次通话的点评并入知识本。按 better 文本去重——同一个说法被点评多次只留最早那条，
   * 否则常犯的错会把本子刷屏。返回真正新增的条目（客户端据此提示"新增 N 条"）。
   */
  addNotebookEntries(userId, { companionId = '', sessionId = '', fixes = [] }) {
    if (!fixes.length) return [];
    const nb = this.getNotebook(userId);
    const seen = new Set(nb.entries.map((e) => e.better));
    const added = [];
    for (const f of fixes) {
      if (!f || !f.better || seen.has(f.better)) continue;
      seen.add(f.better);
      added.push({
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toISOString(),
        companionId, sessionId,
        said: f.said || '', better: f.better, why: f.why || '',
        mastered: false,
      });
    }
    if (!added.length) return [];
    nb.entries.push(...added);
    if (nb.entries.length > MAX_NOTEBOOK) nb.entries = nb.entries.slice(-MAX_NOTEBOOK); // 只留最近的，防无限增长
    this.saveNotebook(nb);
    return added;
  },
  setNotebookMastered(userId, id, mastered) {
    const nb = this.getNotebook(userId);
    const hit = nb.entries.find((e) => e.id === id);
    if (!hit) return nb;
    hit.mastered = !!mastered;
    return this.saveNotebook(nb);
  },
  deleteNotebookEntry(userId, id) {
    const nb = this.getNotebook(userId);
    const before = nb.entries.length;
    nb.entries = nb.entries.filter((e) => e.id !== id);
    return before === nb.entries.length ? nb : this.saveNotebook(nb);
  },

  // ── (user × companion)-level relationship memory ──
  getRelationship(userId, companionId) {
    return readJson(relPath(userId, companionId), newCompanionRelationship(userId, companionId));
  },
  saveRelationship(rel) {
    writeJson(relPath(rel.userId, rel.companionId), rel);
    return rel;
  },

  /**
   * Incremental merge after a session ends (SPEC §4.4 "增量 merge").
   * Appends the summary to the relationship, de-dupes new facts/interests into the profile,
   * and accumulates language observations.
   */
  applySessionSummary(userId, companionId, summary) {
    const profile = this.getProfile(userId);
    const rel = this.getRelationship(userId, companionId);

    // Relationship: append summary, refresh rapport + last date.
    rel.sessionSummaries.push(summary);
    rel.lastSessionDate = summary.date;
    const count = rel.sessionSummaries.length;
    rel.rapportNotes =
      count === 1 ? '第一次聊过，初步认识。'
      : count <= 3 ? `聊过 ${count} 次，渐渐熟悉。`
      : `聊过 ${count} 次，关系熟络，可以更随意一点。`;
    this.saveRelationship(rel);

    // Profile: merge facts (de-dupe by text), interests, errors; nudge level estimate.
    // ⚠️ 每条事实都记下"是哪个角色听到的"。没有 companionId 的是老数据（那时候记忆全局共享），
    // 见 migrateFactOwnership。产品上这一条很重要：你只跟 Vivian 说过的事，李阿姨不该知道。
    const factTexts = new Set(profile.facts.map((f) => f.text));
    for (const f of summary.newFactsLearned || []) {
      const text = typeof f === 'string' ? f : f.text;
      if (text && !factTexts.has(text)) {
        profile.facts.push({ text, learnedAt: summary.date, sourceSessionId: summary.sessionId, companionId });
        factTexts.add(text);
      }
    }
    const errSet = new Set(profile.persistentErrors);
    for (const e of summary.languageNotes?.recurringErrors || []) {
      if (e && !errSet.has(e)) { profile.persistentErrors.push(e); errSet.add(e); }
    }
    this.saveProfile(profile);
    return { profile, rel };
  },

  /**
   * 一次性回填：老数据的 facts 没有 companionId（当时记忆是全局共享的）。
   * 用各角色 relationship 里的 sessionSummaries.newFactsLearned 反查是谁学到的；
   * 查得到就归给那个角色，查不到的留作共享——宁可多共享，也不要弄丢用户已有的记忆。
   * 幂等：没有待回填的老数据时直接返回，不写盘。
   */
  migrateFactOwnership(userId) {
    const profile = this.getProfile(userId);
    const legacy = profile.facts.filter((f) => !f.companionId);
    if (!legacy.length) return profile;
    ensureDir();
    const owner = new Map();
    for (const file of readdirSync(DIR)) {
      if (!file.startsWith(`${safe(userId)}__`) || !file.endsWith('.relationship.json')) continue;
      const rel = readJson(resolve(DIR, file), null);
      if (!rel || !rel.companionId) continue;
      for (const sum of rel.sessionSummaries || []) {
        for (const nf of sum.newFactsLearned || []) {
          const text = typeof nf === 'string' ? nf : nf && nf.text;
          if (text && !owner.has(text)) owner.set(text, rel.companionId);
        }
      }
    }
    let changed = false;
    for (const f of legacy) {
      const c = owner.get(f.text);
      if (c) { f.companionId = c; changed = true; }
    }
    return changed ? this.saveProfile(profile) : profile;
  },

  /**
   * 这个角色该知道的事实 = 自己学到的 + 无主的老数据（共享）。
   * 姓名、兴趣、语言水平不走这里——那些是学习者本人的属性，谁都可以知道。
   */
  factsFor(profile, companionId) {
    return (profile.facts || []).filter((f) => !f.companionId || f.companionId === companionId);
  },

  /**
   * 这个角色该知道的兴趣。老数据是纯字符串（那时候兴趣全局共享），当作共享保留——
   * 宁可多共享也不要弄丢用户已有的记忆；新数据是 {text, companionId}。
   */
  interestsFor(profile, companionId) {
    return (profile.interests || [])
      .filter((x) => typeof x === 'string' || !x.companionId || x.companionId === companionId)
      .map((x) => (typeof x === 'string' ? x : x.text))
      .filter(Boolean);
  },

  /**
   * Build the compact memory block injected into the system prompt (SPEC §4.3).
   * Only the most relevant slice: preferred name, a few interests/facts, recent one-liners, rapport.
   * Token-budgeted on purpose — do NOT dump full history.
   */
  buildInjection(userId, companionId) {
    const profile = this.migrateFactOwnership(userId); // 老数据补上归属，之后就是空转
    const rel = this.getRelationship(userId, companionId);
    const times = rel.sessionSummaries.length;
    const mine = this.factsFor(profile, companionId);
    if (!times && !mine.length) {
      return ''; // 初次见面：完全空白，连名字都不知道（要等对方自我介绍）
    }

    const parts = [];
    if (times > 0) parts.push(`你和这位学习者聊过 ${times} 次。`);

    // 名字只在“你们聊过”之后才知道；初次见面不要主动叫名字，要等对方介绍。语气自然，别刻意、别每句都叫。
    if (profile.preferredName && times > 0) parts.push(`你们熟了，ta 叫 ${profile.preferredName}（自然的时候可以称呼，但不必刻意或每句都叫）。`);
    const myInterests = this.interestsFor(profile, companionId);
    if (myInterests.length) parts.push(`ta 的兴趣：${myInterests.slice(0, 3).join('、')}。`);
    if (mine.length) {
      parts.push(`关于 ta：${mine.slice(-4).map((f) => f.text).join('；')}。`);
    }

    const recent = rel.sessionSummaries.slice(-RECENT_SUMMARIES).map((s) => s.oneLineSummary).filter(Boolean);
    if (recent.length) parts.push(`最近聊过：${recent.join('；')}。`);

    if (rel.rapportNotes) parts.push(rel.rapportNotes);
    if (profile.persistentErrors.length) {
      parts.push(`ta 常出现的小问题：${profile.persistentErrors.slice(0, 2).join('、')}，可以自然地多带一带。`);
    }

    // 闭环：把知识本里还没标"学会"的说法带回对话。只能回看的本子就是又一个 Anki，
    // 让角色主动找机会用上，本子才变成对话的燃料（这一步别人抄不走）。
    const due = this.getNotebook(userId).entries.filter((e) => !e.mastered).slice(-RECALL_POINTS);
    if (due.length) {
      parts.push(`ta 最近学过这些说法：${due.map((e) => e.better).join('、')}。自然的时候找个机会让 ta 用一用，别生硬地考 ta。`);
    }
    return parts.join(' ');
  },

  // ── Memory management UI support (SPEC §4.4 "查看/删除") ──
  getAllForUser(userId) {
    ensureDir();
    const profile = this.migrateFactOwnership(userId);
    const rels = readdirSync(DIR)
      .filter((f) => f.startsWith(`${safe(userId)}__`) && f.endsWith('.relationship.json'))
      .map((f) => readJson(resolve(DIR, f), null))
      .filter(Boolean);
    return { profile, relationships: rels };
  },
  deleteFact(userId, factText) {
    const profile = this.getProfile(userId);
    profile.facts = profile.facts.filter((f) => f.text !== factText);
    return this.saveProfile(profile);
  },
  forgetCompanion(userId, companionId) {
    const p = relPath(userId, companionId);
    if (existsSync(p)) unlinkSync(p);
    removeBackup(basename(p));
  },
  forgetEverything(userId) {
    ensureDir();
    for (const f of readdirSync(DIR)) {
      if (f.startsWith(`${safe(userId)}.`) || f.startsWith(`${safe(userId)}__`)) {
        unlinkSync(resolve(DIR, f));
        removeBackup(f);
      }
    }
  },
};
