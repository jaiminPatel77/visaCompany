# Beginner-Friendly Setup & Deployment Guide

This guide walks you step-by-step through setting up your Google Spreadsheet, deploying the Google Apps Script API, configuring media folders in Google Drive, and deploying your Angular application to Vercel.

---

## Copy-Paste Header Row

When creating your sheet tab, copy and paste this exact tab-separated row into cell **A1**:

```text
Country	Company	Company Details	Job Details	Location	Logo	Media Folder	Video Links	Profile URL
```

> [!IMPORTANT]
> The spreadsheet tab must be named exactly `Companies`. Do not rename, remove, or rearrange these 9 columns.

---

## Step A: Google Sheet Setup

1. **Create the Spreadsheet**:
   - Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
   - Name the spreadsheet `Company_Profile_Database`.
   - Rename the first tab (bottom sheet tab) to `Companies`.
2. **Paste Headers**:
   - Click in cell **A1** and paste the header row above.
3. **Open Apps Script Editor**:
   - Click on the top menu: **Extensions** > **Apps Script**.
   - Delete any default code in `Code.gs`.
   - Open [apps-script/Code.gs](file:///apps-script/Code.gs) in this repository, copy its entire contents, and paste it into the editor's `Code.gs`.
   - Open [apps-script/appsscript.json](file:///apps-script/appsscript.json), click on the gear icon (Project Settings) in Apps Script, enable **"Show 'appsscript.json' manifest file in editor"**, open `appsscript.json`, and ensure `"runtimeVersion": "V8"` is set.
   - Click the floppy disk icon (**Save project**).
4. **Run "Setup sheet"**:
   - Refresh your Google Sheet tab in your browser.
   - You will now see a custom menu appear at the top: **Business Profile**.
   - Click **Business Profile** > **Setup sheet**.
   - *First-time authorization*: Google will ask for permission. Click **Continue**, select your account, click **Advanced**, and click **Go to Untitled project (unsafe)** to grant permissions.
   - The script will format the header in bold navy with white text, freeze row 1, set column widths, apply word wrap, protect the `Profile URL` column, and insert a sample company row ("India / Demo Technologies").
5. **Set Website URL**:
   - In the Google Sheet, click **Business Profile** > **Set website URL**.
   - Enter your base website URL (e.g., `https://your-app.vercel.app` or `http://localhost:4200` for local testing). Must start with `https://` (or your dev url) with no trailing slash.
   - Click **OK**. The script will automatically generate the `Profile URL` for all rows!
6. **Verify URL Generation**:
   - Type a new Country in row 3 (e.g. `UK`) and Company (e.g. `TCS`).
   - Notice that the `Profile URL` in column 9 immediately fills with `{BASE_URL}/uk/tcs`.
   - Clear either Country or Company, and notice that the URL cell clears automatically.

---

## Step B: Google Drive Media Folder Setup

1. **Create a Company Media Folder**:
   - Open [Google Drive](https://drive.google.com).
   - Create a folder named for your company (e.g. `Demo Technologies Assets`).
2. **Upload Images and Videos**:
   - Upload your image files (`.jpg`, `.png`, or `.webp`).
   - If you want a company logo from Drive, name it `logo.png` or `logo.jpg` inside the folder. The script will automatically pick it up as the company logo and exclude it from the image gallery!
   - Name your gallery images using natural numbering (e.g. `01-office.jpg`, `02-team.jpg`, `10-summit.jpg`) so they display in order.
3. **Set Folder Permissions (Critical)**:
   - Right-click the folder > **Share** > **Share**.
   - Under *General access*, change from "Restricted" to **"Anyone with the link"**.
   - Ensure the role is set to **Viewer**.
   - Click **Copy link** and paste this link into the `Media Folder` column (Column G) of your sheet.
4. **Add Video Links (Column H)**:
   - For YouTube videos: paste any YouTube link (`https://www.youtube.com/watch?v=...`, `https://youtu.be/...`, or `https://www.youtube.com/shorts/...`).
   - For Drive videos: upload an `.mp4` video to Drive, share as "Anyone with the link: Viewer", and paste the link.
   - You can add multiple videos separated by a new line (or commas). Folder videos appear first, followed by your Video Links.
5. **Drive Media Limits Note**:
   - Drive preview is intended for document inspection and can hit bandwidth limits if many users stream at once. For public or high-traffic production videos, **YouTube links are strongly recommended**.

---

## Step C: Deploy Google Apps Script Web App

1. **Deploy as Web App**:
   - In the Apps Script editor, click the blue **Deploy** button (top right) > **New deployment**.
   - Click the gear icon next to "Select type" and select **Web app**.
   - Set the configuration:
     - **Description**: `Dynamic Profile API v1`
     - **Execute as**: `Me (your email address)`
     - **Who has access**: `Anyone` *(Must be "Anyone" so the proxy can call it)*
   - Click **Deploy**.
   - Copy the generated **Web app URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).
2. **Test Endpoints in Browser**:
   - Open a new browser tab and navigate to:
     ```text
     https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=ping
     ```
     You should see: `{"ok":true,"status":"up","time":"..."}`.
   - Test a company profile:
     ```text
     https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?country=india&company=demo-technologies
     ```
     You should receive the structured company profile JSON!
3. **Important Note on Making Code Changes**:
   - Apps Script does NOT automatically update deployed endpoints when you edit code.
   - Whenever you edit `Code.gs`, you MUST click **Deploy** > **Manage deployments** > Click the pencil icon (**Edit**) > Select **New version** from the Version dropdown > Click **Deploy**. Otherwise, your web app will continue running the previous code.

---

## Step D: Deploying to Vercel

1. **Push Code to GitHub**:
   - Push this workspace to your GitHub repository.
2. **Import into Vercel**:
   - Log in to your [Vercel Dashboard](https://vercel.com).
   - Click **Add New...** > **Project**.
   - Import your GitHub repository.
   - Framework Preset: **Angular**.
   - Root Directory: `./` (current directory).
   - Build Command: `ng build`.
   - Output Directory: `dist/business-profile/browser`.
3. **Configure Environment Variable**:
   - In the Vercel project configuration, expand **Environment Variables**.
   - Add:
     - **Name**: `APPS_SCRIPT_URL`
     - **Value**: The Web App URL you copied in Step C (e.g. `https://script.google.com/macros/s/.../exec`).
   - Click **Deploy**.
4. **Verify Live Deployment**:
   - Once deployed, visit:
     ```text
     https://your-domain.vercel.app/api/health
     ```
     It should return `{"ok":true,"status":"up",...}`.
   - Visit a direct profile URL:
     ```text
     https://your-domain.vercel.app/india/demo-technologies
     ```
   - Refresh the page to confirm that the SPA rewrite works and deep links load directly!
   - Now update your base URL in the Google Sheet (Step A.5) to point to `https://your-domain.vercel.app` so all generated profile URLs use your real domain.

---

## Step E: Adding Profiles End-to-End

### Adding Company #1
1. In row 2 of your sheet, fill in:
   - Country: `India`
   - Company: `Reliance Industries`
   - Company Details: `Reliance Industries is a Fortune 500 company and the largest private sector corporation in India.`
   - Job Details: `Open Roles:\n- Senior Cloud Architect\n- Data Scientist`
   - Location: `Mumbai, India`
   - Logo: An https logo URL or a Drive file link.
   - Media Folder: A Drive folder link shared with "Anyone with the link".
   - Video Links: A YouTube URL.
2. The `Profile URL` immediately appears: `https://your-domain.vercel.app/india/reliance-industries`.
3. Click or scan the link — your profile is instantly live!

### Adding Company #2 (Zero Code, Zero Redeploy)
1. Add row 3:
   - Country: `UK`
   - Company: `TCS`
   - Location: `London`
2. The `Profile URL` is generated: `https://your-domain.vercel.app/uk/tcs`.
3. Done! That URL is immediately live.

---

## Troubleshooting Guide

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Blank or broken image tile** | Drive folder or file is set to "Restricted" | Change the Drive folder sharing settings to **"Anyone with the link: Viewer"**. |
| **Drive video does not play immediately** | Google Drive is still processing the video | Wait a few minutes for Drive to complete video encoding, or use a YouTube link instead. |
| **Changes made in sheet do not show up immediately** | Edge proxy cache or Apps Script cache | Wait up to 2 minutes for edge cache revalidation, or click **Business Profile** > **Clear cache** in your sheet. |
| **Profile URL did not generate automatically** | Edits made by external scripts, bulk import, or row sorting do not fire simple triggers | Click **Business Profile** > **Generate all URLs** from the sheet menu. |
| **API returns HTML login page instead of JSON** | Apps Script Web App was deployed with access restricted to "Only myself" | In Apps Script, go to Deploy > Manage deployments > Edit > Set **Who has access** to **Anyone** > Deploy. |
| **Code changes in Apps Script have no effect** | Web app is still pointing to the old version | Deploy > Manage deployments > Edit > Select **New version** > Deploy. |
| **"Duplicate company" highlight in red** | Two rows share the same `slug(Country) + slug(Company)` | Resolve the duplicate name or country in the spreadsheet. The highlight clears automatically. |
