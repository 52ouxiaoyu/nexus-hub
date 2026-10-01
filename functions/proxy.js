export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get("url");

  if (!target) {
    return new Response("Missing url parameter", { status: 400 });
  }

  if (!/^https?:\/\//i.test(target)) {
    return new Response("Invalid url parameter", { status: 400 });
  }

  // Merge extra params (ac/wd/ids...) into the target URL instead of dropping them
  let targetUrl = target;
  try {
    const t = new URL(target);
    for (const [k, v] of url.searchParams.entries()) {
      if (k !== "url") t.searchParams.set(k, v);
    }
    targetUrl = t.toString();
  } catch (e) {
    targetUrl = target;
  }

  try {
    // 构造新的请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        "User-Agent": "okhttp/4.12.0",
        "Accept": "*/*"
      }
    });

    const response = await fetch(proxyRequest);

    // 复制响应并添加 CORS 头
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}
