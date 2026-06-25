// VoiceEngine — the adapter facade the business layer depends on (SPEC §3.2 / §6.1).
// In the iOS app this is the end-to-end S2S session protocol. In this web prototype we expose
// synthesis (text → audio) behind the same seam; the browser owns mic capture + STT + playback.
//
// interface VoiceEngine {
//   name: string
//   streams: boolean
//   synthesize(text, voiceId, opts?): Promise<{audioBase64, mime} | null>
//   synthesizeStream?(text, voiceId, opts, onChunk): Promise<void>   // streaming engines only
// }
import { config } from '../../config.js';
import { MockVoiceEngine } from './MockVoiceEngine.js';
import { MiniMaxVoiceEngine } from './MiniMaxVoiceEngine.js';
import { MiniMaxStreamVoiceEngine } from './MiniMaxStreamVoiceEngine.js';

export function createVoiceEngine() {
  if (config.engine === 'minimax') {
    return config.voiceStreaming
      ? new MiniMaxStreamVoiceEngine(config.minimax)
      : new MiniMaxVoiceEngine(config.minimax);
  }
  return new MockVoiceEngine();
}
