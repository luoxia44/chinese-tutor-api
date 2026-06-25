// gen-styles.js — 用 DashScope 通义万相文生图，给同一角色(Vivian)出多种 galgame/乙女画风样板。
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const KEY = (env.match(/^DASHSCOPE_API_KEY=(.*)$/m) || [])[1];
if (!KEY) { console.error('no DASHSCOPE_API_KEY'); process.exit(1); }

const MODEL = process.env.MODEL || 'wan2.2-t2i-flash';
const SIZE = process.env.SIZE || '960*1440';
const OUT = path.join('D:', 'Skills', 'chinese-partner-app', 'style-samples');
fs.mkdirSync(OUT, { recursive: true });

// 角色基底：保持同一个人，只换画风，方便对比
const CHAR = process.env.CHAR ||
  'upper-body portrait of a 28-year-old elegant Chinese woman, long flowing dark-brown hair, gentle warm smile, refined fashionable outfit, looking at the viewer, a small cat near her shoulder, soft gradient studio background, single character, vertical character portrait';

const STYLES = [
  { key: 'otome_vn', name: '乙女视觉小说(柔和手绘)', p: 'otome dating-sim visual novel illustration, soft painterly anime style, romantic warm lighting, delicate beautiful features, bishoujo, pastel tones, highly detailed' },
  { key: 'modern_gacha', name: '现代手游卡牌(明快赛璐璐)', p: 'modern mobile gacha game character art, vibrant cel-shaded anime, crisp clean lineart, dramatic rim lighting, highly detailed, trending on pixiv, genshin-impact-like quality' },
  { key: 'manhwa', name: '韩系漫画(半写实潮流)', p: 'korean webtoon manhwa style, semi-realistic soft shading, fashionable trendy, clean delicate lineart, glossy lips, beautiful detailed eyes' },
  { key: 'classic_galge', name: '经典 galgame(2000 年代)', p: 'classic 2000s japanese galgame anime art style, clean cel shading, large expressive sparkling eyes, visual novel sprite, soft cheeks' },
  { key: 'painterly', name: '半写实厚涂(电影质感)', p: 'semi-realistic anime, painterly thick-paint rendering, cinematic soft light, intricate detail, artstation, elegant atmosphere' },
];

const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
async function submit(prompt) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
      body: JSON.stringify({ model: MODEL, input: { prompt }, parameters: { size: SIZE, n: 1 } }),
    });
    const d = await r.json();
    if (d.output && d.output.task_id) return d.output.task_id;
    if ((d.code || '').includes('Throttling')) { await sleep(8000); continue; }
    throw new Error('submit failed: ' + JSON.stringify(d).slice(0, 200));
  }
  throw new Error('submit throttled out');
}

async function poll(taskId) {
  for (let i = 0; i < 60; i++) {
    await new Promise((s) => setTimeout(s, 3000));
    const r = await fetch('https://dashscope.aliyuncs.com/api/v1/tasks/' + taskId, { headers: { Authorization: 'Bearer ' + KEY } });
    const d = await r.json();
    const st = d.output && d.output.task_status;
    if (st === 'SUCCEEDED') return (d.output.results || []).map((x) => x.url).filter(Boolean);
    if (st === 'FAILED') throw new Error('task failed: ' + JSON.stringify(d.output).slice(0, 200));
  }
  throw new Error('timeout');
}

async function download(url, dest) {
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async () => {
  console.log('model', MODEL, 'size', SIZE, '\nchar:', CHAR.slice(0, 60), '...\n');
  const jobs = [];
  for (const s of STYLES) {
    const prompt = CHAR + ', ' + s.p;
    const id = await submit(prompt);
    console.log('submitted', s.key, '->', id);
    jobs.push({ s, id });
    await sleep(5000); // 避开提交速率限制
  }
  for (const j of jobs) {
    try {
      const urls = await poll(j.id);
      if (urls[0]) { const n = await download(urls[0], path.join(OUT, j.s.key + '.jpg')); console.log('OK', j.s.key, (n / 1024).toFixed(0) + 'KB'); }
      else console.log('no url', j.s.key);
    } catch (e) { console.log('ERR', j.s.key, String(e.message).slice(0, 120)); }
  }
  // 拼图廊
  const cards = STYLES.map((s) => `<figure><img src="style-samples/${s.key}.jpg"><figcaption>${s.name}<br><small>${s.key}</small></figcaption></figure>`).join('');
  const html = `<!doctype html><meta charset=utf-8><title>立绘画风样板</title>
<style>body{background:#0c0916;color:#fff;font-family:system-ui;margin:0;padding:28px}h1{font-weight:800}
.grid{display:flex;flex-wrap:wrap;gap:18px}figure{margin:0;width:260px;background:#161226;border:1px solid #2a2440;border-radius:14px;overflow:hidden}
img{width:100%;display:block;aspect-ratio:2/3;object-fit:cover}figcaption{padding:10px 12px;font-size:14px;font-weight:600}small{color:#8a7fb0;font-weight:400}</style>
<h1>立绘画风样板 · 同一角色 5 种风格</h1><p style="color:#9a8fc0">挑你最喜欢的,告诉我 key,我用那个风格批量出 20 个角色。</p>
<div class=grid>${cards}</div>`;
  fs.writeFileSync(path.join('D:', 'Skills', 'chinese-partner-app', 'styles.html'), html);
  console.log('\ngallery -> D:/Skills/chinese-partner-app/styles.html');
})();
