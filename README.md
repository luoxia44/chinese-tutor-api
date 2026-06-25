# AI 中文口语陪练 — Phase 0 Web Prototype

A runnable web prototype of the AI Chinese speaking-practice app described in `SPEC.md` / `CLAUDE.md`.
Its job (per the project constitution) is to **prove the voice-conversation loop + the decoupled
adapter architecture** *before* committing to the native SwiftUI iOS build — since iOS can't be
compiled/tested on this Windows machine.

> This is the **Phase 0 validation harness**, not the shipping product. The shipping product is
> SwiftUI/iOS with end-to-end MiniMax Realtime (S2S). This prototype mirrors that architecture
> 1:1 so the port is a near-mechanical translation.

## Quick start

```bash
cd chinese-partner-web
node server/server.js          # no npm install needed — zero dependencies
# open http://localhost:5173
```

Runs in **mock mode by default** — no API key, no cost. The full loop works:
- pick one of the 20 seed companions (filter by level / scenario),
- talk (Chrome mic → zh-CN speech recognition) **or type**,
- the companion replies in character at its CEFR level and speaks back (browser TTS),
- end the session → it summarizes and **remembers** you,
- come back to the same companion → it greets you using that memory.

> Voice input needs **Chrome/Edge** (Web Speech API). The **type** box works everywhere — the loop
> is fully testable without a mic.

## Turn on real MiniMax

```bash
cp .env.example .env
# edit .env:
#   ENGINE=minimax
#   MINIMAX_API_KEY=sk-...        (overseas/global key — NOT the China endpoint, per spec §3.3)
node server/server.js
```

This activates `MiniMaxBrain` (dialogue via chat completions) + `MiniMaxVoiceEngine` (real T2A
voice). Everything else is unchanged — that's the adapter pattern working.

**Voices.** The seed ships placeholder `voiceId`s. `server/core/voice/voiceMap.js` maps each to a
real MiniMax system voice by gender + descriptor, so the 20 companions actually sound different
(少女 / 御姐 / 成熟女声 / 青涩青年 / 沉稳 / 霸道 …). Put a real `voice_id` directly in
`companions.seed.json` (anything not starting with `minimax_`) to override.

**Low-latency streaming (optional).** Set `VOICE_STREAMING=true` to stream audio over MiniMax's
WebSocket (`wss://api.minimax.io/ws/v1/t2a_v2`) via `MiniMaxStreamVoiceEngine` — the stepping
stone toward the iOS end-to-end Realtime S2S session. Default off; REST is the reliable path.
> ⚠️ The WS path needs a real key to verify — it's built to the documented protocol but untested here.

## How this maps to the SwiftUI iOS app (SPEC §6.1)

| This prototype | iOS target | Role |
|---|---|---|
| `server/core/voice/VoiceEngine.js` (+ Mock/MiniMax) | `Core/Voice/VoiceEngine.swift` (+ impls) | Speech adapter seam |
| `server/core/llm/Brain.js`, `Summarizer.js` | `Core/LLM/SummarizerClient.swift` | Dialogue + memory LLMs |
| `server/core/prompt/PromptAssembler.js` | `Core/Prompt/PromptAssembler.swift` | 身份×等级×场景×记忆 → system prompt |
| `server/core/memory/MemoryStore.js` | `Core/Memory/MemoryStore.swift` | Two-layer memory |
| `server/core/companions/CompanionRepository.js` | `Core/Companions/CompanionRepository.swift` | Data-driven loader |
| `public/js/features/conversation.js` | `Features/Conversation/*` | Core screen + orchestration |
| `public/js/features/avatar.js` | `Features/Conversation/AvatarView.swift` | AvatarTier dispatch |
| `public/js/voice/webSpeech.js` | `Core/Voice/AudioPipeline.swift` | Mic capture / playback / barge-in |

**Key difference to carry into iOS:** here the brain (text) and voice (TTS) are *two* adapters
behind one `VoiceEngine` facade (a pragmatic cascade for fast web validation). On iOS, collapse
them into a **single end-to-end MiniMax Realtime S2S session** — the spec's hard requirement
(§3.1, no ASR→LLM→TTS cascade). The facade and prompt/memory layers stay identical.

## What's verified by this prototype (acceptance criteria, SPEC §9)

1. ✅ Pick a companion, converse in Chinese, get in-character + level-appropriate replies.
2. ✅ Perceptible level difference — A1 replies are short + allow an English crutch + slow TTS;
   C2 replies are long, complex, fast, Chinese-only. (Visible in the 🔍 debug drawer and audible.)
3. ✅ Second session with the same companion naturally references the first (memory injection).
4. ⏳ Overseas latency — measure once `ENGINE=minimax` is live from the target region (Phase 0's
   one remaining hard check; the harness is ready).
5. ✅ Avatar tier swap is zero business change — `avatar.js` dispatches on `avatarConfig.tier`.

## Architecture notes

- **Zero npm dependencies.** Built-in Node `http` + `fetch`. (CLAUDE.md: 保持依赖最少.)
- **Everything external is behind an adapter.** Swap vendor = add an impl, change `ENGINE`.
- **Secrets** live in `.env` (gitignored), never in code (CLAUDE.md §安全与合规).
- **Memory recall** is MVP "最近 N 条 + 全部 facts" — no vectors (that's Phase 2). Stored as JSON
  files under `data/memory/` (swap for Supabase/Firebase behind `MemoryStore`).
- **Out of scope** (per spec): 识字/HSK课程/SRS/发音评分/安卓/实时数字人. Data structures reserve
  room (`avatarConfig.tier`, `tags`, `chineseLevel`) but none are implemented.

## Project layout

```
server/
  config.js                  # env + engine flag (.env loader, no dotenv)
  server.js                  # http + JSON API (orchestration)
  core/
    voice/    VoiceEngine.js  MockVoiceEngine.js  MiniMaxVoiceEngine.js
    llm/      Brain.js  MockBrain.js  MiniMaxBrain.js  Summarizer.js
    prompt/   PromptAssembler.js
    memory/   MemoryStore.js  models.js
    companions/ CompanionRepository.js
public/
  index.html  css/styles.css
  js/  app.js  api.js
       features/ companionList.js  conversation.js  avatar.js  memory.js
       voice/ webSpeech.js
data/
  companions.seed.json       # 20 seed companions (from the spec attachment)
  memory/                    # runtime memory store (gitignored)
```
