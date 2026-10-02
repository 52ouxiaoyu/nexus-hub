const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const dgram = require('dgram');
const os = require('os');

// Keep-alive agents: reuse TCP/TLS connections for CDN segment fetches.
// New-connection-per-segment costs a full TCP+TLS handshake each time and
// starves the TV's buffer; pooling cuts per-segment latency dramatically.
const KEEPALIVE_HTTP = new http.Agent({ keepAlive: true, maxSockets: 8, keepAliveMsecs: 30000 });
const KEEPALIVE_HTTPS = new https.Agent({ keepAlive: true, maxSockets: 8, keepAliveMsecs: 30000 });
const agentFor = (u) => u.startsWith('https') ? KEEPALIVE_HTTPS : KEEPALIVE_HTTP;

// Relay stats: lets us verify the TV actually streams through the relay
const RELAY_STATS = { playlists: 0, segments: 0, bytes: 0, startedAt: Date.now() };

const PORT = 8080;
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

// ---------------- DLNA cast (SSDP discovery + UPnP AVTransport) ----------------

const XML_ESCAPE = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One SSDP M-SEARCH; resolves with the set of LOCATION urls that answered
function ssdpSearch(st, timeoutMs) {
  return new Promise((resolve) => {
    const found = new Set();
    const sock = dgram.createSocket('udp4');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { sock.close(); } catch {}
      resolve(found);
    };
    sock.on('error', finish);
    sock.on('message', (buf) => {
      const text = buf.toString('utf8');
      if (!/200 OK/i.test(text)) return;
      const loc = /LOCATION:\s*(\S+)/i.exec(text);
      if (loc) found.add(loc[1]);
    });
    sock.bind(() => {
      const msg = Buffer.from(
        'M-SEARCH * HTTP/1.1\r\n' +
        'HOST: 239.255.255.250:1900\r\n' +
        'MAN: "ssdp:discover"\r\n' +
        'MX: 2\r\n' +
        'ST: ' + st + '\r\n\r\n'
      );
      sock.send(msg, 0, msg.length, 1900, '239.255.255.250');
      setTimeout(() => { try { sock.send(msg, 0, msg.length, 1900, '239.255.255.250'); } catch {} }, 600);
      setTimeout(finish, timeoutMs);
    });
  });
}

// Fetch the device description XML; keep only DLNA renderers, extract name + AVTransport control URL
async function describeRenderer(location) {
  try {
    const res = await fetch(location, { signal: AbortSignal.timeout(3500) });
    const xml = await res.text();
    if (!/MediaRenderer|AVTransport/i.test(xml)) return null;
    const name = (/<friendlyName>([^<]*)<\/friendlyName>/i.exec(xml) || [])[1] || '未命名设备';
    let controlURL = '';
    for (const svc of xml.split(/<\/service>/i)) {
      if (/AVTransport/i.test(svc)) {
        const u = /<controlURL>([^<]+)<\/controlURL>/i.exec(svc);
        if (u) { controlURL = u[1]; break; }
      }
    }
    if (!controlURL) return null;
    return { name: name.trim(), controlURL: new URL(controlURL, location).toString() };
  } catch {
    return null;
  }
}

async function discoverRenderers() {
  const locs = new Set();
  const searches = await Promise.allSettled([
    ssdpSearch('urn:schemas-upnp-org:device:MediaRenderer:1', 3000),
    ssdpSearch('ssdp:all', 3500)
  ]);
  searches.forEach(r => { if (r.status === 'fulfilled') r.value.forEach(l => locs.add(l)); });
  const described = await Promise.allSettled([...locs].slice(0, 25).map(describeRenderer));
  const seen = new Set();
  return described
    .filter(d => d.status === 'fulfilled' && d.value)
    .map(d => d.value)
    .filter(d => !seen.has(d.controlURL) && seen.add(d.controlURL));
}

async function soapAction(controlURL, action, argsXml) {
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
    '<s:Body><u:' + action + ' xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">' +
    argsXml +
    '</u:' + action + '></s:Body></s:Envelope>';
  const res = await fetch(controlURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset="utf-8"',
      'SOAPACTION': '"urn:schemas-upnp-org:service:AVTransport:1#' + action + '"'
    },
    body,
    signal: AbortSignal.timeout(6000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error('SOAP ' + action + ' HTTP ' + res.status);
  if (/Fault/i.test(text)) throw new Error('SOAP ' + action + ' fault: ' + text.slice(0, 160));
  return text;
}

async function castPlay(controlURL, url, title) {
  // Some renderers need Stop first to clear the current queue
  try { await soapAction(controlURL, 'Stop', '<InstanceID>0</InstanceID>'); } catch {}
  const meta =
    '&lt;DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
    'xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"&gt;' +
    '&lt;item id="0" parentID="0" restricted="1"&gt;' +
    '&lt;dc:title&gt;' + XML_ESCAPE(title || 'TVBox Web Player') + '&lt;/dc:title&gt;' +
    '&lt;upnp:class&gt;object.item.videoItem&lt;/upnp:class&gt;' +
    '&lt;/item&gt;&lt;/DIDL-Lite&gt;';
  await soapAction(controlURL, 'SetAVTransportURI',
    '<InstanceID>0</InstanceID>' +
    '<CurrentURI>' + XML_ESCAPE(url) + '</CurrentURI>' +
    '<CurrentURIMetadata>' + meta + '</CurrentURIMetadata>');
  await soapAction(controlURL, 'Play', '<InstanceID>0</InstanceID><Speed>1</Speed>');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    return res.end();
  }

  // DLNA cast endpoints (require the local helper: browsers cannot do SSDP/UPnP)
  if (req.url === '/api/dlna/devices' && req.method === 'GET') {
    discoverRenderers()
      .then(devices => { res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' }); res.end(JSON.stringify(devices)); })
      .catch(err => { res.writeHead(500, corsHeaders); res.end(err.message); });
    return;
  }
  if (req.url === '/api/dlna/play' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { controlURL, url, title } = JSON.parse(body || '{}');
        if (!controlURL || !url) {
          res.writeHead(400, corsHeaders);
          return res.end('Missing controlURL or url');
        }
        castPlay(controlURL, url, title)
          .then(() => { res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' }); res.end('{"ok":true}'); })
          .catch(err => { res.writeHead(500, corsHeaders); res.end(err.message); });
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end('Bad JSON');
      }
    });
    return;
  }

  // ---------------- LAN stream relay for DLNA casting ----------------
  // TV pulls the stream from this Mac over LAN (fast, stable) while this Mac
  // pulls from the CDN — avoids TV-side stutter from slow/UA-hostile CDNs.

  // Tell the web page which LAN base URL the TV should use
  if (req.url === '/api/dlna/relay-base' && req.method === 'GET') {
    let ip = '';
    for (const name of Object.keys(os.networkInterfaces())) {
      for (const it of os.networkInterfaces()[name] || []) {
        if (it.family === 'IPv4' && !it.internal && !ip) ip = it.address;
      }
    }
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ base: ip ? ('http://' + ip + ':' + PORT) : ('http://localhost:' + PORT) }));
  }

  // Relay stats (debugging: confirm TV traffic flows through the relay)
  if (req.url === '/api/dlna/relay-stats' && req.method === 'GET') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ...RELAY_STATS, mb: +(RELAY_STATS.bytes / 1048576).toFixed(1), uptimeMin: +((Date.now() - RELAY_STATS.startedAt) / 60000).toFixed(1) }));
  }

  if (req.url.startsWith('/api/dlna/stream?url=') && req.method === 'GET') {
    const target = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!target) { res.writeHead(400); return res.end('Missing url'); }
    const rewriteUri = (u, srcUrl) => {
      try {
        return 'http://' + req.headers.host + '/api/dlna/stream?url=' + encodeURIComponent(new URL(u, srcUrl).toString());
      } catch { return u; }
    };
    // Rewrite every playlist entry (segments / sub-playlists / key URIs) to
    // route back through this relay, resolved against the request host
    const rewritePlaylist = (text, srcUrl) => text.split('\n').map(line => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (m, u) => 'URI="' + rewriteUri(u, srcUrl) + '"');
      return rewriteUri(t, srcUrl);
    }).join('\n');
    const fetchUpstream = (u, redirs) => {
      const client = u.startsWith('https') ? https : http;
      client.get(u, { agent: agentFor(u), headers: { 'User-Agent': 'okhttp/4.12.0' } }, (up) => {
        if ([301, 302, 303, 307, 308].includes(up.statusCode) && up.headers.location && redirs < 5) {
          up.resume();
          return fetchUpstream(new URL(up.headers.location, u).toString(), redirs + 1);
        }
        const ctype = up.headers['content-type'] || '';
        const maybePlaylist = /\.m3u8(\?|$)/i.test(u) || /mpegurl/i.test(ctype);
        if (maybePlaylist) {
          let body = '';
          up.setEncoding('utf8');
          up.on('data', c => { body += c; });
          up.on('end', () => {
            if (!/^\s*#EXTM3U/.test(body)) {
              // Not actually HLS (e.g. JSON error or direct file) — pass through
              res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': ctype || 'application/octet-stream' });
              return res.end(body);
            }
            RELAY_STATS.playlists++;
            res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/vnd.apple.mpegurl' });
            res.end(rewritePlaylist(body, u));
          });
          return;
        }
        RELAY_STATS.segments++;
        up.on('data', c => { RELAY_STATS.bytes += c.length; });
        res.writeHead(up.statusCode || 200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': ctype || 'application/octet-stream'
        });
        up.pipe(res);
      }).on('error', (err) => {
        if (!res.headersSent) { res.writeHead(502); res.end(err.message); } else res.end();
      });
    };
    fetchUpstream(target, 0);
    return;
  }

  // Accept both /api/proxy and /proxy (CF Pages style wrapper used by site configs)
  const isProxyReq = req.url.startsWith('/api/proxy?url=') || req.url.startsWith('/proxy?url=');
  if (isProxyReq) {
    const targetUrl = new URL(req.url, `http://${req.headers.host}`).searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400);
      return res.end('Missing url');
    }
    const client = targetUrl.startsWith('https') ? https : http;
    client.get(targetUrl, {
      headers: { 'User-Agent': 'okhttp/4.12.0' }
    }, (proxyRes) => {
      if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
        const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
        const redClient = redirectUrl.startsWith('https') ? https : http;
        redClient.get(redirectUrl, {
           headers: { 'User-Agent': 'okhttp/4.12.0' }
        }, (redRes) => {
           res.writeHead(redRes.statusCode, {
             'Access-Control-Allow-Origin': '*',
             'Content-Type': redRes.headers['content-type'] || 'application/json'
           });
           redRes.pipe(res);
        }).on('error', (err) => {
           res.writeHead(500);
           res.end(err.message);
        });
        return;
      }
      res.writeHead(proxyRes.statusCode, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': proxyRes.headers['content-type'] || 'application/json'
      });
      proxyRes.pipe(res);
    }).on('error', (err) => {
      res.writeHead(500);
      res.end(err.message);
    });
    return;
  }
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end('404 Not Found');
  }
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => console.log(`Local TVBox Server running at http://localhost:${PORT} (DLNA cast ready)`));
