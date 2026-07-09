// 模拟前端，测后端实时代理：连 /ws/realtime → 等 ready → 发 PCM 帧 → 收字幕/音频。
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pcm = readFileSync(resolve(process.cwd(), '.tmpaudio/utt.pcm'));
const cid = process.argv[2] || 'coworker-coco'; // 可传角色id: node scripts/test-proxy.js streamer-damei
const ws = new WebSocket('ws://localhost:5173/ws/realtime?companionId=' + cid + '&userId=demo-user');
const send = (o) => ws.send(JSON.stringify(o));
const t0 = Date.now();
let audioBytes = 0, deltas = '', userT = '', firstAudio = 0, got = {};

ws.on('open', () => console.log('[client open]'));
ws.on('message', (data) => {
  let m; try { m = JSON.parse(data.toString()); } catch { return; }
  got[m.type] = (got[m.type] || 0) + 1;
  if (m.type === 'ready') {
    console.log('[ready]', Date.now() - t0, 'ms → streaming', pcm.length, 'bytes');
    let i = 0;
    const iv = setInterval(() => {
      if (i >= pcm.length) { clearInterval(iv); return; }   // server VAD 自动断句出回复
      send({ type: 'audio', data: pcm.subarray(i, i + 3200).toString('base64') });
      i += 3200;
    }, 100); // 实时节奏：每 100ms 一帧
  }
  if (m.type === 'vad') console.log('[vad]', m.active ? 'speech START' : 'speech STOP', Date.now() - t0, 'ms');
  if (m.type === 'user_transcript') { userT = m.text; console.log('[ASR heard]', m.text); }
  if (m.type === 'assistant_delta') deltas += m.text;
  if (m.type === 'assistant_audio') { if (!firstAudio) { firstAudio = Date.now() - t0; console.log('[first audio]', firstAudio, 'ms'); } audioBytes += Buffer.from(m.data, 'base64').length; }
  if (m.type === 'assistant_done') {
    console.log('\n=== DONE ===');
    console.log('events:', JSON.stringify(got));
    console.log('first audio:', firstAudio, 'ms | audio bytes:', audioBytes, '(~' + (audioBytes / 48000).toFixed(1) + 's)');
    console.log('reply:', deltas);
    ws.close();
  }
  if (m.type === 'error') console.log('[error]', m.message);
});
ws.on('close', () => { console.log('[closed]'); process.exit(0); });
ws.on('error', (e) => { console.log('[ws error]', e.message); process.exit(1); });
setTimeout(() => { console.log('[timeout]', JSON.stringify(got)); ws.close(); }, 45000);
