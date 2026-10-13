export default async function handler(req: any, res: any) {
  // 1. Method check: GET only
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'Method Not Allowed. Use GET.' },
    });
  }

  // 2. Validate environment variable
  const upstreamUrl = process.env['APPS_SCRIPT_URL'];
  if (!upstreamUrl) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({
      ok: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Server configuration error: APPS_SCRIPT_URL is not set.',
      },
    });
  }

  // 3. Extract and validate parameters
  const country = req.query?.['country'];
  const company = req.query?.['company'];

  if (
    !country ||
    !company ||
    typeof country !== 'string' ||
    typeof company !== 'string'
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing required country or company parameter.',
      },
    });
  }

  if (country.length > 100 || company.length > 100) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Parameters exceed maximum allowed length of 100 characters.',
      },
    });
  }

  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(country) || /[\x00-\x1F\x7F]/.test(company)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Control characters are not permitted.',
      },
    });
  }

  // 4. Construct upstream URL with only validated parameters
  const target = new URL(upstreamUrl);
  target.searchParams.set('country', country.trim());
  target.searchParams.set('company', company.trim());

  // 5. Fetch from upstream with 10-second timeout
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

    const contentType = upstreamRes.headers.get('content-type') || '';
    const rawText = await upstreamRes.text();

    let jsonEnvelope: any;
    try {
      jsonEnvelope = JSON.parse(rawText);
    } catch {
      // Upstream returned HTML (e.g. Google Login / error page) or invalid JSON
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Upstream service returned invalid non-JSON response.',
        },
      });
    }

    // 6. Set appropriate cache headers based on response
    if (jsonEnvelope.ok === true) {
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=120, stale-while-revalidate=300'
      );
      return res.status(200).json(jsonEnvelope);
    }

    const errCode = jsonEnvelope?.error?.code;
    if (errCode === 'NOT_FOUND' || errCode === 'DUPLICATE') {
      res.setHeader('Cache-Control', 'public, s-maxage=30');
      return res.status(200).json(jsonEnvelope);
    }

    // Other errors
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(jsonEnvelope);
  } catch (err: any) {
    clearTimeout(timeoutId);

    res.setHeader('Cache-Control', 'no-store');
    if (err.name === 'AbortError') {
      return res.status(504).json({
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Upstream service request timed out after 10 seconds.',
        },
      });
    }

    return res.status(502).json({
      ok: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to communicate with upstream service.',
      },
    });
  }
}
