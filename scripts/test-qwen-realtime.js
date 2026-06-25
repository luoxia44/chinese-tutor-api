// 验证 Qwen-Omni Realtime：连接 → session.update → 发一句文本 → 统计返回的音频/字幕。
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 读 .env
const env = {};
for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.DASHSCOPE_API_KEY;
const MODEL = env.QWEN_REALTIME_MODEL || 'qwen-omni-turbo-realtime';
const URL = (env.QWEN_REALTIME_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime') + '?model=' + MODEL;

console.log('connecting', URL);
const ws = new WebSocket(URL, { headers: { Authorization: 'Bearer ' + KEY } });

let audioBytes = 0, transcript = '', got = {};
const t0 = Date.now();
let firstAudioMs = 0;

const send = (o) => ws.send(JSON.stringify(o));
ws.on('open', () => { console.log('[open]', Date.now() - t0, 'ms'); });

let rawCount = 0, sentItem = false, sentResp = false;
ws.on('message', (data) => {
  if (rawCount < 12) { console.log('[msg]', data.toString().slice(0, 200)); rawCount++; }
  let m; try { m = JSON.parse(data.toString()); } catch { return; }
  got[m.type] = (got[m.type] || 0) + 1;

  if (m.type === 'session.updated' && !sentItem) {
    sentItem = true;
    send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'text', text: '你好，用中文简单介绍一下你自己。' }] } });
    setTimeout(() => { if (!sentResp) { sentResp = true; console.log('[fallback response.create]'); send({ type: 'response.create' }); } }, 2500);
  }
  if (m.type === 'session.created') {
    send({ type: 'session.update', session: { modalities: ['text', 'audio'], voice: 'Chelsie', output_audio_format: 'pcm16' } });
  }
  if (m.type === 'conversation.item.created' && !sentResp) {
    sentResp = true;
    send({ type: 'response.create' });
  }
  if (m.type === 'response.audio.delta' && m.delta) {
    if (!firstAudioMs) { firstAudioMs = Date.now() - t0; console.log('[first audio]', firstAudioMs, 'ms'); }
    audioBytes += Buffer.from(m.delta, 'base64').length;
  }
  if (m.type === 'response.audio_transcript.delta' && m.delta) transcript += m.delta;
  if (m.type === 'error') console.log('[error]', JSON.stringify(m));
  if (m.type === 'response.done') {
    console.log('\n=== DONE ===');
    console.log('events:', JSON.stringify(got));
    console.log('first audio:', firstAudioMs, 'ms | audio bytes:', audioBytes, '(~' + (audioBytes / 48000).toFixed(1) + 's @24k pcm16)');
    console.log('transcript:', transcript);
    ws.close();
  }
});

ws.on('error', (e) => { console.log('[ws error]', e.message); });
ws.on('close', (code, reason) => { console.log('[closed] code=' + code, 'reason=' + (reason && reason.toString())); process.exit(0); });
ws.on('unexpected-response', (req, res) => { console.log('[unexpected-response] status=' + res.statusCode); let b=''; res.on('data',d=>b+=d); res.on('end',()=>console.log('body:',b.slice(0,300))); });
setTimeout(() => { console.log('[timeout] events so far:', JSON.stringify(got)); ws.close(); }, 30000);
