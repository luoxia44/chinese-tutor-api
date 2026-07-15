// 模拟真机时序：连接 → 等开场白播完(assistant_done) → 再发用户语音 → 等第二轮回复。
// 用法: [WS_BASE=wss://...] node scripts/test-proxy-phase2.js [companionId]
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pcm = readFileSync(resolve(process.cwd(), '.tmpaudio/utt.pcm'));
const cid = process.argv[2] || 'barista-xiaomin';
const WSB = process.env.WS_BASE || 'ws://localhost:5173';
const ws = new WebSocket(WSB + '/ws/realtime?companionId=' + cid + '&userId=demo-user');
const send = (o) => ws.send(JSON.stringify(o));
const t0 = Date.now();
let phase = 'greet', deltas = '', audioBytes = 0, doneCount = 0;

function streamUser() {
  console.log('[phase2] greeting finished → now speaking', pcm.length, 'bytes @', Date.now() - t0, 'ms');
  let i = 0;
  const iv = setInterval(() => {
    if (i >= pcm.length) { clearInterval(iv); console.log('[phase2] done speaking, waiting for VAD/reply…'); return; }
    send({ type: 'audio', data: pcm.subarray(i, i + 3200).toString('base64') });
    i += 3200;
  }, 100);
}

ws.on('message', (data) => {
  let m; try { m = JSON.parse(data.toString()); } catch { return; }
  if (m.type === 'ready') console.log('[ready]', Date.now() - t0, 'ms (phase=greet, not sending audio yet)');
  if (m.type === 'vad') console.log('[vad]', m.active ? 'START' : 'STOP', Date.now() - t0, 'ms');
  if (m.type === 'user_transcript') console.log('[ASR heard]', m.text);
  if (m.type === 'assistant_delta') { if (phase === 'reply') deltas += m.text; }
  if (m.type === 'assistant_audio') audioBytes += Buffer.from(m.data, 'base64').length;
  if (m.type === 'assistant_done') {
    doneCount++;
    if (phase === 'greet') { phase = 'reply'; audioBytes = 0; setTimeout(streamUser, 800); }
    else {
      console.log('\n=== ROUND 2 DONE ===');
      console.log('reply:', deltas);
      console.log('audio:', audioBytes, 'bytes (~' + (audioBytes / 48000).toFixed(1) + 's)');
      ws.close(); process.exit(0);
    }
  }
  if (m.type === 'error') console.log('[error]', m.message);
});
ws.on('close', () => { console.log('[closed] phase=' + phase); process.exit(phase === 'reply' && deltas ? 0 : 1); });
ws.on('error', (e) => { console.log('[ws error]', e.message); process.exit(1); });
setTimeout(() => { console.log('[TIMEOUT 60s] phase=' + phase, '| got reply:', !!deltas); ws.close(); }, 60000);
