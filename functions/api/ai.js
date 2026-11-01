/* =============================================================================
 * /api/ai —— 语文专项学习（chinese-blitz）的 AI 中转
 * -----------------------------------------------------------------------------
 * 为什么要有这一层：
 *  1) Key 放在浏览器里，任何人打开网页都能在 DevTools 里扒走、拿去刷余额。
 *     所以真正上线时 Key 只放在 Cloudflare Pages 的环境变量里：
 *        Settings -> Environment variables -> DEEPSEEK_API_KEY = sk-...
 *  2) 顺手解决 CORS：浏览器直连部分中转站会被跨域掐断，服务端转发没有这个问题。
 *
 * 约定：
 *  - 只允许白名单里的服务商，不做开放代理（防止被当成免费翻墙/刷接口的跳板）。
 *  - 客户端自带合法 Key 时优先用客户端的（用户自己填的 key 不该走站长额度）。
 *  - 服务端没有配置 Key 时返回 503，前端会静默回落到浏览器直连。
 * ========================================================================== */

const ALLOW_HOSTS = [
  "api.deepseek.com",
  "dashscope.aliyuncs.com",
  "api.openai.com",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json(400, { error: { message: "请求体不是合法 JSON" } });
  }

  const base = String(payload.base || "https://api.deepseek.com").replace(/\/+$/, "");
  let host = "";
  try {
    const u = new URL(base);
    if (!/^https:$/.test(u.protocol)) throw new Error("protocol");
    host = u.hostname;
  } catch (e) {
    return json(400, { error: { message: "base 不是合法的 https 地址" } });
  }
  if (!ALLOW_HOSTS.includes(host)) {
    return json(400, { error: { message: `不支持的服务商：${host}` } });
  }

  const clientKey = String(payload.key || "").trim();
  const serverKey = String(env.DEEPSEEK_API_KEY || "").trim();
  const key = clientKey || serverKey;
  if (!key) {
    return json(503, {
      error: { message: "服务端未配置 DEEPSEEK_API_KEY，且请求未携带 Key" },
    });
  }

  const body = {
    model: payload.model,
    messages: payload.messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
  };
  if (payload.response_format) body.response_format = payload.response_format;

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        ...CORS,
      },
    });
  } catch (err) {
    return json(502, { error: { message: `上游请求失败：${err.message}` } });
  }
}
