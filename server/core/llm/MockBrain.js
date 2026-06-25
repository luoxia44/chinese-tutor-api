// MockBrain — offline, deterministic, LEVEL-AWARE stand-in for the dialogue brain.
// Purpose: let the whole loop (talk → in-character reply → memory) run and be verified
// WITHOUT any API key. It is intentionally simple — the real intelligence is MiniMaxBrain.
//
// It still demonstrates acceptance #2 ("难度可感差异"): replies visibly shorten / add an
// English crutch / use pinyin at low levels, and lengthen + drop English at high levels.
// It parses the injected system prompt to recover the character's level + name so it stays
// data-driven (no hardcoded per-character logic).

export class MockBrain {
  constructor() {
    this.name = 'mock';
  }

  async reply(systemPrompt, history) {
    const cefr = (systemPrompt.match(/水平约 (A1|A2|B1|B2|C1|C2)/) || [])[1] || 'B1';
    const name = (systemPrompt.match(/你叫(.+?)，/) || [])[1] || '';
    const allowEnglish = /可以用一句英文提示/.test(systemPrompt);
    const remembers = !/这是你和这位学习者的第一次对话/.test(systemPrompt.split('【记忆】')[1] || '');
    const lastUser = [...history].reverse().find((m) => m.role === 'user');
    const userText = lastUser ? lastUser.content : '';
    const turn = history.filter((m) => m.role === 'user').length;

    // Tier buckets drive sentence length + style.
    const tier = { A1: 0, A2: 0, B1: 1, B2: 1, C1: 2, C2: 2 }[cefr] ?? 1;

    const ack = this._ack(userText, tier);
    const followUp = this._followUp(tier, turn);
    const memoryNudge = remembers && turn <= 1 ? this._memoryNudge(tier) : '';
    const english = allowEnglish && tier === 0 ? this._englishHint(userText) : '';

    let parts = [memoryNudge, ack, followUp].filter(Boolean);
    let reply = parts.join(tier === 0 ? ' ' : '');
    if (english) reply += ` ${english}`;

    // Prefix so it's obvious in the UI this is the offline brain, not MiniMax.
    return `${reply}`.trim();
  }

  _ack(userText, tier) {
    const t = (userText || '').trim();
    if (!t) return ['你好。', '好的。', '嗯，明白了。'][tier];
    if (tier === 0) return '好的！';
    if (tier === 1) return '嗯，我明白你的意思。';
    return '原来如此，你说的这一点其实挺值得深入聊聊的。';
  }

  _followUp(tier, turn) {
    const a1 = ['你要什么？', '还要别的吗？', '好的，谢谢！', '没问题。'];
    const b1 = ['那你平时喜欢做什么呢？', '可以跟我多说一点吗？', '听起来不错，后来呢？'];
    const c1 = [
      '那么从你的角度看，这件事背后真正的原因是什么？',
      '我很好奇——如果换一个立场，你的判断会不会不一样？',
      '这个观点很有意思，能不能再展开讲讲你的依据？',
    ];
    const pool = [a1, b1, c1][tier];
    return pool[turn % pool.length];
  }

  _memoryNudge(tier) {
    if (tier === 0) return '又见面啦！';
    if (tier === 1) return '上次聊得挺开心的，今天怎么样？';
    return '好久不见，上次我们聊到一半的话题，我一直记着。';
  }

  _englishHint(userText) {
    if (!userText) return '(You can answer in Chinese, take your time.)';
    return '(If you get stuck, just say it slowly — 慢慢来.)';
  }
}
