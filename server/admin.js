// admin.js — 运营数据面板（/admin，密码保护）。
// 数据源=data/memory 里的 profile/usage/relationship JSON（已由 Upstash 持久化）。
// 口径说明：一个 userId = 一台设备（匿名）；一次 session = 一通电话（挂断时 /api/session/end 落库）。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './config.js';

const DIR = resolve(ROOT, 'data', 'memory');
const FREE_SECONDS = 300; // 与 app 端 billing.FREE_SECONDS 一致

const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return fb; } };
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

// 扫描全量数据，聚合成面板需要的指标
export function collectStats() {
  if (!existsSync(DIR)) return emptyStats();
  const files = readdirSync(DIR);
  const users = new Map(); // userId → { firstSeen, lastSeen, calls, sec, companions:Set, usedSec }
  const sessions = [];     // 展开的所有通话
  const compCount = new Map();

  const touch = (uid) => {
    if (!users.has(uid)) users.set(uid, { firstSeen: null, lastSeen: null, calls: 0, sec: 0, companions: new Set(), usedSec: 0 });
    return users.get(uid);
  };

  for (const f of files) {
    if (f.endsWith('.usage.json')) {
      const uid = f.replace('.usage.json', '');
      touch(uid).usedSec = readJson(resolve(DIR, f), { sec: 0 }).sec || 0;
    } else if (f.endsWith('.relationship.json')) {
      const rel = readJson(resolve(DIR, f), null);
      if (!rel || !rel.userId) continue;
      const u = touch(rel.userId);
      for (const s of rel.sessionSummaries || []) {
        const t = s.date ? new Date(s.date).getTime() : 0;
        if (!t) continue;
        const dur = Number(s.durationSec) || 0;
        u.calls += 1; u.sec += dur; u.companions.add(rel.companionId);
        if (!u.firstSeen || t < u.firstSeen) u.firstSeen = t;
        if (!u.lastSeen || t > u.lastSeen) u.lastSeen = t;
        compCount.set(rel.companionId, (compCount.get(rel.companionId) || 0) + 1);
        sessions.push({ t, dur, uid: rel.userId, companionId: rel.companionId });
      }
    } else if (f.endsWith('.profile.json')) {
      touch(f.replace('.profile.json', ''));
    }
  }

  sessions.sort((a, b) => a.t - b.t);
  const now = Date.now(), DAY = 86400e3;
  const since = (n) => now - n * DAY;

  // 按天分桶（近 30 天）
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * DAY);
    const key = dayKey(d);
    const ds = sessions.filter((s) => dayKey(s.t) === key);
    days.push({
      date: key,
      calls: ds.length,
      minutes: Math.round(ds.reduce((a, s) => a + s.dur, 0) / 60),
      activeUsers: new Set(ds.map((s) => s.uid)).size,
      newUsers: [...users.values()].filter((u) => u.firstSeen && dayKey(u.firstSeen) === key).length,
    });
  }

  const all = [...users.values()];
  const withCalls = all.filter((u) => u.calls > 0);
  const activeIn = (n) => new Set(sessions.filter((s) => s.t >= since(n)).map((s) => s.uid)).size;
  const totalSec = sessions.reduce((a, s) => a + s.dur, 0);

  // 漏斗：装机(有记录) → 打过电话 → 打满 5 分钟(免费额度用尽) → 多次回访
  const usedUpFree = all.filter((u) => (u.usedSec || u.sec) >= FREE_SECONDS).length;
  const returned = withCalls.filter((u) => u.calls >= 2).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: all.length,
      usersWithCalls: withCalls.length,
      calls: sessions.length,
      minutes: Math.round(totalSec / 60),
      avgCallSec: sessions.length ? Math.round(totalSec / sessions.length) : 0,
      avgCallsPerUser: withCalls.length ? +(sessions.length / withCalls.length).toFixed(1) : 0,
    },
    active: { d1: activeIn(1), d7: activeIn(7), d30: activeIn(30) },
    funnel: [
      { label: 'Devices seen', value: all.length },
      { label: 'Made a call', value: withCalls.length },
      { label: 'Used up free 5 min', value: usedUpFree },
      { label: 'Came back (2+ calls)', value: returned },
    ],
    days,
    topCompanions: [...compCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => ({ id, calls: n })),
    recent: sessions.slice(-15).reverse().map((s) => ({ when: new Date(s.t).toISOString().replace('T', ' ').slice(0, 16), uid: s.uid.slice(0, 12), companionId: s.companionId, dur: s.dur })),
  };
}

const emptyStats = () => ({ generatedAt: new Date().toISOString(), totals: { users: 0, usersWithCalls: 0, calls: 0, minutes: 0, avgCallSec: 0, avgCallsPerUser: 0 }, active: { d1: 0, d7: 0, d30: 0 }, funnel: [], days: [], topCompanions: [], recent: [] });

// ── 面板 HTML（自包含，深色霓虹风，和产品视觉一致）──
export function adminHtml(s) {
  const maxCalls = Math.max(1, ...s.days.map((d) => d.calls));
  const bars = s.days.map((d) => {
    const h = Math.round((d.calls / maxCalls) * 100);
    return `<div class="bar" title="${d.date} · ${d.calls} calls · ${d.minutes} min · ${d.activeUsers} users"><div class="fill" style="height:${h}%"></div><span>${d.date.slice(5)}</span></div>`;
  }).join('');
  const top = s.funnel[0] ? s.funnel[0].value : 0;
  const funnel = s.funnel.map((f) => {
    const pct = top ? Math.round((f.value / top) * 100) : 0;
    return `<div class="frow"><div class="flabel">${f.label}</div><div class="ftrack"><div class="ffill" style="width:${Math.max(2, pct)}%"></div></div><div class="fval">${f.value} <em>${pct}%</em></div></div>`;
  }).join('');
  const comps = s.topCompanions.map((c) => `<tr><td>${c.id}</td><td class="num">${c.calls}</td></tr>`).join('') || '<tr><td colspan="2" class="dim">No data yet</td></tr>';
  const recent = s.recent.map((r) => `<tr><td class="dim">${r.when}</td><td>${r.uid}…</td><td>${r.companionId}</td><td class="num">${r.dur}s</td></tr>`).join('') || '<tr><td colspan="4" class="dim">No calls yet</td></tr>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AI Chinese Tutor · Dashboard</title><style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#0A0714;color:#E7E3F2;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:36px 20px 80px}
h1{font-size:26px;margin:0 0 4px;background:linear-gradient(135deg,#A855F7,#EC4899);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
.sub{color:#8A82A6;font-size:13px;margin-bottom:28px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:28px}
.card{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:16px 18px}
.card .k{font-size:11.5px;color:#9A92B8;text-transform:uppercase;letter-spacing:.5px}
.card .v{font-size:28px;font-weight:800;margin-top:6px}
.card .v em{font-size:14px;font-weight:600;color:#8A82A6;font-style:normal}
h2{font-size:15px;margin:30px 0 12px;color:#C9C2E0}
.panel{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px}
.chart{display:flex;align-items:flex-end;gap:3px;height:170px}
.bar{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;cursor:default}
.fill{width:100%;background:linear-gradient(180deg,#A855F7,#6366F1);border-radius:4px 4px 0 0;min-height:2px}
.bar span{font-size:8px;color:#6B6486;margin-top:5px;writing-mode:vertical-rl}
.frow{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.flabel{width:190px;font-size:13px;color:#B7B0CC}
.ftrack{flex:1;height:26px;background:rgba(255,255,255,.05);border-radius:8px;overflow:hidden}
.ffill{height:100%;background:linear-gradient(90deg,#6366F1,#A855F7,#EC4899);border-radius:8px}
.fval{width:96px;text-align:right;font-weight:700}
.fval em{font-style:normal;color:#8A82A6;font-weight:500;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06)}
th{color:#9A92B8;font-weight:600;font-size:11.5px;text-transform:uppercase}
.num{text-align:right}
.dim{color:#6B6486}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:760px){.two{grid-template-columns:1fr}.flabel{width:120px}}
</style></head><body><div class="wrap">
<h1>AI Chinese Tutor</h1><div class="sub">Operations dashboard · generated ${s.generatedAt.replace('T', ' ').slice(0, 16)} UTC · auto-refresh 60s</div>

<div class="grid">
  <div class="card"><div class="k">Devices</div><div class="v">${s.totals.users}</div></div>
  <div class="card"><div class="k">Called at least once</div><div class="v">${s.totals.usersWithCalls}</div></div>
  <div class="card"><div class="k">Total calls</div><div class="v">${s.totals.calls}</div></div>
  <div class="card"><div class="k">Total minutes</div><div class="v">${s.totals.minutes}</div></div>
  <div class="card"><div class="k">Avg call</div><div class="v">${s.totals.avgCallSec}<em>s</em></div></div>
  <div class="card"><div class="k">Calls / user</div><div class="v">${s.totals.avgCallsPerUser}</div></div>
  <div class="card"><div class="k">Active 24h</div><div class="v">${s.active.d1}</div></div>
  <div class="card"><div class="k">Active 7d</div><div class="v">${s.active.d7}</div></div>
</div>

<h2>Activation funnel</h2><div class="panel">${funnel || '<div class="dim">No data yet</div>'}</div>

<h2>Calls per day (30d)</h2><div class="panel"><div class="chart">${bars}</div></div>

<div class="two">
  <div><h2>Top characters</h2><div class="panel"><table><tr><th>Character</th><th class="num">Calls</th></tr>${comps}</table></div></div>
  <div><h2>Recent calls</h2><div class="panel"><table><tr><th>When (UTC)</th><th>Device</th><th>Character</th><th class="num">Len</th></tr>${recent}</table></div></div>
</div>

<p class="dim" style="margin-top:28px;font-size:12px">Revenue &amp; subscriptions: see RevenueCat dashboard. Installs &amp; store conversion: App Store Connect → Analytics.</p>
</div><script>setTimeout(function(){location.reload()},60000)</script></body></html>`;
}
