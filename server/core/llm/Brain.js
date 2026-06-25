// Brain — the dialogue LLM adapter interface + factory.
// "所有外部 AI 服务走适配器接口…换厂商=加实现，不改 ViewModel" (CLAUDE.md §架构原则).
// ≙ SwiftUI's VoiceEngine protocol pattern (SPEC §6.1), applied to the text dialogue brain.
//
// A Brain turns (systemPrompt + message history) → assistant reply text.
// In the production iOS app this collapses into the end-to-end VoiceEngine (S2S);
// in this web prototype the text brain and the TTS voice are separate adapters
// behind the same VoiceEngine facade (see core/voice/).
//
// interface Brain {
//   reply(systemPrompt: string, history: {role, content}[]): Promise<string>
//   name: string
// }

import { config } from '../../config.js';
import { MockBrain } from './MockBrain.js';
import { MiniMaxBrain } from './MiniMaxBrain.js';

export function createBrain() {
  if (config.engine === 'minimax') return new MiniMaxBrain(config.minimax);
  return new MockBrain();
}
