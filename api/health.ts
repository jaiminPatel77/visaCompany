export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const upstreamUrl = process.env['APPS_SCRIPT_URL'];
  if (!upstreamUrl) {
    return res.status(500).json({
      ok: false,
      error: 'APPS_SCRIPT_URL not configured',
    });
  }

  const target = new URL(upstreamUrl);
  target.searchParams.set('action', 'ping');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const upstreamRes = await fetch(target.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const json = await upstreamRes.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(json);
  } catch (err: any) {
    clearTimeout(timeoutId);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({
      ok: false,
      error: 'Upstream health check failed',
      details: err?.message || String(err),
    });
  }
}
