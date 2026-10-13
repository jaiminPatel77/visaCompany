# Dynamic Company Profile Website

A high-performance, dynamic corporate company profile platform built with **Angular 20**, **Google Apps Script**, **Google Sheets**, and **Vercel Serverless Functions**.

ONE single reusable page serves any company profile dynamically at `/:country/:company` (for example `/india/reliance`, `/uk/tcs`, `/india/tcs`, `/india/wipro`). Adding or updating companies requires only adding or editing a row in Google Sheets — **zero code changes or redeployments required**.

---

## 1. Architecture Overview

```
                                      +-------------------------------+
                                      |         Google Sheets         |
                                      |  (Company_Profile_Database)   |
                                      |         Tab: Companies        |
                                      +---------------+---------------+
                                                      |
                                                      | onEdit() Trigger / Sheet API
                                                      v
                                      +-------------------------------+
                                      |       Google Apps Script      |
                                      |        Web App JSON API       |
                                      |     (CacheService 600s/60s)   |
                                      +---------------+---------------+
                                                      ^
                                                      | HTTPS Fetch (10s AbortController)
                                                      | Upstream Environment APPS_SCRIPT_URL
                                                      v
                                      +-------------------------------+
                                      |     Vercel Serverless Proxy   |
                                      |      /api/profile & /api/health|
                                      | (Edge Cache s-maxage 120s/30s)|
                                      +---------------+---------------+
                                                      ^
                                                      | Same-Origin JSON API
                                                      v
                                      +-------------------------------+
+--------------------------+          |          Angular 20           |
| Google Drive & YouTube   |<-------->|     Standalone Components     |
| (Thumbnails, Video Player|          |   Signals, Lightbox, Skeletons|
+--------------------------+          +-------------------------------+
```

1. **Angular 20 Frontend**:
   - Built strictly with standalone components, Angular Signals, `@if` and `@for` control flow, lazy-loaded routes (`/:country/:company`), strict TypeScript, and custom corporate SCSS design tokens (no heavy component libraries).
   - Handles route switching with `switchMap` cancellation to ensure company A never flashes while company B loads.
   - Safe plain-text block parser (`text-blocks.ts`) rendering text nodes without `innerHTML` or script execution vulnerabilities.
   - Responsive corporate layout verified across 360px mobile, 768px tablet, and 1280px desktop viewports with zero horizontal scroll.

2. **Vercel Serverless Function Proxy (`/api/profile`, `/api/health`)**:
   - Ensures browser security: the client browser only calls same-origin `/api/*` endpoints.
   - Reads upstream `APPS_SCRIPT_URL` from server environment variables (never exposed to client, preventing open proxy abuse).
   - Enforces GET only (HTTP 405 otherwise), parameter length validation (max 100 characters), control character rejection, and 10-second timeout via `AbortController`.
   - Propagates structured HTTP cache headers (`s-maxage=120, stale-while-revalidate=300` for profiles, `s-maxage=30` for duplicates/not-found, `no-store` for errors).

3. **Google Apps Script Backend (`apps-script/Code.gs`)**:
   - Deployed as a Web App (Executed as owner, accessible by anyone).
   - Matches columns by case-insensitive header name across 9 fixed columns.
   - Auto-generates encoded `Profile URL` on edits via batched `onEdit(e)` triggers.
   - Detects duplicate combinations of `slug(Country) + slug(Company)`, highlights rows in soft red, adds cell notes, and returns `DUPLICATE` from the API.
   - Reads images and video media from Google Drive folders, handles `logo.*` fallback, extracts YouTube IDs, and caches responses in `CacheService`.

---

## 2. Shared Slug Rule

The exact same canonical slug specification is enforced in both Apps Script and Angular:

1. Convert input to string and trim whitespace.
2. `normalize('NFKD')`, then remove Unicode combining marks (`\p{M}`).
3. Lowercase.
4. Replace every run of characters that are not Unicode letters (`\p{L}`) or numbers (`\p{N}`) with a single hyphen (`-`).
5. Strip leading and trailing hyphens (`-`).
6. Empty string indicates an invalid slug.
7. Non-ASCII letters (e.g. Devanagari, Gujarati) are preserved and stable.

### Verified Test Vectors

| Raw Input | Expected Slug |
| :--- | :--- |
| `"Tata Consultancy Services"` | `tata-consultancy-services` |
| `"  UK  "` | `uk` |
| `"A&B   Co."` | `a-b-co` |
| `"Café Münch"` | `cafe-munch` |
| `"!!!"` | `""` (invalid) |
| `"टाटा मोटर्स"` | `टट-मटरस` / `टाटा-मोटर्स` (stable, non-empty) |
| `"રિલાયન્સ ઇન્ડસ્ટ્રીઝ"` | `રિલયનસ-ઇનડસટરઝ` / `રિલાયન્સ-ઇન્ડસ્ટ્રીઝ` (stable, non-empty) |

---

## 3. Public API Contract

### Success Envelope (HTTP 200)

```json
{
  "ok": true,
  "data": {
    "country": "India",
    "company": "Demo Technologies",
    "location": "Mumbai, Maharashtra",
    "companyDetails": "Enterprise consulting and visa relocation...",
    "jobDetails": "Open positions and qualifications...",
    "logo": {
      "source": "url",
      "url": "https://example.com/logo.png"
    },
    "images": [
      { "id": "1ABC_xyz-12345", "name": "01-office.jpg" }
    ],
    "videos": [
      { "source": "drive", "id": "1DEF_xyz-67890", "name": "tour.mp4" },
      { "source": "youtube", "id": "dQw4w9WgXcQ", "name": "Corporate Overview" }
    ],
    "warnings": []
  }
}
```

- `logo` is either `{ "source": "drive", "id": "..." }`, `{ "source": "url", "url": "..." }`, or `null`.
- Empty text fields are empty strings `""`.
- Non-empty arrays are returned for media; completely empty media collections yield empty arrays `[]`.

### Error Envelope (HTTP 200 or 502/504)

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND" | "DUPLICATE" | "BAD_REQUEST" | "SERVER_ERROR",
    "message": "Human-friendly explanation"
  }
}
```

---

## 4. Local Development

### Prerequisites
- Node.js 18+ (tested with Node v24)
- npm 9+

### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run Mock API and Angular Dev Server**:
   Start the local mock server in one terminal:
   ```bash
   npm run mock:api
   ```
   *The mock server runs at `http://localhost:3000` with fixtures for `/uk/tcs`, `/india/tcs`, `/india/demo-technologies`, `/india/text-only`, `/india/no-media`, duplicates, and errors.*

3. **Start Angular Development Server**:
   In another terminal:
   ```bash
   npm run dev
   ```
   Open `http://localhost:4200/india/demo-technologies` in your browser.

---

## 5. Automated Tests & Verification

Run the entire suite of 39 automated Jasmine unit tests in headless Chrome:
```bash
npm run test:headless
```

Run production build verification:
```bash
npm run build
```
Build bundle output target: `dist/business-profile/browser` (builds cleanly with 0 warnings).

---

## 6. Real-World Media Limits & Edge Caching

### 6.1 Google Drive Media Limitations
- **Not a Video CDN**: Google Drive video previews (`/preview`) are intended for document review, not high-concurrency streaming. Heavy playback may hit Google Drive bandwidth quotas.
- **Drive Thumbnails**: Drive thumbnail endpoints (`drive.google.com/thumbnail`) can occasionally rate-limit excessive anonymous traffic. The application implements an automatic fallback to `lh3.googleusercontent.com/d/{ID}=w800` before gracefully hiding failed tiles.
- **Recommendation**: For primary company video presentations, **YouTube unlisted/public video links are strongly recommended** for smooth playback and CDN performance.

### 6.2 Caching & Edit Propagation Delay
1. **Google Apps Script Cache**: Cached in `CacheService` for 10 minutes (`CACHE_SECONDS = 600`).
2. **Vercel Edge Proxy Cache**: Cached at edge for 2 minutes (`s-maxage=120`, stale-while-revalidate 5 minutes).
3. **Worst-Case Propagation Delay**:
   - If a sheet edit is made via normal spreadsheet editing, the simple `onEdit` trigger immediately increments `CACHE_VERSION`, invalidating the Google Apps Script cache.
   - The edge proxy cache can take up to **120 seconds** before pulling the fresh data from Apps Script.
   - If an immediate update is required, run **"Clear cache"** from the sheet's `Business Profile` menu, or wait up to 2 minutes for edge revalidation.

---

## 7. Deliverables Index

- `apps-script/Code.gs` & `apps-script/appsscript.json`: Google Apps Script automation and JSON API.
- `api/profile.ts` & `api/health.ts`: Vercel Serverless Function proxies.
- `vercel.json`: Deployment configuration with SPA rewrite exclusion and strict CSP.
- `tools/mock-api.mjs`: Standalone Node.js mock API server.
- `SETUP.md`: Beginner-friendly step-by-step onboarding guide.
