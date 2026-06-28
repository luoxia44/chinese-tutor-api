// MemoryStore — persistence + injection for the two-layer memory model (SPEC §4).
// MVP storage = JSON files on disk (swap for Supabase/Firebase later; interface stays).
// Recall is "最近 N 条 + 全部 facts" — NOT vectors (that's Phase 2, SPEC §4.4 "别过度工程").
// ≙ SwiftUI Core/Memory/MemoryStore.swift
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../../config.js';
import { newUserProfile, newCompanionRelationship } from './models.js';

const DIR = resolve(ROOT, 'data', 'memory');
const RECENT_SUMMARIES = 3; // 最近 N 条

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
  writeFileSync(path, JSON.stringify(obj, null, 2), 'utf8');
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
    const factTexts = new Set(profile.facts.map((f) => f.text));
    for (const f of summary.newFactsLearned || []) {
      const text = typeof f === 'string' ? f : f.text;
      if (text && !factTexts.has(text)) {
        profile.facts.push({ text, learnedAt: summary.date, sourceSessionId: summary.sessionId });
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
   * Build the compact memory block injected into the system prompt (SPEC §4.3).
   * Only the most relevant slice: preferred name, a few interests/facts, recent one-liners, rapport.
   * Token-budgeted on purpose — do NOT dump full history.
   */
  buildInjection(userId, companionId) {
    const profile = this.getProfile(userId);
    const rel = this.getRelationship(userId, companionId);
    const times = rel.sessionSummaries.length;
    if (!times && !profile.facts.length) {
      return ''; // 初次见面：完全空白，连名字都不知道（要等对方自我介绍）
    }

    const parts = [];
    if (times > 0) parts.push(`你和这位学习者聊过 ${times} 次。`);

    // 名字只在“你们聊过”之后才知道；初次见面不要主动叫名字，要等对方介绍。语气自然，别刻意、别每句都叫。
    if (profile.preferredName && times > 0) parts.push(`你们熟了，ta 叫 ${profile.preferredName}（自然的时候可以称呼，但不必刻意或每句都叫）。`);
    if (profile.interests.length) parts.push(`ta 的兴趣：${profile.interests.slice(0, 3).join('、')}。`);
    if (profile.facts.length) {
      parts.push(`关于 ta：${profile.facts.slice(-4).map((f) => f.text).join('；')}。`);
    }

    const recent = rel.sessionSummaries.slice(-RECENT_SUMMARIES).map((s) => s.oneLineSummary).filter(Boolean);
    if (recent.length) parts.push(`最近聊过：${recent.join('；')}。`);

    if (rel.rapportNotes) parts.push(rel.rapportNotes);
    if (profile.persistentErrors.length) {
      parts.push(`ta 常出现的小问题：${profile.persistentErrors.slice(0, 2).join('、')}，可以自然地多带一带。`);
    }
    return parts.join(' ');
  },

  // ── Memory management UI support (SPEC §4.4 "查看/删除") ──
  getAllForUser(userId) {
    ensureDir();
    const profile = this.getProfile(userId);
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
  },
  forgetEverything(userId) {
    ensureDir();
    for (const f of readdirSync(DIR)) {
      if (f.startsWith(`${safe(userId)}.`) || f.startsWith(`${safe(userId)}__`)) {
        unlinkSync(resolve(DIR, f));
      }
    }
  },
};
