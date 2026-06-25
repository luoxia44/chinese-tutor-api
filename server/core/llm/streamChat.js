// streamChat.js — MiniMax chat 流式输出 → 按句切分，每完成一句回调（供逐句 TTS）。
// 让"打电话"有实时感：第一句一出来就能合成播放，不必等整段生成完。
const SENT_END = /[。！？!?…\n]/;

/**
 * @param {object} cfg config.minimax
 * @param {string} systemPrompt
 * @param {{role,content}[]} history
 * @param {(sentence:string)=>Promise<void>} onSentence  每完成一句调用（await）
 * @returns {Promise<string>} 完整回复
 */
export async function streamMiniMaxSentences(cfg, systemPrompt, history, onSentence) {
  const messages = [{ role: 'system', content: systemPrompt }, ...history];
  const res = await fetch(cfg.chatUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.chatModel, messages, temperature: 0.8, max_tokens: 100, stream: true }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '');
    throw new Error(`chat ${res.status}: ${t.slice(0, 180)}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', sent = '', full = '';

  const flush = async (force) => {
    const s = sent.trim();
    if (s && (force || s.length >= 2)) { sent = ''; await onSentence(s); }
    else if (force) sent = '';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const d = line.slice(5).trim();
      if (!d || d === '[DONE]') continue;
      let j; try { j = JSON.parse(d); } catch { continue; }
      if (j.base_resp && j.base_resp.status_code) throw new Error('MiniMax: ' + (j.base_resp.status_msg || j.base_resp.status_code));
      const delta = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
      if (!delta) continue;
      full += delta; sent += delta;
      // 句末标点即刷出；过长也刷（避免长句迟迟不出声）
      if (SENT_END.test(delta) || sent.length >= 22) await flush(false);
    }
  }
  await flush(true);
  return full;
}
