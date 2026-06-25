// MiniMaxVoiceEngine — text → speech via MiniMax T2A v2 REST (overseas endpoint, spec §3.3).
// The reliable real-voice path. All MiniMax wire details are sealed here. For the iOS app this
// is replaced by the true end-to-end Realtime S2S session — same VoiceEngine seam.
import { resolveVoiceId, speedFor } from './voiceMap.js';

const hexToBase64 = (hex) => Buffer.from(hex, 'hex').toString('base64');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class MiniMaxVoiceEngine {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = `minimax:${cfg.ttsModel}`;
    this.streams = false;
  }

  async synthesize(text, voiceId, opts = {}) {
    // MiniMax T2A takes GroupId as a query param (optional on the global site).
    const url = this.cfg.groupId
      ? `${this.cfg.ttsUrl}?GroupId=${encodeURIComponent(this.cfg.groupId)}`
      : this.cfg.ttsUrl;
    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.ttsModel,
        text,
        stream: false,
        voice_setting: {
          voice_id: resolveVoiceId(voiceId),
          speed: opts.speechRate ? speedFor(opts.speechRate) : 1.0,
          vol: 1.0, pitch: 0,
        },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      }),
    };

    // Retry transient network failures ("fetch failed") once — observed to happen occasionally.
    let res, lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { res = await fetch(url, init); break; }
      catch (e) { lastErr = e; if (attempt === 0) await sleep(250); }
    }
    if (!res) throw lastErr;

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`MiniMax T2A ${res.status}: ${t.slice(0, 200)}`);
    }
    const data = await res.json();
    if (data.base_resp && data.base_resp.status_code && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax T2A error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
    }
    const hex = data?.data?.audio;
    if (!hex) return null;
    return { audioBase64: hexToBase64(hex), mime: 'audio/mpeg' };
  }
}
