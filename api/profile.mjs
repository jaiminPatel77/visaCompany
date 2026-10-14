const fail = (res, status, code, message, cache = 'no-store') => {
  res.setHeader('Cache-Control', cache);
  return res.status(status).json({ ok: false, error: { code, message } });
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return fail(res, 405, 'BAD_REQUEST', 'Method Not Allowed. Use GET.');
  }

  const upstreamUrl = process.env.APPS_SCRIPT_URL;
  if (!upstreamUrl) {
    return fail(res, 500, 'SERVER_ERROR', 'Server configuration error: APPS_SCRIPT_URL is not set.');
  }

  const country = req.query && req.query.country;
  const company = req.query && req.query.company;

  if (!country || !company || typeof country !== 'string' || typeof company !== 'string') {
    return fail(res, 400, 'BAD_REQUEST', 'Missing required country or company parameter.');
  }
  if (country.length > 100 || company.length > 100) {
    return fail(res, 400, 'BAD_REQUEST', 'Parameters exceed maximum allowed length of 100 characters.');
  }
  if (/[\x00-\x1F\x7F]/.test(country) || /[\x00-\x1F\x7F]/.test(company)) {
    return fail(res, 400, 'BAD_REQUEST', 'Control characters are not permitted.');
  }

  const target = new URL(upstreamUrl);
  target.searchParams.set('country', country.trim());
  target.searchParams.set('company', company.trim());

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

    const rawText = await upstreamRes.text();
    let envelope;
    try {
      envelope = JSON.parse(rawText);
    } catch {
      return fail(res, 502, 'SERVER_ERROR', 'Upstream service returned invalid non-JSON response.');
    }

    if (envelope && envelope.ok === true) {
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
      return res.status(200).json(envelope);
    }

    const code = envelope && envelope.error && envelope.error.code;
    res.setHeader(
      'Cache-Control',
      code === 'NOT_FOUND' || code === 'DUPLICATE' ? 'public, s-maxage=30' : 'no-store'
    );
    return res.status(200).json(envelope);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err && err.name === 'AbortError') {
      return fail(res, 504, 'SERVER_ERROR', 'Upstream service request timed out after 10 seconds.');
    }
    return fail(res, 502, 'SERVER_ERROR', 'Failed to communicate with upstream service.');
  }
}