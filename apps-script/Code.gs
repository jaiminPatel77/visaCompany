/**
 * Dynamic Company Profile - Google Apps Script Backend
 * Runtime: V8
 *
 * Serves JSON API and handles Google Sheet automation:
 * - Auto URL generation on edits
 * - Duplicate detection and highlighting
 * - Drive media listing & YouTube link extraction
 * - Caching and testing utilities
 */

// ==========================================
// CONSTANTS
// ==========================================
var SHEET_NAME = 'Companies';
var MAX_IMAGES = 24;
var MAX_VIDEOS = 6;
var CACHE_SECONDS = 600;
var NOT_FOUND_CACHE_SECONDS = 60;
var MAX_TEXT_LENGTH = 5000;

var DRIVE_ID_REGEX = /^[A-Za-z0-9_-]{10,}$/;
var YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

var HEADERS_ORDER = [
  'Country',
  'Company',
  'Company Details',
  'Job Details',
  'Location',
  'Logo',
  'Media Folder',
  'Video Links',
  'Profile URL'
];

// ==========================================
// MENU: onOpen
// ==========================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Business Profile')
    .addItem('Setup sheet', 'setupSheet')
    .addItem('Set website URL', 'setWebsiteUrl')
    .addItem('Generate all URLs', 'generateAllUrls')
    .addItem('Validate duplicates', 'validateDuplicatesDialog')
    .addItem('Clear cache', 'clearCache')
    .addItem('Test API', 'testApiPing')
    .addItem('Test a profile', 'testProfilePrompt')
    .addToUi();
}

// ==========================================
// CANONICAL SLUGIFY RULE
// ==========================================
function slugify(s) {
  if (s === null || s === undefined) return '';
  var str = String(s).trim();
  if (!str) return '';

  // 2. normalize('NFKD'), remove combining marks (\p{M})
  var decomposed = str.normalize('NFKD').replace(/\p{M}/gu, '');

  // 3. Lowercase
  var lower = decomposed.toLowerCase();

  // 4. Replace every run of characters that are not \p{L} or \p{N} with a single '-'
  var hyphenated = lower.replace(/[^\p{L}\p{N}]+/gu, '-');

  // 5. Strip leading/trailing '-'
  var cleaned = hyphenated.replace(/^-+|-+$/g, '');

  // 6. Empty result means invalid
  return cleaned;
}

// ==========================================
// SHEET SETUP & HEADERS
// ==========================================
function getHeadersMap(sheet) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var name = String(headerRow[i] || '').trim().toLowerCase();
    if (name) {
      map[name] = i + 1; // 1-indexed column
    }
  }

  // Verify required headers
  var missing = [];
  for (var j = 0; j < HEADERS_ORDER.length; j++) {
    var key = HEADERS_ORDER[j].toLowerCase();
    if (!map[key]) {
      missing.push(HEADERS_ORDER[j]);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      "Missing required headers: " + missing.join(', ') +
      ". Please run 'Setup sheet' from the Business Profile menu."
    );
  }

  return map;
}

function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Write headers
  sheet.getRange(1, 1, 1, HEADERS_ORDER.length).setValues([HEADERS_ORDER]);

  // Format Header Row: Bold navy with white text, frozen row 1
  var headerRange = sheet.getRange(1, 1, 1, HEADERS_ORDER.length);
  headerRange
    .setBackground('#0B2545')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setFontSize(11)
    .setVerticalAlignment('middle');

  sheet.setFrozenRows(1);

  // Column widths
  sheet.setColumnWidth(1, 140); // Country
  sheet.setColumnWidth(2, 200); // Company
  sheet.setColumnWidth(3, 320); // Company Details
  sheet.setColumnWidth(4, 320); // Job Details
  sheet.setColumnWidth(5, 160); // Location
  sheet.setColumnWidth(6, 220); // Logo
  sheet.setColumnWidth(7, 240); // Media Folder
  sheet.setColumnWidth(8, 240); // Video Links
  sheet.setColumnWidth(9, 280); // Profile URL

  // Text wrap for Details
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 2).setWrap(true);

  // Profile URL light-grey background & notes
  var maxRows = Math.max(sheet.getMaxRows() - 1, 100);
  sheet.getRange(2, 9, maxRows, 1).setBackground('#F1F5F9');

  // Header notes
  sheet.getRange(1, 7).setNote('Paste a Drive folder link');
  sheet.getRange(1, 8).setNote('One link per line (commas also accepted)');
  sheet.getRange(1, 9).setNote('Auto-generated, do not edit');

  // Warning-only protection on Profile URL column
  try {
    var protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    for (var p = 0; p < protections.length; p++) {
      if (protections[p].getRange().getColumn() === 9) {
        protections[p].remove();
      }
    }
    var protection = sheet.getRange(2, 9, maxRows, 1).protect();
    protection.setDescription('Profile URL Auto-Generated');
    protection.setWarningOnly(true);
  } catch (protErr) {
    console.warn('Could not set protection: ' + protErr);
  }

  // Insert sample row if sheet has only row 1
  if (sheet.getLastRow() <= 1) {
    var baseUrl = getBaseUrl();
    var sampleUrl = baseUrl
      ? baseUrl + '/' + encodeURIComponent(slugify('India')) + '/' + encodeURIComponent(slugify('Demo Technologies'))
      : '';

    var sampleRow = [
      'India',
      'Demo Technologies',
      'Demo Technologies is a pioneering consulting and technology firm delivering enterprise solutions globally.\n\nKey Capabilities:\n- Cloud Architecture\n- Scalable Systems\n- Automated Workflows',
      'Open Positions:\n1. Senior Full Stack Engineer (TypeScript / Angular)\n2. Cloud DevOps Specialist',
      'Mumbai, Maharashtra',
      'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300',
      '',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      sampleUrl
    ];
    sheet.appendRow(sampleRow);
  }

  SpreadsheetApp.getUi().alert('Sheet setup completed successfully!');
}

// ==========================================
// SCRIPT PROPERTIES & URL GENERATION
// ==========================================
function getBaseUrl() {
  var props = PropertiesService.getScriptProperties();
  return (props.getProperty('BASE_URL') || '').trim();
}

function setWebsiteUrl() {
  var ui = SpreadsheetApp.getUi();
  var currentUrl = getBaseUrl();
  var promptResult = ui.prompt(
    'Set Website URL',
    'Enter your deployed website base URL (must start with https://):\nCurrently: ' + (currentUrl || '(not set)'),
    ui.ButtonSet.OK_CANCEL
  );

  if (promptResult.getSelectedButton() !== ui.Button.OK) return;

  var entered = promptResult.getResponseText().trim();
  if (!entered.toLowerCase().startsWith('https://')) {
    ui.alert('Error: Website URL must start with https://');
    return;
  }

  var cleaned = entered.replace(/\/+$/, '');
  PropertiesService.getScriptProperties().setProperty('BASE_URL', cleaned);
  ui.alert('Website URL saved: ' + cleaned + '\nNow generating profile URLs...');
  generateAllUrls();
}

function generateAllUrls() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert("Sheet '" + SHEET_NAME + "' not found.");
    return;
  }

  var map = getHeadersMap(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var countryCol = map['country'];
  var companyCol = map['company'];
  var urlCol = map['profile url'];

  var range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var values = range.getValues();
  var baseUrl = getBaseUrl();

  var urlUpdates = [];

  for (var i = 0; i < values.length; i++) {
    var countryVal = values[i][countryCol - 1];
    var companyVal = values[i][companyCol - 1];

    var countrySlug = slugify(countryVal);
    var companySlug = slugify(companyVal);

    if (baseUrl && countrySlug && companySlug) {
      var url = baseUrl + '/' + encodeURIComponent(countrySlug) + '/' + encodeURIComponent(companySlug);
      urlUpdates.push([url]);
    } else {
      urlUpdates.push(['']);
    }
  }

  sheet.getRange(2, urlCol, urlUpdates.length, 1).setValues(urlUpdates);

  validateDuplicatesInternal(sheet, map, false);
  bumpCacheVersion();
}

// ==========================================
// TRIGGER: onEdit (Simple Trigger)
// ==========================================
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var range = e.range;
    var sheet = range.getSheet();
    if (sheet.getName() !== SHEET_NAME) return;

    var map;
    try {
      map = getHeadersMap(sheet);
    } catch (err) {
      return;
    }

    var countryCol = map['country'];
    var companyCol = map['company'];
    var urlCol = map['profile url'];

    var startCol = range.getColumn();
    var endCol = startCol + range.getNumColumns() - 1;

    // Check if edit touches Country or Company column
    var touchesCountry = (startCol <= countryCol && endCol >= countryCol);
    var touchesCompany = (startCol <= companyCol && endCol >= companyCol);

    if (!touchesCountry && !touchesCompany) {
      return;
    }

    var startRow = Math.max(range.getRow(), 2);
    var numRows = range.getLastRow() - startRow + 1;
    if (numRows <= 0) return;

    var baseUrl = getBaseUrl();
    var rowValues = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getValues();

    var urlBatch = [];
    for (var r = 0; r < rowValues.length; r++) {
      var cVal = rowValues[r][countryCol - 1];
      var coVal = rowValues[r][companyCol - 1];

      var cSlug = slugify(cVal);
      var coSlug = slugify(coVal);

      if (baseUrl && cSlug && coSlug) {
        var profileUrl = baseUrl + '/' + encodeURIComponent(cSlug) + '/' + encodeURIComponent(coSlug);
        urlBatch.push([profileUrl]);
      } else {
        urlBatch.push(['']);
      }
    }

    // Single batched write
    sheet.getRange(startRow, urlCol, urlBatch.length, 1).setValues(urlBatch);

    // Re-run duplicate detection & bump cache version
    validateDuplicatesInternal(sheet, map, false);
    bumpCacheVersion();
  } catch (error) {
    console.error('onEdit trigger error: ' + error);
  }
}

// ==========================================
// DUPLICATE VALIDATION
// ==========================================
function validateDuplicatesDialog() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;
  var map = getHeadersMap(sheet);
  validateDuplicatesInternal(sheet, map, true);
}

function validateDuplicatesInternal(sheet, map, showDialog) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    if (showDialog) SpreadsheetApp.getUi().alert('No data rows to validate.');
    return;
  }

  var countryCol = map['country'];
  var companyCol = map['company'];
  var urlCol = map['profile url'];

  var numRows = lastRow - 1;
  var data = sheet.getRange(2, 1, numRows, sheet.getLastColumn()).getValues();

  var keysMap = {};
  var duplicateRowIndices = new Set();

  for (var i = 0; i < data.length; i++) {
    var cSlug = slugify(data[i][countryCol - 1]);
    var coSlug = slugify(data[i][companyCol - 1]);

    if (!cSlug || !coSlug) continue;

    var key = cSlug + '::' + coSlug;
    if (keysMap[key]) {
      duplicateRowIndices.add(keysMap[key]);
      duplicateRowIndices.add(i + 2); // row number (1-indexed)
    } else {
      keysMap[key] = i + 2;
    }
  }

  // Clear and update formatting for affected columns
  for (var r = 2; r <= lastRow; r++) {
    var isDup = duplicateRowIndices.has(r);
    var countryCell = sheet.getRange(r, countryCol);
    var companyCell = sheet.getRange(r, companyCol);
    var urlCell = sheet.getRange(r, urlCol);

    if (isDup) {
      countryCell.setBackground('#FEE2E2').setNote('Duplicate company');
      companyCell.setBackground('#FEE2E2').setNote('Duplicate company');
      urlCell.setBackground('#FEE2E2').setNote('Duplicate company');
    } else {
      // Clear highlight and note
      countryCell.setBackground(null).clearNote();
      companyCell.setBackground(null).clearNote();
      urlCell.setBackground('#F1F5F9').clearNote();
    }
  }

  if (showDialog) {
    var ui = SpreadsheetApp.getUi();
    if (duplicateRowIndices.size > 0) {
      var sortedRows = Array.from(duplicateRowIndices).sort(function (a, b) { return a - b; });
      ui.alert(
        'Duplicates Found',
        'The following rows have duplicate Country + Company combinations:\n' +
        'Rows: ' + sortedRows.join(', ') + '\n\n' +
        'These rows are highlighted in red. The public API will return DUPLICATE for these profiles until resolved.',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('No duplicate companies found. All entries are unique!');
    }
  }
}

// ==========================================
// CACHE SERVICE UTILITIES
// ==========================================
function getCacheVersion() {
  var props = PropertiesService.getScriptProperties();
  var v = props.getProperty('CACHE_VERSION');
  if (!v) {
    v = '1';
    props.setProperty('CACHE_VERSION', v);
  }
  return v;
}

function bumpCacheVersion() {
  try {
    var props = PropertiesService.getScriptProperties();
    var current = parseInt(props.getProperty('CACHE_VERSION') || '1', 10);
    var next = String(current + 1);
    props.setProperty('CACHE_VERSION', next);
  } catch (e) {
    console.error('Failed to bump cache version: ' + e);
  }
}

function clearCache() {
  bumpCacheVersion();
  SpreadsheetApp.getUi().alert('API Cache cleared successfully!');
}

// ==========================================
// MEDIA EXTRACTORS & HELPERS
// ==========================================
function extractDriveFolderId(url) {
  if (!url || typeof url !== 'string') return null;
  var str = url.trim();

  // /folders/{ID}
  var matchFolder = str.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (matchFolder) return matchFolder[1];

  // ?id={ID}
  var matchParam = str.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (matchParam) return matchParam[1];

  // Direct ID check
  if (DRIVE_ID_REGEX.test(str)) return str;

  return null;
}

function extractDriveFileId(url) {
  if (!url || typeof url !== 'string') return null;
  var str = url.trim();

  // /file/d/{ID}
  var matchFile = str.match(/\/file\/d\/([A-Za-z0-9_-]{10,})/);
  if (matchFile) return matchFile[1];

  // ?id={ID}
  var matchParam = str.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
  if (matchParam) return matchParam[1];

  // Direct ID check
  if (DRIVE_ID_REGEX.test(str)) return str;

  return null;
}

function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  var str = url.trim();

  // youtu.be/ID
  var matchShort = str.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (matchShort) return matchShort[1];

  // watch?v=ID
  var matchWatch = str.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (matchWatch) return matchWatch[1];

  // /shorts/ID
  var matchShorts = str.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  if (matchShorts) return matchShorts[1];

  // /embed/ID
  var matchEmbed = str.match(/\/embed\/([A-Za-z0-9_-]{11})/);
  if (matchEmbed) return matchEmbed[1];

  // Direct ID
  if (YOUTUBE_ID_REGEX.test(str)) return str;

  return null;
}

function naturalSort(a, b) {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}

// ==========================================
// PROFILE DATA BUILDER
// ==========================================
function getProfileData(countryQuery, companyQuery) {
  var countrySlug = slugify(countryQuery);
  var companySlug = slugify(companyQuery);

  if (!countrySlug || !companySlug) {
    return {
      ok: false,
      error: { code: 'BAD_REQUEST', message: 'Country and company are required.' }
    };
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = 'profile:' + getCacheVersion() + ':' + countrySlug + ':' + companySlug;
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // cache corrupted, continue
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return {
      ok: false,
      error: { code: 'SERVER_ERROR', message: "Database tab 'Companies' not found." }
    };
  }

  var map;
  try {
    map = getHeadersMap(sheet);
  } catch (err) {
    return {
      ok: false,
      error: { code: 'SERVER_ERROR', message: err.message }
    };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    var notFoundRes = {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Company not found.' }
    };
    cache.put(cacheKey, JSON.stringify(notFoundRes), NOT_FOUND_CACHE_SECONDS);
    return notFoundRes;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  var matchingRows = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var c = slugify(r[map['country'] - 1]);
    var co = slugify(r[map['company'] - 1]);

    if (c === countrySlug && co === companySlug) {
      matchingRows.push(r);
    }
  }

  if (matchingRows.length === 0) {
    var nfRes = {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Company not found.' }
    };
    cache.put(cacheKey, JSON.stringify(nfRes), NOT_FOUND_CACHE_SECONDS);
    return nfRes;
  }

  if (matchingRows.length > 1) {
    var dupRes = {
      ok: false,
      error: { code: 'DUPLICATE', message: 'This profile is temporarily unavailable.' }
    };
    cache.put(cacheKey, JSON.stringify(dupRes), NOT_FOUND_CACHE_SECONDS);
    return dupRes;
  }

  var row = matchingRows[0];
  var warnings = [];

  var rawCountry = String(row[map['country'] - 1] || '').trim();
  var rawCompany = String(row[map['company'] - 1] || '').trim();
  var rawCompanyDetails = String(row[map['company details'] - 1] || '').trim();
  var rawJobDetails = String(row[map['job details'] - 1] || '').trim();
  var rawLocation = String(row[map['location'] - 1] || '').trim();
  var rawLogo = String(row[map['logo'] - 1] || '').trim();
  var rawFolder = String(row[map['media folder'] - 1] || '').trim();
  var rawVideos = String(row[map['video links'] - 1] || '').trim();

  // Text length check & truncation
  if (rawCompanyDetails.length > MAX_TEXT_LENGTH) {
    rawCompanyDetails = rawCompanyDetails.substring(0, MAX_TEXT_LENGTH);
    warnings.push('Company Details exceeded ' + MAX_TEXT_LENGTH + ' characters and was truncated.');
  }

  if (rawJobDetails.length > MAX_TEXT_LENGTH) {
    rawJobDetails = rawJobDetails.substring(0, MAX_TEXT_LENGTH);
    warnings.push('Job Details exceeded ' + MAX_TEXT_LENGTH + ' characters and was truncated.');
  }

  // Media Folder inspection
  var folderImages = [];
  var folderVideos = [];
  var folderLogoFile = null;

  if (rawFolder) {
    var folderId = extractDriveFolderId(rawFolder);
    if (!folderId) {
      warnings.push('Invalid Drive folder link format.');
    } else {
      try {
        var folder = DriveApp.getFolderById(folderId);

        // Check sharing access
        var access = folder.getSharingAccess();
        if (access !== DriveApp.Access.ANYONE && access !== DriveApp.Access.ANYONE_WITH_LINK) {
          warnings.push("Drive folder sharing is not set to 'Anyone with the link'. Media may fail to load.");
        }

        var files = folder.getFiles();
        while (files.hasNext()) {
          var file = files.next();
          if (file.isTrashed()) continue;

          var fId = file.getId();
          var fName = file.getName();
          var mime = file.getMimeType();

          // Check if file is folder logo
          if (/^logo\.[a-z0-9]+$/i.test(fName.trim())) {
            folderLogoFile = { source: 'drive', id: fId };
            continue; // Exclude folder logo from gallery
          }

          if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') {
            folderImages.push({ id: fId, name: fName });
          } else if (mime === 'video/mp4' || mime === 'video/quicktime' || mime === 'video/webm') {
            folderVideos.push({ source: 'drive', id: fId, name: fName });
          }
        }
      } catch (driveErr) {
        console.warn('Folder access error: ' + driveErr);
        warnings.push('Could not access media folder. Check Drive permissions.');
      }
    }
  }

  // Sort folder media naturally
  folderImages.sort(naturalSort);
  folderVideos.sort(naturalSort);

  // Logo fallback order: (1) Logo column, (2) folder file named logo.*, (3) null
  var logo = null;
  if (rawLogo) {
    var logoDriveId = extractDriveFileId(rawLogo);
    if (logoDriveId) {
      logo = { source: 'drive', id: logoDriveId };
    } else if (rawLogo.toLowerCase().startsWith('https://')) {
      logo = { source: 'url', url: rawLogo };
    } else {
      warnings.push('Logo must be a valid Drive file link or an https:// image URL.');
    }
  }

  if (!logo && folderLogoFile) {
    logo = folderLogoFile;
  }

  // Gallery images capped by MAX_IMAGES
  var images = folderImages.slice(0, MAX_IMAGES);

  // Video links parsing: folder videos first, then Video Links column
  var allVideos = [];
  var seenVideoKeys = new Set();

  function addVideo(source, id, name) {
    var key = source + ':' + id;
    if (!seenVideoKeys.has(key)) {
      seenVideoKeys.add(key);
      allVideos.push({ source: source, id: id, name: name || '' });
    }
  }

  // Add folder videos
  for (var fv = 0; fv < folderVideos.length; fv++) {
    addVideo('drive', folderVideos[fv].id, folderVideos[fv].name);
  }

  // Add Video Links column
  if (rawVideos) {
    var rawLines = rawVideos.split(/[\r\n,]+/);
    for (var vl = 0; vl < rawLines.length; vl++) {
      var line = rawLines[vl].trim();
      if (!line) continue;

      var ytId = extractYouTubeId(line);
      if (ytId) {
        addVideo('youtube', ytId, '');
        continue;
      }

      var drId = extractDriveFileId(line);
      if (drId) {
        addVideo('drive', drId, '');
        continue;
      }

      warnings.push('Skipped unrecognized video link: ' + line.substring(0, 40));
    }
  }

  var videos = allVideos.slice(0, MAX_VIDEOS);

  var result = {
    ok: true,
    data: {
      country: rawCountry,
      company: rawCompany,
      location: rawLocation,
      companyDetails: rawCompanyDetails,
      jobDetails: rawJobDetails,
      logo: logo,
      images: images,
      videos: videos,
      warnings: warnings
    }
  };

  // Cache if under 90 KB
  var serialized = JSON.stringify(result);
  if (serialized.length < 90000) {
    cache.put(cacheKey, serialized, CACHE_SECONDS);
  }

  return result;
}

// ==========================================
// HTTP ENDPOINT: doGet(e)
// ==========================================
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // 1. Health check: ?action=ping
    if (params.action === 'ping') {
      return createJsonResponse({
        ok: true,
        status: 'up',
        time: new Date().toISOString()
      });
    }

    var country = params.country;
    var company = params.company;

    // Validate inputs (strings, max 100 chars, no control characters)
    if (!country || !company || typeof country !== 'string' || typeof company !== 'string') {
      return createJsonResponse({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Missing country or company parameter.' }
      });
    }

    if (country.length > 100 || company.length > 100) {
      return createJsonResponse({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Parameters exceed maximum length of 100 characters.' }
      });
    }

    if (/[\x00-\x1F\x7F]/.test(country) || /[\x00-\x1F\x7F]/.test(company)) {
      return createJsonResponse({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'Control characters are not permitted.' }
      });
    }

    var profile = getProfileData(country, company);
    return createJsonResponse(profile);
  } catch (err) {
    console.error('Unhandled doGet exception: ' + err);
    return createJsonResponse({
      ok: false,
      error: { code: 'SERVER_ERROR', message: 'Internal server error occurred.' }
    });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// TESTING UTILITIES (Menu / Manual)
// ==========================================
function testApiPing() {
  var dummyEvent = { parameter: { action: 'ping' } };
  var output = doGet(dummyEvent);
  SpreadsheetApp.getUi().alert('API Ping Result:\n' + output.getContent());
}

function testProfilePrompt() {
  var ui = SpreadsheetApp.getUi();
  var cPrompt = ui.prompt('Test Profile', 'Enter Country (e.g. India):', ui.ButtonSet.OK_CANCEL);
  if (cPrompt.getSelectedButton() !== ui.Button.OK) return;

  var coPrompt = ui.prompt('Test Profile', 'Enter Company (e.g. Demo Technologies):', ui.ButtonSet.OK_CANCEL);
  if (coPrompt.getSelectedButton() !== ui.Button.OK) return;

  var country = cPrompt.getResponseText();
  var company = coPrompt.getResponseText();

  var res = getProfileData(country, company);
  var jsonStr = JSON.stringify(res, null, 2);

  // Truncate for UI display if needed
  if (jsonStr.length > 1500) {
    jsonStr = jsonStr.substring(0, 1500) + '\n... (truncated)';
  }
  ui.alert('Profile Test Result:\n' + jsonStr);
}

/**
 * Self-contained unit tests covering slug vectors, ID extraction,
 * URL generation, duplicate detection, and text truncation.
 */
function runTests() {
  var passed = 0;
  var failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log('PASS: ' + testName);
      passed++;
    } else {
      console.error('FAIL: ' + testName);
      failed++;
    }
  }

  console.log('--- RUNNING BACKEND TESTS ---');

  // Slug vectors
  assert(slugify('Tata Consultancy Services') === 'tata-consultancy-services', 'Slug: Tata Consultancy Services');
  assert(slugify('  UK  ') === 'uk', 'Slug: whitespace trim');
  assert(slugify('A&B   Co.') === 'a-b-co', 'Slug: symbols and spaces');
  assert(slugify('Café Münch') === 'cafe-munch', 'Slug: accents removal');
  assert(slugify('!!!') === '', 'Slug: punctuation only -> empty');

  // Devanagari & Gujarati
  var deva = slugify('टाटा मोटर्स');
  assert(deva.length > 0 && deva === slugify('टाटा मोटर्स'), 'Slug: Devanagari stable & non-empty');
  var guj = slugify('રિલાયન્સ ઇન્ડસ્ટ્રીઝ');
  assert(guj.length > 0 && guj === slugify('રિલાયન્સ ઇન્ડસ્ટ્રીઝ'), 'Slug: Gujarati stable & non-empty');

  // ID Extractors
  assert(extractDriveFolderId('https://drive.google.com/drive/folders/1ABC_123xyz-Folder') === '1ABC_123xyz-Folder', 'Folder ID from URL');
  assert(extractDriveFileId('https://drive.google.com/file/d/1ABC_123xyz-File/view') === '1ABC_123xyz-File', 'Drive File ID from URL');
  assert(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'YouTube ID from watch');
  assert(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'YouTube ID from youtu.be');
  assert(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ', 'YouTube ID from shorts');
  assert(extractYouTubeId('invalid-url') === null, 'Invalid YouTube URL returns null');

  console.log('--- TEST RESULTS: ' + passed + ' passed, ' + failed + ' failed ---');
}
