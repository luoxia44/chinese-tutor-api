// Coach — 通话结束后的表达点评（"一夸两改"）。
//
// 动机：数据上 D35 的付费转化是 D1 的三倍多，钱在长尾里；而挂断后用户手上什么都不剩，
// 所以只有 33% 会打第二通。点评把一次性的对话变成能积累的东西 —— 这是留存的抓手，
// 也是相对"免费语音助手也能陪你聊中文"的差异点：陪聊是白菜，点评才是能收钱的。
//
// 三条设计红线（做错了会反噬，见复盘文档）：
//   1. 只在挂断后跑，绝不在通话中打断纠错 —— 那是 AI 家教差评的头号来源。
//   2. 一次最多三条：先夸一句，再改最多两句。全量纠错对初学者是劝退。
//   3. 宁可空手而归也不要凑数 —— 说得少、没什么可改的时候就返回空，别硬编。
//
// 成本：一次 qwen-flash 文本调用，几百 token，单次 < ¥0.001。
import { config } from '../../config.js';

// UI 语言 → 让模型用哪种语言写 why（学习者要看懂解释，所以不能用中文）
const LANG_NAME = {
  en: 'English', es: 'Spanish', ja: 'Japanese',
  ko: 'Korean', fr: 'French', pt: 'Portuguese', zh: '简体中文',
};

const MAX_FIXES = 2;        // 一次最多改两句
const MIN_USER_TURNS = 2;   // 说得太少就不点评（秒挂/只说了个"你好"）
const MAX_SENT = 120;       // said / better 的长度上限，防模型跑飞
const MAX_WHY = 220;        // why 要用学习者母语写完整一句，120 会把英文解释拦腰截断

const promptFor = (langName) => `你是一位耐心的中文口语老师。下面是一位外国学习者和一个 AI 角色的对话记录。
只点评【学习者】说的话，不要点评 AI。

先做 fixes，再挑 win —— 顺序很重要，别拿一句本身有错的话去夸人。

fixes 规则：
1. 最多 ${MAX_FIXES} 句。按这个优先级挑，挑到就停：
   ① 明确的语法错 —— 量词用错（"一个咖啡"应该是"一杯咖啡"）、语序错、"了/的/得"用错、疑问句多加"吗"（"多少钱吗"应该是"多少钱"）。
   ② 意思对但中国人不这么说的表达。
   ③ 太书面、太生硬、像翻译腔的说法。
2. 不要提发音和声调 —— 你看到的是文字，听不到声音，猜发音一定会错。
3. 宁可少给也不要凑数。没有真正值得改的就给空数组 —— 为了凑满两条去改本来就没问题的句子，比不给还糟。
4. said 必须原样抄 ta 的原话片段，一个字都不要改写、不要补标点。
5. better 和原话意思相同、长度接近，是中国人日常真的会说的说法。

win 规则：
6. 从 ta 说过、且【没有出现在 fixes 里】的句子中挑一句真正说对的。用词地道、语法对、或者单纯敢开口都算。
7. 如果每句话都被 fixes 挑走了，win 就夸 ta 敢开口那一点，said 填其中最短的一句。

why 规则：
8. 用 ${langName} 写，一句话说清差别在哪，写完整不要半途而止。像朋友解释一样，不要用语法术语，不要说教。

只输出 JSON，不要任何解释、不要代码块标记：
{"win":{"said":"ta说得好的原话","why":"为什么好，一句话"},"fixes":[{"said":"原话","better":"更地道的说法","why":"差别在哪"}]}`;

const clean = (v, max = MAX_SENT) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cleanWhy = (v) => clean(v, MAX_WHY);

export class Coach {
  constructor(cfg = config.summarizer) {
    this.cfg = cfg; // 复用总结器的模型配置（生产上是 DashScope 的 qwen-flash）
  }

  /**
   * @param {object} args { transcript: {role,content}[], lang?: string }
   * @returns {Promise<{win: {said,why}|null, fixes: {said,better,why}[]}>}
   *          拿不到结果时返回空结构 —— 点评是加分项，绝不能让它拖垮挂断流程。
   */
  async analyze({ transcript = [], lang = 'en' } = {}) {
    const empty = { win: null, fixes: [] };
    const userTurns = transcript.filter((m) => m && m.role === 'user' && String(m.content || '').trim());
    if (userTurns.length < MIN_USER_TURNS) return empty; // 说得太少，没什么可点评的
    if (!this.cfg.apiKey) return empty;                  // 没 key 就不点评（点评没有启发式版本 —— 瞎改不如不改）

    try {
      const raw = await this._ask(transcript, LANG_NAME[lang] || LANG_NAME.en);
      return this._normalize(raw, userTurns);
    } catch (e) {
      console.warn('[coach] 点评失败，本次跳过:', e.message);
      return empty;
    }
  }

  async _ask(transcript, langName) {
    const convo = transcript
      .map((m) => `${m.role === 'user' ? '学习者' : 'AI'}：${m.content}`)
      .join('\n')
      .slice(-4000); // 超长通话只看最后一段，控制成本
    const res = await fetch(this.cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({
        model: this.cfg.model,
        messages: [
          { role: 'system', content: promptFor(langName) },
          { role: 'user', content: convo },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    });
    if (!res.ok) throw new Error(`coach ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse((text.match(/\{[\s\S]*\}/) || ['{}'])[0]);
  }

  // 模型输出不可信：截断、去空、限量，并且丢掉 said 不在原话里的条目（防编造）
  _normalize(raw, userTurns) {
    const saidPool = userTurns.map((m) => String(m.content));
    const isReal = (said) => !!said && saidPool.some((t) => t.includes(said));

    const fixes = [];
    for (const f of Array.isArray(raw?.fixes) ? raw.fixes : []) {
      const said = clean(f && f.said);
      const better = clean(f && f.better);
      if (!said || !better || said === better) continue;
      if (!isReal(said)) continue;                        // 模型编的原话，丢掉
      if (fixes.some((x) => x.better === better)) continue; // 同一条重复给
      fixes.push({ said, better, why: cleanWhy(f.why) });
      if (fixes.length >= MAX_FIXES) break;
    }

    // win 放在 fixes 之后算：模型偶尔会拿一句正在被纠正的话去夸人，那种表扬是自相矛盾的
    let win = null;
    const said = clean(raw?.win?.said);
    if (said && isReal(said) && !fixes.some((f) => f.said === said || said.includes(f.said))) {
      win = { said, why: cleanWhy(raw.win.why) };
    }
    return { win, fixes };
  }
}
