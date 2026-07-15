// RemoteBackup — 用 Upstash Redis(REST) 给 data/memory 的 JSON 文件做异地持久化。
// 动机：Render 免费档磁盘是临时的，每次部署/重启本地文件全丢 → 用户记忆/免费额度清零。
// 设计：本地文件仍是工作存储（同步读写，现有代码不变）；每次写盘后异步推一份到
// Redis HASH（field=文件名, value=JSON 字符串），启动时先从 Redis 恢复全部文件再对外服务。
// 零依赖：Upstash REST 就是普通 HTTPS（POST base URL, body=["HSET",...]），Bearer 鉴权。
// 未配置 UPSTASH_REDIS_REST_URL/TOKEN 时全部 no-op（本地开发照旧）。
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const URL_ = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const HASH = process.env.MEMORY_BACKUP_HASH || 'memfiles';

export const backupEnabled = !!(URL_ && TOKEN);

let lastErrLog = 0;
function logErr(what, e) {
  const now = Date.now();
  if (now - lastErrLog > 60_000) { // 限频：坏网络时别刷屏
    lastErrLog = now;
    console.warn(`[backup] ${what} failed:`, e && e.message ? e.message : e);
  }
}

// 发一条 Redis 命令（JSON 数组形式）。失败重试 1 次。
async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${cmd[0]} HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`redis ${cmd[0]}: ${j.error}`);
  return j.result;
}
async function redisRetry(cmd) {
  try { return await redis(cmd); }
  catch { return await redis(cmd); }
}

// 写盘后调用：把文件内容推到云端（fire-and-forget，不阻塞请求）。
export function backupFile(filename, content) {
  if (!backupEnabled) return;
  redisRetry(['HSET', HASH, filename, content]).catch((e) => logErr('HSET ' + filename, e));
}

// 删盘后调用。
export function removeBackup(filename) {
  if (!backupEnabled) return;
  redisRetry(['HDEL', HASH, filename]).catch((e) => logErr('HDEL ' + filename, e));
}

// 启动时调用：把云端全部文件恢复到本地目录（HSCAN 分页，避免单响应过大）。
export async function hydrate(dir) {
  if (!backupEnabled) { console.log('[backup] disabled (no UPSTASH_REDIS_REST_URL/TOKEN) — memory is local-only.'); return 0; }
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  let cursor = '0', restored = 0;
  try {
    do {
      const [next, pairs] = await redisRetry(['HSCAN', HASH, cursor, 'COUNT', '100']);
      cursor = String(next);
      for (let i = 0; i < pairs.length; i += 2) {
        const name = pairs[i], val = pairs[i + 1];
        if (!/^[a-zA-Z0-9_.-]+\.json$/.test(name)) continue; // 只接受我们自己的文件名格式
        writeFileSync(resolve(dir, name), val, 'utf8');
        restored++;
      }
    } while (cursor !== '0');
    console.log(`[backup] hydrated ${restored} memory file(s) from Upstash.`);
  } catch (e) {
    // 恢复失败不挡启动：宁可先无记忆服务，也别整个后端起不来。
    console.warn('[backup] hydrate failed (starting with local files only):', e && e.message ? e.message : e);
  }
  return restored;
}
