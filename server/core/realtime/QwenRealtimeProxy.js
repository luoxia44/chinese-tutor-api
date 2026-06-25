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

const VOICE_FOR = (companion) => {
  if (process.env.QWEN_VOICE) return process.env.QWEN_VOICE; // 测试用：固定音色覆盖
  const isQwen3 = /qwen3/i.test(config.qwen.model || '');
  const v = (companion.voiceId || '').toLowerCase();
  const male = v.includes('male') && !v.includes('female');
  if (isQwen3) return male ? 'Ethan' : 'Tina';     // qwen3.x 合法音色（Cherry/Chelsie 在 flash 上不支持）
  return male ? 'Ethan' : 'Chelsie';               // turbo 合法音色
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

  const memoryBlock = MemoryStore.buildInjection(userId, companionId);
  const instructions = assembleSystemPrompt(companion, memoryBlock) +
    '\n\n【实时语音通话】像真人打电话一样，用自然口语、简短地回应；一次只说一两句；不要念括号注释、不要英文/拼音。';

  const qUrl = config.qwen.url + '?model=' + config.qwen.model;
  const qwen = new WebSocket(qUrl, { headers: { Authorization: 'Bearer ' + config.qwen.apiKey } });

  let qOpen = false;
  const toQwen = (o) => { if (qOpen && qwen.readyState === WebSocket.OPEN) qwen.send(JSON.stringify(o)); };

  console.log('[realtime] bridge start companion=' + companionId + ' → ' + qUrl);
  qwen.on('open', () => { qOpen = true; console.log('[realtime] qwen open'); });
  qwen.on('error', (e) => { console.log('[realtime] qwen error:', e.message); send(client, { type: 'error', message: 'upstream: ' + e.message }); });
  qwen.on('close', (code, reason) => { console.log('[realtime] qwen close', code, reason && reason.toString()); try { client.close(); } catch {} });

  qwen.on('message', (data) => {
    let m; try { m = JSON.parse(data.toString()); } catch { return; }
    switch (m.type) {
      case 'session.created': {
        // qwen3.x 实时模型推荐 semantic_vad（server_vad 不会自动触发回复 → 空响应）；turbo 用 server_vad。
        const isQwen3 = /qwen3/i.test(config.qwen.model || '');
        const turn_detection = isQwen3
          ? { type: 'semantic_vad' }
          : { type: 'server_vad', threshold: 0.2, prefix_padding_ms: 300, silence_duration_ms: 700 };
        toQwen({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: VOICE_FOR(companion),
            instructions,
            input_audio_format: isQwen3 ? 'pcm' : 'pcm16',
            output_audio_format: isQwen3 ? 'pcm' : 'pcm16',
            input_audio_transcription: { model: 'gummy-realtime-v1' },
            turn_detection,
          },
        });
        break;
      }
      case 'session.updated':
        send(client, { type: 'ready' });
        // 主动开场白：像接通电话先打招呼（仅首次连接；重连不重复）
        if (greet) toQwen({ type: 'response.create', response: { instructions: '用一句自然简短的中文先主动跟对方打个招呼，开启这通电话。' } });
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
      case 'response.audio_transcript.delta':
        if (m.delta) send(client, { type: 'assistant_delta', text: m.delta });
        break;
      case 'response.audio.delta':
        if (m.delta) send(client, { type: 'assistant_audio', data: m.delta });
        break;
      case 'response.done':
        send(client, { type: 'assistant_done' });
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
  });
  client.on('close', () => { try { qwen.close(); } catch {} });
  client.on('error', () => { try { qwen.close(); } catch {} });
}

function send(ws, obj) { try { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); } catch {} }
