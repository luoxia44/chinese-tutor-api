// MiniMaxBrain — real dialogue brain via MiniMax chat completions (OpenAI-compatible).
// Overseas/global endpoint only (spec §3.3). All MiniMax specifics are sealed in here.
// ≙ SwiftUI Core/Voice/MiniMaxVoiceEngine.swift (the vendor-specific implementation).

export class MiniMaxBrain {
  constructor(cfg) {
    this.cfg = cfg;
    this.name = `minimax:${cfg.chatModel}`;
  }

  /**
   * @param {string} systemPrompt  from PromptAssembler
   * @param {{role:'user'|'assistant', content:string}[]} history
   * @returns {Promise<string>} assistant reply
   */
  async reply(systemPrompt, history) {
    const messages = [{ role: 'system', content: systemPrompt }, ...history];
    const res = await fetch(this.cfg.chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.chatModel,
        messages,
        temperature: 0.8,    // natural, in-character
        max_tokens: 90,      // 口语陪练就该短句快答 → 生成更快、TTS 更短、延迟更低
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`MiniMax chat ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    // OpenAI-compatible shape; MiniMax also returns a top-level base_resp on errors.
    if (data.base_resp && data.base_resp.status_code && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax chat error ${data.base_resp.status_code}: ${data.base_resp.status_msg}`);
    }
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error(`MiniMax chat: empty reply (${JSON.stringify(data).slice(0, 200)})`);
    return reply.trim();
  }
}
