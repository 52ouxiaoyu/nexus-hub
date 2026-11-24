/* =============================================================================
 * /api/extract —— 链接内容直链提取（影音板块）
 * -----------------------------------------------------------------------------
 * 用途：用户粘贴一个链接，服务端判断它本身是不是媒体文件；如果是网页，
 *       就从 HTML / JSON 里把 mp4 / m3u8 / mp3 等媒体直链提取出来返回。
 *
 * 边界（重要）：
 *  - 只做「公开资源 / 用户自有内容」的直链提取，不实现任何绕过付费墙、DRM、
 *    登录鉴权的逻辑。遇到需要 Cookie / 会员的地址，只能提取到公开可见的链接。
 *  - 不代理媒体内容本身，只返回地址，避免被当成免费图床/下载跳板。
 *  - 边缘函数没有 DOM 也没有 Node 依赖，解析纯用正则。
 *
 * 端点：GET /api/extract?url=...   或   POST /api/extract  body: { "url": "..." }
 * 返回：{ ok, source, finalUrl, type, links:[{url,kind,ext}], message }
 * ========================================================================== */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 媒体扩展名（路径部分以这些结尾即视为可下载直链）
const MEDIA_EXT = [
  'm3u8', 'mpd',
  'mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'flv', 'ts', 'wmv', 'mpeg', 'mpg', '3gp',
  'mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'oga', 'opus', 'wma', 'aiff',
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'pdf',
];
const EXT_SET = new Set(MEDIA_EXT);

const KIND_OF = {
  m3u8: 'stream', mpd: 'stream',
  mp4: 'video', m4v: 'video', mov: 'video', webm: 'video', mkv: 'video',
  avi: 'video', flv: 'video', ts: 'video', wmv: 'video', mpeg: 'video',
  mpg: 'video', '3gp': 'video',
  mp3: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio', wav: 'audio',
  ogg: 'audio', oga: 'audio', opus: 'audio', wma: 'audio', aiff: 'audio',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive', xz: 'archive', pdf: 'doc',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const MAX_HTML = 2 * 1024 * 1024; // 只扫描前 2MB，够用且防止超大响应拖垮函数
const MAX_LINKS = 60;

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

/* ----------------------------- SSRF 防护 ---------------------------------- */
function isBlockedHost(rawHost) {
  const h = String(rawHost || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === 'metadata.google.internal' || h === 'metadata') return true;

  if (h.includes(':')) {
    // IPv6：回环 / 未指定 / 链路本地 / 私有 fc00::/7 / IPv4 映射
    if (h === '::' || h === '::1') return true;
    if (/^f[cd89]/.test(h)) return true;
    const mapped = h.match(/^::ffff:(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (mapped) return isBlockedHost(mapped.slice(1).join('.'));
    return false;
  }

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = v4.slice(1).map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 169 && b === 254) return true;           // 云元数据
    if (a === 172 && b >= 16 && b <= 31) return true;  // 私有
    if (a === 192 && b === 168) return true;           // 私有
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  // 十进制 / 十六进制形式的 IP（127.0.0.1 的变体）
  if (/^(0x[0-9a-f]+|\d+)$/i.test(h)) return true;
  return false;
}

function parseTarget(input) {
  let u;
  try {
    u = new URL(String(input || '').trim());
  } catch (e) {
    return { error: '链接格式不对，请粘贴完整的 http(s) 地址' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { error: '只支持 http / https 链接' };
  }
  if (isBlockedHost(u.hostname)) {
    return { error: '出于安全考虑，不支持内网 / 本机 / 元数据地址' };
  }
  return { url: u };
}

function extOf(url) {
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : '';
  } catch (e) {
    return '';
  }
}

function isMediaUrl(url) {
  return EXT_SET.has(extOf(url));
}

/* ------------------------- HTML / JSON 链接提取 ---------------------------- */
function absolutize(raw, base) {
  let s = String(raw || '').trim();
  if (!s || s.startsWith('#') || s.startsWith('javascript:') || s.startsWith('data:')) return null;
  s = s.replace(/&amp;/gi, '&').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hx, dec) => {
    const cp = hx ? parseInt(hx, 16) : parseInt(dec, 10);
    try { return String.fromCodePoint(cp); } catch (e) { return ''; }
  });
  try {
    const u = new URL(s, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (isBlockedHost(u.hostname)) return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

function extractFromText(text, base) {
  const found = [];
  const push = (raw) => {
    const url = absolutize(raw, base);
    if (url && isMediaUrl(url)) found.push(url);
  };

  // 1) 常见属性：src / href / data-src / playUrl / url / file ...
  const attrRe = /\b(?:src|href|data-src|data-url|data-original|playurl|play_url|video_url|videoUrl|m3u8|url|file|link|source)\s*[=:]\s*["']([^"']+)["']/gi;
  for (const m of text.matchAll(attrRe)) push(m[1]);

  // 2) JS 变量赋值（播放器配置常见）
  const jsRe = /\b\w*(?:url|src|video|play|media)\w*\s*=\s*["']([^"']+)["']/gi;
  for (const m of text.matchAll(jsRe)) push(m[1]);

  // 3) 正文中裸露的绝对地址（带引号边界）
  const bareRe = /(?:https?:)?\/\/[^\s"'<>\\)]+/g;
  for (const m of text.matchAll(bareRe)) {
    const cut = m[0].replace(/[,;]+$/, '');
    if (EXT_SET.has((cut.split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase())) push(cut);
  }

  // 4) 相对路径里的媒体文件（"/2024/x/ep01.mp4?token=..."）
  const extAlternation = MEDIA_EXT.join('|');
  const relRe = new RegExp(`["']([^"'\\s]*\\.(?:${extAlternation})(?:\\?[^"'\\s]*)?)["']`, 'gi');
  for (const m of text.matchAll(relRe)) push(m[1]);

  // 去重 + 排序：m3u8/mpd 优先，其次视频、音频、其他；同组保留原顺序
  const seen = new Set();
  const rank = (u) => {
    const ext = extOf(u);
    if (ext === 'm3u8' || ext === 'mpd') return 0;
    if (['video'].includes(KIND_OF[ext])) return 1;
    if (KIND_OF[ext] === 'audio') return 2;
    return 3;
  };
  const unique = [];
  for (const u of found) {
    if (seen.has(u)) continue;
    seen.add(u);
    unique.push(u);
  }
  unique.sort((a, b) => rank(a) - rank(b));
  return unique.slice(0, MAX_LINKS).map((u) => {
    const ext = extOf(u);
    return { url: u, ext, kind: KIND_OF[ext] || 'other' };
  });
}

/* ------------------------------- 主流程 ----------------------------------- */
async function fetchContent(target) {
  const init = {
    method: 'GET',
    headers: { 'User-Agent': UA, Accept: '*/*' },
    redirect: 'follow',
  };
  try {
    init.signal = AbortSignal.timeout(15000);
  } catch (e) { /* 老运行时不支持就靠平台自身超时 */ }
  return fetch(target.href, init);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  let rawUrl = '';
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      rawUrl = body?.url || '';
    } catch (e) {
      return json(400, { ok: false, error: '请求体不是合法 JSON' });
    }
  } else {
    rawUrl = new URL(request.url).searchParams.get('url') || '';
  }

  const parsed = parseTarget(rawUrl);
  if (parsed.error) return json(400, { ok: false, error: parsed.error });
  const target = parsed.url;

  try {
    const res = await fetchContent(target);
    const finalUrl = res.url || target.href;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const directExt = extOf(finalUrl);

    // 情况 A：输入本身就是媒体文件 → 直接返回它（跟随重定向后的最终地址）
    if (EXT_SET.has(directExt) || /^(video|audio)\//.test(ct) || /octet-stream|application\/zip|application\/pdf/.test(ct)) {
      try { await res.body?.cancel(); } catch (e) { /* ignore */ }
      const ext = EXT_SET.has(directExt) ? directExt : '';
      return json(200, {
        ok: true,
        source: target.href,
        finalUrl,
        type: 'direct',
        contentType: ct,
        links: [{ url: finalUrl, ext, kind: KIND_OF[ext] || 'other' }],
        message: '这是一个直接的媒体/文件地址',
      });
    }

    // 情况 B：网页 / JSON → 读取内容并提取其中媒体直链
    const reader = res.body?.getReader();
    if (!reader) return json(502, { ok: false, error: '目标没有返回可读取的内容' });
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= MAX_HTML) break;
    }
    try { await reader.cancel(); } catch (e) { /* ignore */ }

    const links = extractFromText(text, finalUrl);
    return json(200, {
      ok: true,
      source: target.href,
      finalUrl,
      type: 'page',
      contentType: ct,
      links,
      message: links.length
        ? `从页面中找到了 ${links.length} 条媒体直链`
        : '页面里没有找到明显的媒体直链（可能地址由脚本动态生成，或需要登录）',
    });
  } catch (err) {
    return json(502, { ok: false, error: `抓取失败：${err?.message || err}` });
  }
}
