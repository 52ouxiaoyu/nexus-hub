export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const targetUrl = requestUrl.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    return new Response('Invalid url parameter', { status: 400 });
  }

  try {
    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'okhttp/4.12.0'
      },
      redirect: 'follow'
    });

    const body = await fetchRes.arrayBuffer();

    const newHeaders = new Headers();
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    newHeaders.set('Content-Type', fetchRes.headers.get('content-type') || 'application/json');

    return new Response(body, {
      status: fetchRes.status,
      headers: newHeaders
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
