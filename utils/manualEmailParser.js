export function manualParseRfpFromHtml(html) {
  if (!html) return [];

  const decodeEntities = (s = "") =>
    s
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();

  const stripTags = (s = "") =>
    decodeEntities(
      s
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?[^>]+(>|$)/g, "")
    ).trim();

  const tenderBlocks = splitIntoTenderBlocks(html);
  console.log("tenderBlocks", tenderBlocks);

  const results = tenderBlocks
    .map((block) => parseSingleTenderBlock(block, stripTags))
    .filter((t) => t.tenderTitle || t.description);
    console.log("results", results);

  return results;
}

// ─── Split HTML into individual tender blocks ─────────────────────────────────

function splitIntoTenderBlocks(html) {

  // ── Strategy A: Cheerio-based <table> splitting ───────────────────────────
  // Each tender lives in its own <table>. We find all top-level tables
  // that contain a known tender label field, and treat each as one block.
  // This is the most reliable approach for BidNet, SAM.gov style emails.

  // Find all <table>...</table> blocks in order
  const tableRegex = /<table[\s\S]*?<\/table>/gi;
  const tables = [];
  let m;
  while ((m = tableRegex.exec(html)) !== null) {
    tables.push(m[0]);
  }

  // A tender table must contain at least one known label
  const TENDER_LABEL = /Solicitation\s+(?:Title|Number)|Tender\s+Title|Project\s+Title|Bid\s+Title|Buying\s+Org|Issuing\s+Authority|Closing\s+date|Description/i;

  const tenderTables = tables.filter((t) => TENDER_LABEL.test(t));

  if (tenderTables.length > 0) {
    // Group consecutive tender-related tables into one block per tender.
    // A new tender starts when we see a "Title" label table.
    const TITLE_LABEL = /Solicitation\s+Title|Tender\s+Title|Project\s+Title|Bid\s+Title/i;

    const groups = [];
    let currentGroup = [];

    for (const table of tenderTables) {
      if (TITLE_LABEL.test(table) && currentGroup.length > 0) {
        // New title encountered → save previous group, start new
        groups.push(currentGroup.join("\n"));
        currentGroup = [table];
      } else {
        currentGroup.push(table);
      }
    }
    // Push the last group
    if (currentGroup.length > 0) {
      groups.push(currentGroup.join("\n"));
    }

    if (groups.length > 0) return groups;
  }

  // ── Strategy B: Split on <hr> or <h2>/<h3> separators ────────────────────
  const separatorPattern = /(?=<hr[^>]*\/?>|<h[23][^>]*>)/gi;
  const hrSplit = html.split(separatorPattern).filter((b) => b.trim());
  if (hrSplit.length > 1) {
    return hrSplit;
  }

  // ── Strategy C: Single tender fallback ───────────────────────────────────
  return [html];
}

// ─── Parse one tender block ───────────────────────────────────────────────────

function parseSingleTenderBlock(html, stripTags) {
  const patterns = {
    solicitationNumber:
      /<td[^>]*>\s*Solicitation\s+Number\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    tenderTitle:
      /<td[^>]*>\s*(?:Solicitation\s+Title|Tender\s+Title|Project\s+Title|Bid\s+Title)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    issuingAuthority:
      /<td[^>]*>\s*(?:Buying\s+Organization|Buying\s+Org(?:anization)?|Issuing\s+Authority|Issued\s+By|Agency)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    description:
      /<td[^>]*>\s*Description\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    deadline:
      /<td[^>]*>\s*(?:Closing\s+date|Deadline|Due\s+Date|Submission\s+Deadline|Closing\s+Date)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    contractTable:
      /<td[^>]*>\s*(?:Contract\s+Value|Estimated\s+Value|Total\s+Contract\s+Value|Contract\s+Amount|Estimated\s+Budget)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    contractInline:
      /(?:Contract\s+Value|Estimated\s+Value|Total\s+Contract\s+Value|Contract\s+Amount|Estimated\s+Budget)[:\-\s]*([A-Za-z$€£]{0,3}\s*[0-9\.,]+(?:\s*(?:USD|EUR|GBP))?)/i,
  };

  const result = {
    solicitationNumber: null,
    tenderTitle: null,
    issuingAuthority: null,
    contractValue: null,
    description: null,
    extractedLinks: [],
    deadline: null,
    rawMatches: {},
  };

  const mNum = html.match(patterns.solicitationNumber);
  if (mNum?.[1]) {
    result.solicitationNumber = stripTags(mNum[1]);
    result.rawMatches.solicitationNumber = mNum[1];
  }

  const mTitle = html.match(patterns.tenderTitle);
  if (mTitle?.[1]) {
    result.tenderTitle = stripTags(mTitle[1]);
    result.rawMatches.tenderTitle = mTitle[1];
  }

  const mIssuer = html.match(patterns.issuingAuthority);
  if (mIssuer?.[1]) {
    result.issuingAuthority = stripTags(mIssuer[1]);
    result.rawMatches.issuingAuthority = mIssuer[1];
  }

  const mDesc = html.match(patterns.description);
  if (mDesc?.[1]) {
    result.description = stripTags(mDesc[1]);
    result.rawMatches.description = mDesc[1];
  }

  // ── Deadline: try table label first, then regex scan ─────────────────────
  const mDeadline = html.match(patterns.deadline);
  if (mDeadline?.[1]) {
    result.deadline = stripTags(mDeadline[1]);
    result.rawMatches.deadline = mDeadline[1];
  } else {
    result.deadline = extractDeadline(html) || extractDeadline(stripTags(html));
  }

  // ── Contract value ────────────────────────────────────────────────────────
  const mContractTbl = html.match(patterns.contractTable);
  if (mContractTbl?.[1]) {
    result.contractValue = stripTags(mContractTbl[1]);
    result.rawMatches.contractTable = mContractTbl[1];
  } else {
    const mInline = html.match(patterns.contractInline);
    if (mInline?.[1]) {
      result.contractValue = mInline[1].trim();
      result.rawMatches.contractInline = mInline[1];
    } else {
      const plain = stripTags(html);
      const money = plain.match(
        /\b(?:USD|EUR|GBP|INR|AUD|CAD|SGD|AED|JPY|CNY|\$|€|£|₹)\s?\d+(?:[,.\s]\d{3})*(?:\.\d{2})?\b/
      );
      if (money) result.contractValue = money[0].trim();
    }
  }

  // ── Links ─────────────────────────────────────────────────────────────────
  result.extractedLinks = extractLinks(html);
  if (!result.extractedLinks.length) {
    result.extractedLinks = extractLinks(stripTags(html));
  }

  return result;
}

// ─── extractLinks ─────────────────────────────────────────────────────────────

export function extractLinks(body) {
  if (!body) return [];

  const seen = new Set();
  const urls = [];

  const INVALID_PATTERNS = [
    "image", "img", "logo", "banner", "pixel",
    ".png", ".jpg", ".jpeg", ".gif", ".svg",
    "cdn.", "/wf/open", "/wf/clk", "tracking", "utm_",
    "unsubscribe", "email-preferences", "account-settings",
    "support@", "mailto:",
  ];

  // Damaged URL: repeating encoded segments like -2F4o-2F3o-2F4o (5+ times)
  const DAMAGED_URL_PATTERN = /(-2F[a-zA-Z0-9]{1,4}){5,}/;
  const MAX_URL_LENGTH = 2000;

  const pushIfValid = (url) => {
    if (!url) return;
    const lower = url.toLowerCase();
    if (url.length > MAX_URL_LENGTH) return;              // ← too long
    if (DAMAGED_URL_PATTERN.test(url)) return;            // ← corrupted
    if (INVALID_PATTERNS.some((p) => lower.includes(p))) return;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push({ url });
  };

  const attrRegex = /(?:href|src)\s*=\s*["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m;
  while ((m = attrRegex.exec(body)) !== null) pushIfValid(m[1]);

  const urlRegex = /https?:\/\/[^\s"'<>()]+/gi;
  while ((m = urlRegex.exec(body)) !== null) pushIfValid(m[0]);

  return urls;
}

// ─── extractDeadline ─────────────────────────────────────────────────────────

export function extractDeadline(emailBody) {
  if (!emailBody) return null;

  const combinedDeadlineRegex = new RegExp(
    "\\b(?:deadline|due date|closing date|submission deadline|submit by|closing on|last date(?: for submission)?)" +
      "[\\s:–—-]*" +
      "(" +
      "[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[T\\s][0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+\\-][0-9]{2}:?[0-9]{2})?)?" +
      "|" +
      "\\d{1,2}(?:st|nd|rd|th)?\\s+" +
      "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|" +
      "Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
      "\\s*,?\\s*\\d{4}" +
      "|" +
      "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|" +
      "Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
      "\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s*\\d{4}" +
      "|" +
      "\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}" +
      ")" +
      "(?:[\\s,]*(?:at|@)?\\s*\\d{1,2}(?::\\d{2})?" +
      "(?:\\s*[APMapm]{2})?" +
      "(?:\\s*[A-Z]{2,5})?)?",
    "i"
  );

  const match = emailBody.match(combinedDeadlineRegex);
  if (!match?.[1]) return null;
  return match[1].trim();
}
