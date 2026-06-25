// 验证 Qwen-Omni Realtime 音频闭环：append PCM16 → commit → response.create → 收 audio.delta + 字幕。
import WebSocket from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = {};
for (const line of readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const KEY = env.DASHSCOPE_API_KEY;
const MODEL = env.QWEN_REALTIME_MODEL || 'qwen-omni-turbo-realtime';
const URL = (env.QWEN_REALTIME_URL || 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime') + '?model=' + MODEL;

const pcm = readFileSync(resolve(process.cwd(), '.tmpaudio/utt.pcm'));
console.log('pcm bytes', pcm.length, '| connecting', MODEL);

const ws = new WebSocket(URL, { headers: { Authorization: 'Bearer ' + KEY } });
const send = (o) => ws.send(JSON.stringify(o));
const t0 = Date.now();
let audioBytes = 0, transcript = '', firstAudioMs = 0, got = {}, raw = 0;

ws.on('open', () => console.log('[open]', Date.now() - t0, 'ms'));
ws.on('message', (data) => {
  let m; try { m = JSON.parse(data.toString()); } catch { return; }
  got[m.type] = (got[m.type] || 0) + 1;
  if (raw < 14 && !m.type.includes('delta')) { console.log('[msg]', data.toString().slice(0, 160)); raw++; }

  if (m.type === 'session.created') {
    // 手动模式：关闭服务端 VAD，自己 commit
    send({ type: 'session.update', session: { modalities: ['text', 'audio'], voice: 'Chelsie', input_audio_format: 'pcm16', output_audio_format: 'pcm16', turn_detection: null, instructions: '你是一个友好的中文老师，请用简短自然的中文回应。' } });
  }
  if (m.type === 'session.updated') {
    // 分块发送音频（每块 ~3200 bytes = 100ms @16k pcm16）
    for (let i = 0; i < pcm.length; i += 3200) {
      send({ type: 'input_audio_buffer.append', audio: pcm.subarray(i, i + 3200).toString('base64') });
    }
    send({ type: 'input_audio_buffer.commit' });
    send({ type: 'response.create', response: { modalities: ['text', 'audio'] } });
    console.log('[sent] audio + commit + response.create');
  }
  if (m.type === 'response.audio.delta' && m.delta) {
    if (!firstAudioMs) { firstAudioMs = Date.now() - t0; console.log('[first audio]', firstAudioMs, 'ms'); }
    audioBytes += Buffer.from(m.delta, 'base64').length;
  }
  if ((m.type === 'response.audio_transcript.delta' || m.type === 'response.text.delta') && m.delta) transcript += m.delta;
  if (m.type === 'conversation.item.input_audio_transcription.completed') console.log('[ASR heard]', m.transcript);
  if (m.type === 'error') console.log('[ERROR]', JSON.stringify(m.error || m));
  if (m.type === 'response.done') {
    console.log('\n=== DONE ===');
    console.log('events:', JSON.stringify(got));
    console.log('first audio:', firstAudioMs, 'ms | audio bytes:', audioBytes, '(~%s s @24k)'.replace('%s', (audioBytes / 48000).toFixed(1)));
    console.log('reply transcript:', transcript);
    ws.close();
  }
});
ws.on('error', (e) => console.log('[ws error]', e.message));
ws.on('close', (c, r) => { console.log('[closed]', c, r && r.toString()); process.exit(0); });
setTimeout(() => { console.log('[timeout]', JSON.stringify(got)); ws.close(); }, 40000);
