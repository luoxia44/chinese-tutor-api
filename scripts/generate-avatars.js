// 批量出角色立绘（OpenAI 图像 API，gpt-image-1）→ 存到 avatars/，UI 自动接入。
// 走 curl 发请求（自动使用系统代理 HTTPS_PROXY；node 自带 fetch 不读代理变量，会超时）。
// 每角色：主图 <id>.jpg + 4 表情态（用主图做 image-edit，保持同脸/服装/场景一致，只换表情）。
//
// 用法：
//   node scripts/generate-avatars.js --only barista-xiaomin --main   # 测 1 张主图
//   node scripts/generate-avatars.js --main                          # 20 张主图
//   node scripts/generate-avatars.js                                 # 全套 100 张
//   加 --force 覆盖已存在
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
(function loadEnv() {
  const p = resolve(ROOT, '.env'); if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('='); if (i < 0) continue;
    const k = t.slice(0, i).trim(); let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
})();

const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const SIZE = process.env.OPENAI_IMAGE_SIZE || '1024x1536';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
const GEN_URL = 'https://api.openai.com/v1/images/generations';
const EDITS_URL = 'https://api.openai.com/v1/images/edits';
if (!KEY) { console.error('✗ 缺少 OPENAI_API_KEY（放进 .env）'); process.exit(1); }

const args = process.argv.slice(2);
const only = (() => { const i = args.indexOf('--only'); return i >= 0 ? args[i + 1] : null; })();
const mainOnly = args.includes('--main');
const force = args.includes('--force');

const EMOTIONS = [
  { suffix: '', kind: 'main', desc: '自信而迷人地微笑、深情地望向镜头，散发吸引力' },
  { suffix: '-listening', kind: 'edit', desc: '专注地倾听对方说话，目光柔和、嘴角带浅笑' },
  { suffix: '-thinking', kind: 'edit', desc: '微微侧头、若有所思、目光略微上移' },
  { suffix: '-attentive', kind: 'edit', desc: '轻轻点头、眼神专注认真、身体微微前倾' },
  { suffix: '-happy', kind: 'edit', desc: '开心地笑、略带惊喜、神采飞扬充满活力' },
];
const STYLE = '超写实、电影级人像摄影质感；人物颜值出众、五官精致立体、气质迷人，自带张力、魅力与吸引力，就像高品质恋爱养成游戏里令人心动的恋爱对象（dating-sim love interest）。眼神明亮有神、深情地望向镜头，带一丝令人心动的吸引力；造型时尚精致，柔和的电影级打光配梦幻虚化光斑，皮肤通透细腻，整体高级、惊艳、迷人。stunning, attractive, charming, captivating, cinematic portrait, beautiful detailed eyes.';
const SCENE = '背景是与角色身份相符的真实场景环境（有层次、适度虚化），带温暖氛围光并点缀淡淡的紫色与粉色霓虹光，营造夜色霓虹般的高级氛围。';
const COMPOSE = '竖构图 3:4 半身像。取景铁律：人物的脸和眼睛落在画面从上到下约 12%-46% 的区域（顶部留出空白、脸不要贴顶）；画面下方约 40% 留给身体、桌面或背景（之后会被界面遮挡，此处不要放脸或关键细节）；人物左右各留约 6% 边距、不要贴边被裁切。';

function buildMain(c) {
  // 非人类/特殊风格的角色（熊猫、仙侠、说唱歌手）套不进下面这套"恋爱养成风格的中国男女"模板，
  // 在 seed 里给 avatarPrompt 就走自己的提示词，只复用构图铁律（脸的位置、下方 40% 留白）。
  if (c.avatarPrompt) return `${c.avatarPrompt} 构图：${COMPOSE} 画面中不要出现任何文字、水印、UI 或边框。`;
  const id = c.identity; const g = id.gender === 'male' ? '男性' : '女性';
  return `为一款手机端「恋爱养成风格」的中文口语陪练 App 绘制一张精美的角色立绘。角色：一位 ${id.age} 岁的中国${id.region}${g}，职业是${id.role}，性格${(id.personality || []).join('、')}。${id.backstory || ''} 风格：${STYLE} 场景：${SCENE} 构图：${COMPOSE} 人物面向镜头、${EMOTIONS[0].desc}。虚构人物，不是任何真实存在的人。画面中不要出现任何文字、水印、UI 或边框。`;
}
function buildEdit(desc) {
  return `保持图中同一个角色（同一张脸/同一只动物），造型、服装或毛色、场景背景、镜头机位与打光全部保持完全一致，只把表情和神态改为：${desc}。${COMPOSE} 写实风格、精致迷人。不要出现任何文字、水印或边框。`;
}

const TMP = resolve(ROOT, '.tmp'); if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
const BODY = resolve(TMP, 'body.json'), RESP = resolve(TMP, 'resp.json'), PROMPT = resolve(TMP, 'prompt.txt');
const COMMON = { stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 96 * 1024 * 1024, env: process.env };

function readResp(out) {
  const data = JSON.parse(readFileSync(RESP, 'utf8'));
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('API: ' + JSON.stringify(data.error || data).slice(0, 240));
  writeFileSync(out, Buffer.from(b64, 'base64'));
}
function genMain(c, out) {
  writeFileSync(BODY, JSON.stringify({ model: MODEL, prompt: buildMain(c), size: SIZE, quality: QUALITY, output_format: 'jpeg', n: 1 }));
  execFileSync('curl', ['-sS', '-m', '300', '-X', 'POST', GEN_URL, '-H', 'Content-Type: application/json', '-H', `Authorization: Bearer ${KEY}`, '-d', '@' + BODY, '-o', RESP], COMMON);
  readResp(out);
}
function genEdit(desc, mainPath, out) {
  writeFileSync(PROMPT, buildEdit(desc));
  execFileSync('curl', ['-sS', '-m', '300', '-X', 'POST', EDITS_URL, '-H', `Authorization: Bearer ${KEY}`,
    '-F', `model=${MODEL}`, '-F', `prompt=<${PROMPT}`, '-F', `size=${SIZE}`, '-F', `quality=${QUALITY}`, '-F', 'output_format=jpeg',
    '-F', `image=@${mainPath};type=image/jpeg`, '-o', RESP], COMMON);
  readResp(out);
}

const seed = JSON.parse(readFileSync(resolve(ROOT, 'data', 'companions.seed.json'), 'utf8'));
let list = seed.companions;
if (only) list = list.filter((c) => c.id === only);
if (!list.length) { console.error('✗ 没有匹配的角色'); process.exit(1); }

const AV = resolve(ROOT, 'avatars'); if (!existsSync(AV)) mkdirSync(AV, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function doOne(c) {
  const mainPath = resolve(AV, `${c.id}.jpg`);
  if (!existsSync(mainPath) || force) {
    process.stdout.write(`· 主图 ${c.id}（${c.name.zh}）… `);
    try { genMain(c, mainPath); console.log('✓'); }
    catch (e) { console.log('失败：', (e.stderr ? e.stderr.toString() : e.message).slice(0, 200)); return; }
  } else console.log(`· 跳过主图 ${c.id}`);
  if (mainOnly) return;
  for (const emo of EMOTIONS.filter((e) => e.kind === 'edit')) {
    const out = resolve(AV, `${c.id}${emo.suffix}.jpg`);
    if (existsSync(out) && !force) { console.log(`·   跳过 ${c.id}${emo.suffix}`); continue; }
    process.stdout.write(`·   ${c.id}${emo.suffix} … `);
    try { genEdit(emo.desc, mainPath, out); console.log('✓'); }
    catch (e) { console.log('失败：', (e.stderr ? e.stderr.toString() : e.message).slice(0, 200)); }
    await sleep(800);
  }
}

(async () => {
  console.log(`模型 ${MODEL} · ${SIZE} · ${QUALITY} · ${list.length} 角色 · ${mainOnly ? '仅主图' : '主图+表情'}\n`);
  for (const c of list) { await doOne(c); await sleep(800); }
  console.log('\n完成。刷新 App 即可看到立绘。');
})();
