/**
 * DEV-ONLY Mock API Server
 * Simulates Google Apps Script / Vercel proxy endpoints for local development and testing.
 * Runs on port 3000 by default (or PORT env var).
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 3000;

const FIXTURES = {
  'uk::tcs': {
    ok: true,
    data: {
      country: 'UK',
      company: 'TCS',
      location: 'London',
      companyDetails:
        'Tata Consultancy Services UK is a premier technology partner delivering AI and cloud solutions.\n\nOur Specialties:\n- Financial Systems\n- Enterprise Scalability\n- Digital Transformation',
      jobDetails:
        'Current Openings in London:\n1. Lead Solution Architect\n2. Senior TypeScript Developer\n3. Cloud Security Engineer',
      logo: {
        source: 'url',
        url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=200',
      },
      images: [
        { id: '1demo-uk-office-1', name: '01-london-office.jpg' },
        { id: '1demo-uk-team-2', name: '02-team.jpg' },
      ],
      videos: [
        {
          source: 'youtube',
          id: 'dQw4w9WgXcQ',
          name: 'UK Innovation Showcase',
        },
      ],
      warnings: [],
    },
  },
  'india::tcs': {
    ok: true,
    data: {
      country: 'India',
      company: 'TCS',
      location: 'Mumbai',
      companyDetails:
        'Tata Consultancy Services India is one of the largest multinational IT services corporations.\n\nKey Strengths:\n• Global delivery network\n• Industry-leading retention\n• Cutting-edge innovation labs',
      jobDetails:
        'Campus & Lateral Recruitment:\n1. Cloud Architect\n2. Angular Full Stack Engineer\n3. DevOps Engineer',
      logo: {
        source: 'url',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200',
      },
      images: [
        { id: '1demo-in-mumbai-1', name: '01-mumbai-campus.jpg' },
        { id: '1demo-in-mumbai-2', name: '02-tech-hub.jpg' },
      ],
      videos: [
        {
          source: 'youtube',
          id: 'dQw4w9WgXcQ',
          name: 'TCS India Campus Walkthrough',
        },
      ],
      warnings: [],
    },
  },
  'india::demo-technologies': {
    ok: true,
    data: {
      country: 'India',
      company: 'Demo Technologies',
      location: 'Mumbai, Maharashtra',
      companyDetails:
        'Demo Technologies is an enterprise consulting firm specializing in cross-border visas and talent relocation.\n\nCore Focus Areas:\n- Corporate Immigration Advisory\n- Global Mobility Solutions\n- Regulatory Compliance',
      jobDetails:
        'Requirements:\n1. Immigration Case Specialist\n2. Legal Documentation Lead\n\nMust have excellent communication skills.',
      logo: {
        source: 'url',
        url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300',
      },
      images: [
        { id: '1demo-folder-img-1', name: '01-headquarters.jpg' },
        { id: '1demo-folder-img-2', name: '02-boardroom.jpg' },
        { id: '1demo-folder-img-3', name: '03-team-summit.jpg' },
      ],
      videos: [
        {
          source: 'youtube',
          id: 'dQw4w9WgXcQ',
          name: 'Corporate Overview',
        },
      ],
      warnings: [],
    },
  },
  'india::text-only': {
    ok: true,
    data: {
      country: 'India',
      company: 'Text Only Enterprises',
      location: 'Bengaluru',
      companyDetails:
        'A company with text details only and no gallery or video media.\n\nNotice how gallery and video sections are completely hidden.',
      jobDetails:
        'Consultants Needed:\n- Principal Business Analyst\n- Solution Architect',
      logo: null,
      images: [],
      videos: [],
      warnings: [],
    },
  },
  'india::no-media': {
    ok: true,
    data: {
      country: 'India',
      company: 'No Media Corporation',
      location: 'New Delhi',
      companyDetails:
        'Pure advisory organization without media. Verifies initials avatar and section omission.',
      jobDetails: '',
      logo: null,
      images: [],
      videos: [],
      warnings: [],
    },
  },
};

const server = http.createServer((req, res) => {
  // CORS for local dev convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health endpoint
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        status: 'up',
        time: new Date().toISOString(),
      })
    );
    return;
  }

  // Profile endpoint
  if (pathname === '/api/profile') {
    const country = parsedUrl.searchParams.get('country') || '';
    const company = parsedUrl.searchParams.get('company') || '';

    // Simulate Slow Response
    if (company === 'slow') {
      setTimeout(() => {
        const fixture = FIXTURES['india::demo-technologies'];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fixture));
      }, 2500);
      return;
    }

    // Simulate Duplicate State
    if (company === 'duplicate-co') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=30',
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'DUPLICATE',
            message: 'This profile is temporarily unavailable.',
          },
        })
      );
      return;
    }

    // Simulate Server Error
    if (company === 'error-case') {
      res.writeHead(502, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Upstream database connection failure.',
          },
        })
      );
      return;
    }

    // Check Fixtures
    const key = `${country.toLowerCase()}::${company.toLowerCase()}`;
    const fixture = FIXTURES[key];

    if (fixture) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      });
      res.end(JSON.stringify(fixture));
      return;
    }

    // Not Found
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30',
    });
    res.end(
      JSON.stringify({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Company not found.',
        },
      })
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[Mock API] Listening on http://localhost:${PORT}`);
});
