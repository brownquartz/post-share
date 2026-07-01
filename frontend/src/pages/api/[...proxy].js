// src/pages/api/[...proxy].js
// Development proxy: forwards all /api/* requests to the Express backend,
// including Cookie (request) and Set-Cookie (response) headers.

export const config = { api: { bodyParser: true } };

const BACKEND = 'http://localhost:4000';

export default async function handler(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const segments = [].concat(req.query.proxy || []).join('/');

  // Rebuild query string (excluding the proxy param itself)
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (k !== 'proxy') qs.append(k, Array.isArray(v) ? v[0] : v);
  }
  const qstr = qs.toString();
  const target = `${BACKEND}/api/${segments}${qstr ? '?' + qstr : ''}`;

  // Forward most request headers; strip hop-by-hop headers
  const skip = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);
  const fwdHeaders = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!skip.has(k.toLowerCase())) fwdHeaders[k] = v;
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const bodyStr = hasBody ? JSON.stringify(req.body) : undefined;
  if (hasBody) fwdHeaders['content-type'] = 'application/json';

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: fwdHeaders,
      body: bodyStr,
    });
  } catch (err) {
    console.error('[proxy] fetch error:', err.message);
    return res.status(502).json({ error: 'Backend unreachable' });
  }

  // Forward response headers (skip hop-by-hop)
  const skipRes = new Set(['transfer-encoding', 'connection']);
  upstream.headers.forEach((value, key) => {
    if (!skipRes.has(key.toLowerCase()) && key.toLowerCase() !== 'set-cookie') {
      res.setHeader(key, value);
    }
  });

  // Forward Set-Cookie headers (may be multiple)
  const setCookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [upstream.headers.get('set-cookie')].filter(Boolean);
  if (setCookies.length > 0) {
    res.setHeader('Set-Cookie', setCookies);
  }

  res.status(upstream.status);
  const buffer = await upstream.arrayBuffer();
  res.end(Buffer.from(buffer));
}
