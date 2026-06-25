// server.js — entry point. Static file serving + JSON API that orchestrates the four
// decoupled modules (voice / companion / memory / avatar-via-data). Zero npm deps: built-in http.
// ≙ the role of ConversationViewModel (orchestration) + app routing in SwiftUI (SPEC §6.1).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

import { config, ROOT } from './config.js';
import { CompanionRepository } from './core/companions/CompanionRepository.js';
import { assembleSystemPrompt, describeLevel } from './core/prompt/PromptAssembler.js';
import { MemoryStore } from './core/memory/MemoryStore.js';
import { createBrain } from './core/llm/Brain.js';
import { createVoiceEngine } from './core/voice/VoiceEngine.js';
import { Summarizer } from './core/llm/Summarizer.js';
import { streamMiniMaxSentences } from './core/llm/streamChat.js';
import { attachRealtime } from './core/realtime/QwenRealtimeProxy.js';

const brain = createBrain();
const voice = createVoiceEngine();
const summarizer = new Summarizer();

const PUBLIC = resolve(ROOT, 'public');
const AVATARS = resolve(ROOT, 'avatars');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

// ───────────────────────── helpers ─────────────────────────
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}
async function serveStatic(res, baseDir, relPath, fallbackIndex = false) {
  let filePath = resolve(baseDir, '.' + normalize('/' + relPath));
  if (!filePath.startsWith(baseDir)) return sendJson(res, 403, { error: 'forbidden' });
  try {
    let s = await stat(filePath).catch(() => null);
    if ((!s || s.isDirectory()) && fallbackIndex) filePath = resolve(baseDir, 'index.html');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

// 清理 LLM 回复：去掉括号注释、英文/拼音为主的行（Text-01 爱乱加，提速又干净）
function cleanReply(s) {
  if (!s) return s;
  s = s.replace(/[（(][^）)]*[）)]/g, ' ');     // 去掉 (…) / （…） 注释
  s = s.split(/\n+/).map((l) => l.trim()).filter((t) => {
    if (!t) return false;
    const ascii = (t.match(/[A-Za-z]/g) || []).length;
    const han = (t.match(/[一-鿿]/g) || []).length;
    return han >= ascii;                          // 中文不少于英文才保留（滤掉翻译/拼音行）
  }).join(' ');
  return s.replace(/\s+/g, ' ').trim();
}

// ───────────────────────── API ─────────────────────────
async function handleApi(req, res, url) {
  const p = url.pathname;

  if (req.method === 'GET' && p === '/api/config') {
    return sendJson(res, 200, { engine: config.engine, brain: brain.name, voice: voice.name });
  }

  if (req.method === 'GET' && p === '/api/companions') {
    return sendJson(res, 200, { companions: CompanionRepository.summaries() });
  }

  if (req.method === 'GET' && p.startsWith('/api/companions/')) {
    const id = decodeURIComponent(p.split('/').pop());
    const c = CompanionRepository.byId(id);
    return c ? sendJson(res, 200, c) : sendJson(res, 404, { error: 'companion not found' });
  }

  // Start a session: returns sessionId, the opening line (+ audio), and what memory was injected.
  if (req.method === 'POST' && p === '/api/session/start') {
    const { userId = 'demo-user', companionId } = await readBody(req);
    const c = CompanionRepository.byId(companionId);
    if (!c) return sendJson(res, 404, { error: 'companion not found' });

    const memoryBlock = MemoryStore.buildInjection(userId, companionId);
    const systemPrompt = assembleSystemPrompt(c, memoryBlock);
    const sessionId = randomUUID();

    let audio = null;
    try {
      audio = await voice.synthesize(c.scenario.openingLine.zh, c.voiceId, { speechRate: c.level.constraints.speechRate });
    } catch (e) {
      console.warn('[tts] opening line synth failed:', e.message);
    }

    return sendJson(res, 200, {
      sessionId,
      opening: c.scenario.openingLine,
      audio,
      memoryInjected: memoryBlock,
      level: describeLevel(c),
      systemPromptPreview: systemPrompt, // shown in a "debug" drawer; great for the level-diff demo
    });
  }

  // One dialogue turn. Client holds the running transcript and sends it each time (stateless server).
  if (req.method === 'POST' && p === '/api/chat') {
    const { userId = 'demo-user', companionId, history = [] } = await readBody(req);
    const c = CompanionRepository.byId(companionId);
    if (!c) return sendJson(res, 404, { error: 'companion not found' });

    const memoryBlock = MemoryStore.buildInjection(userId, companionId);
    const systemPrompt = assembleSystemPrompt(c, memoryBlock);

    let reply;
    try {
      reply = await brain.reply(systemPrompt, history);
      reply = cleanReply(reply) || reply;
    } catch (e) {
      console.error('[brain] reply failed:', e.message);
      return sendJson(res, 502, { error: 'brain_failed', detail: e.message });
    }

    let audio = null;
    try {
      audio = await voice.synthesize(reply, c.voiceId, { speechRate: c.level.constraints.speechRate });
    } catch (e) {
      console.warn('[tts] synth failed:', e.message);
    }
    return sendJson(res, 200, { reply, audio });
  }

  // 流式对话（仅 minimax）：LLM 边生成边逐句 TTS，SSE 推前端 → 打电话实时感
  if (req.method === 'POST' && p === '/api/chat-stream') {
    const { userId = 'demo-user', companionId, history = [] } = await readBody(req);
    const c = CompanionRepository.byId(companionId);
    if (!c) return sendJson(res, 404, { error: 'companion not found' });
    if (config.engine !== 'minimax') return sendJson(res, 400, { error: 'stream_requires_minimax' });

    const memoryBlock = MemoryStore.buildInjection(userId, companionId);
    const systemPrompt = assembleSystemPrompt(c, memoryBlock);
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    const send = (o) => { try { res.write('data: ' + JSON.stringify(o) + '\n\n'); } catch (e) {} };
    try {
      let spoken = '';
      await streamMiniMaxSentences(config.minimax, systemPrompt, history, async (sentence) => {
        const clean = cleanReply(sentence);
        if (!clean) return;                         // 跳过英文/拼音/括号注释句
        spoken += clean;
        let audio = null;
        try { audio = await voice.synthesize(clean, c.voiceId, { speechRate: c.level.constraints.speechRate }); }
        catch (e) { /* 单句合成失败则只发文本 */ }
        send({ type: 'sentence', text: clean, audio: audio && audio.audioBase64, mime: audio && audio.mime });
      });
      send({ type: 'done', reply: spoken });
    } catch (e) {
      console.error('[chat-stream]', e.message);
      send({ type: 'error', detail: e.message });
    }
    res.end();
    return;
  }

  // End session → summarize (async-style, but we await so the client gets the result to show)
  // → merge into memory. Verifies acceptance #3 on the *next* session.
  if (req.method === 'POST' && p === '/api/session/end') {
    const { sessionId = randomUUID(), userId = 'demo-user', companionId, transcript = [], durationSec = 0 } = await readBody(req);
    if (!companionId) return sendJson(res, 400, { error: 'companionId required' });

    const summary = await summarizer.summarize({ sessionId, userId, companionId, transcript, durationSec });

    // Pull out-of-band profile signals from the summarizer into the user profile.
    if (summary._preferredName || (summary._interests && summary._interests.length)) {
      const profile = MemoryStore.getProfile(userId);
      if (summary._preferredName && !profile.preferredName) profile.preferredName = summary._preferredName;
      const known = new Set(profile.interests);
      for (const i of summary._interests || []) if (i && !known.has(i)) { profile.interests.push(i); known.add(i); }
      MemoryStore.saveProfile(profile);
    }
    delete summary._preferredName;
    delete summary._interests;

    const { profile, rel } = MemoryStore.applySessionSummary(userId, companionId, summary);
    return sendJson(res, 200, { summary, profileFacts: profile.facts.length, sessions: rel.sessionSummaries.length });
  }

  // ── Memory management (SPEC §4.4: 查看/删除) ──
  if (req.method === 'GET' && p === '/api/memory') {
    const userId = url.searchParams.get('userId') || 'demo-user';
    return sendJson(res, 200, MemoryStore.getAllForUser(userId));
  }
  if (req.method === 'POST' && p === '/api/memory/delete-fact') {
    const { userId = 'demo-user', factText } = await readBody(req);
    return sendJson(res, 200, MemoryStore.deleteFact(userId, factText));
  }
  if (req.method === 'POST' && p === '/api/memory/forget-companion') {
    const { userId = 'demo-user', companionId } = await readBody(req);
    MemoryStore.forgetCompanion(userId, companionId);
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'POST' && p === '/api/memory/forget-all') {
    const { userId = 'demo-user' } = await readBody(req);
    MemoryStore.forgetEverything(userId);
    return sendJson(res, 200, { ok: true });
  }
  // 设置用户称呼（引导时填）→ AI 通话时会叫这个名字
  if (req.method === 'POST' && p === '/api/profile') {
    const { userId = 'demo-user', name } = await readBody(req);
    const profile = MemoryStore.getProfile(userId);
    profile.preferredName = (name || '').trim().slice(0, 24);
    MemoryStore.saveProfile(profile);
    return sendJson(res, 200, { ok: true, preferredName: profile.preferredName });
  }

  return sendJson(res, 404, { error: 'unknown endpoint' });
}

// ───────────────────────── router ─────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // CORS：允许 Expo/RN-web(:8090) 等跨源前端调用后端 API/立绘
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname.startsWith('/avatars/')) {
      return await serveStatic(res, AVATARS, url.pathname.replace('/avatars/', ''));
    }
    return await serveStatic(res, PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname, true);
  } catch (e) {
    console.error('[server] unhandled:', e);
    sendJson(res, 500, { error: 'internal', detail: e.message });
  }
});

attachRealtime(server, '/ws/realtime');

server.listen(config.port, () => {
  console.log(`\n  AI 中文口语陪练 (Phase 0 prototype)`);
  console.log(`  ▶ http://localhost:${config.port}`);
  console.log(`  engine: ${config.engine}  | brain: ${brain.name}  | voice: ${voice.name}\n`);
});
