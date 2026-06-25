// gen-gpt.cjs — 用 gpt-image-2 出图测试/单图。用法：node gen-gpt.cjs "<prompt>" <outfile.png>
const fs = require('fs');
const path = require('path');
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const KEY = (env.match(/^OPENAI_API_KEY=(.*)$/m) || [])[1];

const prompt = process.argv[2] || 'High-end otome dating-sim character art of an elegant young Chinese woman, refined semi-realistic painterly anime, beautiful delicate features, long dark-brown hair, gentle warm smile, fashionable modern outfit, a small cat near her shoulder, soft cinematic lighting, upper-body vertical portrait, premium mobile game splash art, clean soft gradient background.';
const out = process.argv[3] || path.join('D:', 'Skills', 'chinese-partner-app', 'style-samples', 'gptimage2_vivian.png');
const model = process.env.MODEL || 'gpt-image-2';
const quality = process.env.QUALITY || 'high';
const size = process.env.SIZE || '1024x1536';

(async () => {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
  });
  const d = await r.json();
  if (d.data && d.data[0] && d.data[0].b64_json) {
    fs.writeFileSync(out, Buffer.from(d.data[0].b64_json, 'base64'));
    console.log('SAVED', out, '| model', model, quality, size);
  } else {
    console.log('HTTP', r.status, 'ERR:', JSON.stringify(d.error || d).slice(0, 400));
  }
})();
