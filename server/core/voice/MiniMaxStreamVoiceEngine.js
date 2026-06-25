// MiniMaxStreamVoiceEngine — text → speech via MiniMax T2A v2 over WebSocket (streaming).
// Lower first-audio latency: audio arrives as the model synthesizes. This is the stepping
// stone toward the iOS end-to-end Realtime S2S session (same protocol family).
//
// Protocol (wss://api.minimax.io/ws/v1/t2a_v2):
//   connect → {event:connected_success} → send task_start → {event:task_started}
//   → send task_continue(text) → repeated {data:{audio:<hex>}, is_final} → send task_finish
//   → {event:task_finished}
//
// NOTE: uses Node's built-in WebSocket (undici) with the non-standard {headers} option for the
// Bearer auth. Verified path requires a real key — untested here. Falls back to REST on any error.
import { resolveVoiceId, speedFor } from './voiceMap.js';

const hexToBuf = (hex) => Buffer.from(hex, 'hex');

export class MiniMaxStreamVoiceEngine {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = `minimax-stream:${cfg.ttsModel}`;
    this.streams = true;
  }

  /**
   * Stream synthesis. Calls onChunk({ audioBase64, mime, final }) per audio frame.
   * Resolves when the server reports the task finished.
   */
  synthesizeStream(text, voiceId, opts = {}, onChunk = () => {}) {
    return new Promise((resolve, reject) => {
      let ws;
      try {
        ws = new WebSocket(this.cfg.ttsWsUrl, {
          headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
        });
      } catch (e) {
        return reject(e);
      }
      let settled = false;
      const done = (fn, arg) => { if (settled) return; settled = true; try { ws.close(); } catch {} fn(arg); };
      const send = (o) => ws.send(JSON.stringify(o));

      ws.addEventListener('message', (ev) => {
        let msg;
        try { msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString()); } catch { return; }

        if (msg.event === 'connected_success') {
          send({
            event: 'task_start',
            model: this.cfg.ttsModel,
            voice_setting: {
              voice_id: resolveVoiceId(voiceId),
              speed: opts.speechRate ? speedFor(opts.speechRate) : 1.0,
              vol: 1.0, pitch: 0,
            },
            audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
          });
        } else if (msg.event === 'task_started') {
          send({ event: 'task_continue', text });
        } else if (msg.data && msg.data.audio) {
          onChunk({ audioBase64: hexToBuf(msg.data.audio).toString('base64'), mime: 'audio/mpeg', final: !!msg.is_final });
          if (msg.is_final) send({ event: 'task_finish' });
        } else if (msg.event === 'task_finished') {
          done(resolve);
        } else if (msg.event === 'task_failed' || (msg.base_resp && msg.base_resp.status_code)) {
          done(reject, new Error(`MiniMax WS T2A failed: ${msg.base_resp?.status_msg || 'unknown'}`));
        }
      });
      ws.addEventListener('error', (e) => done(reject, new Error(`MiniMax WS error: ${e?.message || 'connection'}`)));
      ws.addEventListener('close', () => { if (!settled) { settled = true; resolve(); } });
    });
  }

  // Aggregate fallback so this also satisfies the plain VoiceEngine.synthesize() contract.
  async synthesize(text, voiceId, opts = {}) {
    const bufs = [];
    await this.synthesizeStream(text, voiceId, opts, (c) => bufs.push(Buffer.from(c.audioBase64, 'base64')));
    if (!bufs.length) return null;
    return { audioBase64: Buffer.concat(bufs).toString('base64'), mime: 'audio/mpeg' };
  }
}
