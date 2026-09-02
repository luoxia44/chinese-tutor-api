// QwenRealtimeProxy — 浏览器/App ↔ 后端 ↔ 阿里百炼 Qwen-Omni Realtime 的 WebSocket 桥。
// 后端注入 API key（不暴露给前端）+ 角色人设(instructions) + 服务端 VAD(自动断句/打断)。
// 对前端暴露极简协议；Qwen 的 OpenAI-Realtime 事件细节都在这里消化。
//
// 前端 → 后端:
//   { type:'audio', data: <base64 PCM16 16k mono> }   // 麦克风帧，持续发
//   { type:'cancel' }                                  // 主动打断当前回复
// 后端 → 前端:
//   { type:'ready' }                                   // 会话已配置，可以说话
//   { type:'vad', active:true|false }                  // 检测到用户开始/停止说话
//   { type:'user_transcript', text }                   // 你说的话(ASR)
//   { type:'assistant_delta', text }                   // 对方回复字幕(流式)
//   { type:'assistant_audio', data:<base64 PCM16 24k> }// 对方语音帧
//   { type:'assistant_done' }
//   { type:'error', message }
import { WebSocketServer, WebSocket } from 'ws';
import { config } from '../../config.js';
import { CompanionRepository } from '../companions/CompanionRepository.js';
import { assembleSystemPrompt } from '../prompt/PromptAssembler.js';
import { MemoryStore } from '../memory/MemoryStore.js';

// 千问实时音色：按性别 + 年龄分配（均已实测在 qwen3.5-omni-flash-realtime 上可用）。
// 成熟/年长角色用 Harvey(男)/Katerina(女)；年轻女声在 Tina/Serena 间按角色区分，避免都一个声音。
// ⚠️ Cherry 在 flash 上报 "Voice 'Cherry' is not supported"（response 阶段 400 → 全程无声，像断线）——勿加回。
const YOUNG_F = ['Tina', 'Serena'];
const hashIdx = (s, n) => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % n; };
const VOICE_FOR = (companion) => {
  if (process.env.QWEN_VOICE) return process.env.QWEN_VOICE; // 测试用：固定音色覆盖
  const isQwen3 = /qwen3/i.test(config.qwen.model || '');
  const id = companion.identity || {};
  const v = (companion.voiceId || '').toLowerCase();
  const female = id.gender ? id.gender === 'female' : v.includes('female');
  const age = Number(id.age) || 30;
  const mature = age >= 50; // 50 岁以上用年长音色
  if (isQwen3) {
    if (female) return mature ? 'Katerina' : YOUNG_F[hashIdx(companion.id, YOUNG_F.length)];
    return mature ? 'Harvey' : 'Ethan';
  }
  return female ? 'Chelsie' : 'Ethan'; // turbo 合法音色
};

export function attachRealtime(httpServer, path = '/ws/realtime') {
  if (!config.qwen.apiKey) {
    console.warn('[realtime] DASHSCOPE_API_KEY 未配置 → 实时语音代理未启用。');
    return;
  }
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, `http://${req.headers.host}`); } catch { socket.destroy(); return; }
    if (url.pathname !== path) return; // 其它 upgrade 不归我们管
    wss.handleUpgrade(req, socket, head, (client) => bridge(client, url));
  });

  console.log(`  realtime: Qwen-Omni S2S 代理已挂载 ws ${path}  (model ${config.qwen.model})`);
}

function bridge(client, url) {
  const companionId = url.searchParams.get('companionId');
  const userId = url.searchParams.get('userId') || 'demo-user';
  const greet = url.searchParams.get('greet') !== '0'; // 重连时 greet=0 → 不重复开场白
  const companion = CompanionRepository.byId(companionId);
  if (!companion) { send(client, { type: 'error', message: 'companion not found' }); client.close(); return; }

  // ⚠️ 指令长度悬崖（实测 qwen3.5-omni-flash-realtime）：instructions 超过 ~950 字符后，
  // semantic_vad 触发的回复会变成空响应（无文字无音频，像断线）。重度用户记忆一多必撞。
  // 对策：总长预算 880，超出时只裁记忆块（永不裁人设/等级规则），并在句号处截断。
  const MAX_INSTR = 880;
  const RT_SUFFIX = '\n\n【这是实时语音通话】像真人打电话一样说话。'; // 其余口语/简短/不念注释的要求已在 PromptAssembler 的【怎么说】里，别重复占预算
  const SLOW_ADD = '\n\n【慢速】对方要求慢速：说得非常慢，每个词咬清楚，句子更短，句间停顿明显。';
  const slowMode = url.searchParams.get('slow') === '1';
  let memoryBlock = MemoryStore.buildInjection(userId, companionId);
  const assemble = () => assembleSystemPrompt(companion, memoryBlock) + RT_SUFFIX + (slowMode ? SLOW_ADD : '');
  let instructions = assemble();
  if (instructions.length > MAX_INSTR && memoryBlock) {
    const keep = Math.max(0, memoryBlock.length - (instructions.length - MAX_INSTR));
    let cut = memoryBlock.slice(0, keep);
    const dot = cut.lastIndexOf('。');
    if (dot > 40) cut = cut.slice(0, dot + 1); // 尽量在句号处截断
    memoryBlock = cut;
    instructions = assemble();
    console.log(`[realtime] instructions trimmed to ${instructions.length} chars (memory ${cut.length})`);
  }

  const qUrl = config.qwen.url + '?model=' + config.qwen.model;
  const qwen = new WebSocket(qUrl, { headers: { Authorization: 'Bearer ' + config.qwen.apiKey } });

  let qOpen = false;
  let replyStart = true; // 每条回复开头态：千问流式字幕常吞首音节，剩下的标点(如"，")不该当开头显示
  const toQwen = (o) => { if (qOpen && qwen.readyState === WebSocket.OPEN) qwen.send(JSON.stringify(o)); };

  console.log('[realtime] bridge start companion=' + companionId + ' → ' + qUrl);
  qwen.on('open', () => { qOpen = true; console.log('[realtime] qwen open'); });
  qwen.on('error', (e) => { console.log('[realtime] qwen error:', e.message); send(client, { type: 'error', message: 'upstream: ' + e.message }); });
  qwen.on('close', (code, reason) => { console.log('[realtime] qwen close', code, reason && reason.toString()); try { client.close(); } catch {} });

  // 完整 session 配置。慢速是"连接时参数"（&slow=1）：qwen3.5 实测不接受会话中途
  // session.update（之后回复变空响应），所以切换慢速由客户端断开重连，本桥只在建会话时定死。
  let readySent = false; // 防御：session.updated 若重复到来，ready/开场白只做一次
  const buildSession = () => {
    const isQwen3 = /qwen3/i.test(config.qwen.model || '');
    return {
      modalities: ['text', 'audio'],
      voice: VOICE_FOR(companion),
      instructions,
      input_audio_format: isQwen3 ? 'pcm' : 'pcm16',
      output_audio_format: isQwen3 ? 'pcm' : 'pcm16',
      input_audio_transcription: { model: 'gummy-realtime-v1' },
      turn_detection: isQwen3
        ? { type: 'semantic_vad' } // qwen3.x 用 semantic_vad（server_vad 会空响应）
        : { type: 'server_vad', threshold: 0.2, prefix_padding_ms: 300, silence_duration_ms: 700 },
    };
  };

  qwen.on('message', (data) => {
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    switch (m.type) {
      case 'session.created':
        toQwen({ type: 'session.update', session: buildSession() });
        break;
      case 'session.updated':
        // 慢速开关也会触发 session.updated：ready 只发一次、开场白只打一次
        if (!readySent) {
          readySent = true;
          send(client, { type: 'ready' });
          if (greet) toQwen({ type: 'response.create', response: { instructions: '用一句自然简短的中文先主动跟对方打个招呼，开启这通电话。' } });
        }
        break;
      case 'input_audio_buffer.speech_started':
        send(client, { type: 'vad', active: true });     // 用户开口 → 前端清空在播音频(打断)
        break;
      case 'input_audio_buffer.speech_stopped':
        send(client, { type: 'vad', active: false });
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (m.transcript) send(client, { type: 'user_transcript', text: m.transcript });
        break;
      case 'response.audio_transcript.delta': {
        let text = m.delta || '';
        if (replyStart && text) {
          text = text.replace(/^[^\p{Script=Han}A-Za-z0-9]+/u, ''); // 开头只允许汉字/字母/数字：吞首音节残留的标点、杂符(>、》…)全清
          if (text) replyStart = false; // 出现第一个真实字符后恢复原样透传
        }
        if (text) send(client, { type: 'assistant_delta', text });
        break;
      }
      case 'response.done':
        replyStart = true;
        send(client, { type: 'assistant_done' });
        break;
      case 'response.audio.delta':
        if (m.delta) send(client, { type: 'assistant_audio', data: m.delta });
        break;
      case 'error':
        send(client, { type: 'error', message: (m.error && m.error.message) || 'qwen error' });
        break;
      default:
        if (/audio|response/i.test(m.type)) console.log('[realtime] qwen evt:', m.type, m.delta ? '(has delta ' + (m.delta.length) + ')' : '');
        break;
    }
  });

  client.on('message', (data) => {
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    if (m.type === 'audio' && m.data) toQwen({ type: 'input_audio_buffer.append', audio: m.data });
    else if (m.type === 'cancel') toQwen({ type: 'response.cancel' });
    // （慢速切换不走消息：客户端带 &slow=1 重连；中途 session.update 会导致 qwen3.5 空响应）
  });
  client.on('close', () => { try { qwen.close(); } catch {} });
  client.on('error', () => { try { qwen.close(); } catch {} });
}

function send(ws, obj) { try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {} }
