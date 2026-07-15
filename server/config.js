// Central config + feature flags.
// "会变贵或会变的东西做成可开关、可降级" (CLAUDE.md §架构原则) — engine choice is a flag.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');

// Minimal .env loader (no dotenv dependency — keep deps at zero).
function loadEnv() {
  const path = resolve(ROOT, '.env');
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const env = process.env;

// If ENGINE=minimax but no key is present, fall back to mock so the app still runs.
let engine = (env.ENGINE || 'mock').toLowerCase();
if (engine === 'minimax' && !env.MINIMAX_API_KEY) {
  console.warn('[config] ENGINE=minimax but MINIMAX_API_KEY is empty → falling back to mock engine.');
  engine = 'mock';
}

export const config = {
  port: Number(env.PORT) || 5173,
  engine, // 'mock' | 'minimax'
  // Stream MiniMax audio over WebSocket (lower first-audio latency). Default off — the REST
  // path is the reliable one; streaming is the bridge toward the iOS end-to-end S2S session.
  voiceStreaming: String(env.VOICE_STREAMING || '').toLowerCase() === 'true',
  minimax: {
    apiKey: env.MINIMAX_API_KEY || '',
    groupId: env.MINIMAX_GROUP_ID || '', // required by the T2A voice endpoint
    chatUrl: env.MINIMAX_CHAT_URL || 'https://api.minimax.io/v1/text/chatcompletion_v2',
    chatModel: env.MINIMAX_CHAT_MODEL || 'MiniMax-Text-01',
    ttsUrl: env.MINIMAX_TTS_URL || 'https://api.minimax.io/v1/t2a_v2',
    ttsWsUrl: env.MINIMAX_TTS_WS_URL || 'wss://api.minimax.io/ws/v1/t2a_v2',
    ttsModel: env.MINIMAX_TTS_MODEL || 'speech-2.6-hd',
  },
  // 阿里百炼 Qwen-Omni 实时语音（音频优先 S2S，端到端打电话）
  qwen: {
    apiKey: env.DASHSCOPE_API_KEY || '',
    model: env.QWEN_REALTIME_MODEL || 'qwen-omni-turbo-realtime',
    url: env.QWEN_REALTIME_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
  },
  // 记忆总结器：显式 SUMMARIZER_* > MiniMax > DashScope(千问，OpenAI 兼容接口) > 无 key(启发式)。
  // 生产(Render)只配了 DASHSCOPE_API_KEY → 自动走千问 qwen-flash，记忆提取才是真 LLM。
  summarizer: env.SUMMARIZER_URL
    ? {
        url: env.SUMMARIZER_URL,
        model: env.SUMMARIZER_MODEL || 'qwen-flash',
        apiKey: env.SUMMARIZER_API_KEY || env.DASHSCOPE_API_KEY || env.MINIMAX_API_KEY || '',
      }
    : env.MINIMAX_API_KEY
      ? {
          url: env.MINIMAX_CHAT_URL || 'https://api.minimax.io/v1/text/chatcompletion_v2',
          model: env.SUMMARIZER_MODEL || env.MINIMAX_CHAT_MODEL || 'MiniMax-Text-01',
          apiKey: env.MINIMAX_API_KEY,
        }
      : {
          url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
          model: env.SUMMARIZER_MODEL || 'qwen-flash',
          apiKey: env.DASHSCOPE_API_KEY || '', // 空则 Summarizer 走启发式
        },
};
