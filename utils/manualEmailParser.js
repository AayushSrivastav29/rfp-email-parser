/**
 * Parse common RFP fields from an HTML email body (table-based).
 * Also extracts links and deadline.
 *
 * Returns {
 *   tenderTitle,
 *   issuingAuthority,
 *   contractValue,
 *   description,
 *   extractedLinks: [{ url }],
 *   deadline: { rawDeadline, parsedDate },
 *   rawMatches
 * }
 */

export function manualParseRfpFromHtml(html) {
  if (!html) return null;

  // helpers
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
        // preserve simple breaks as line breaks
        .replace(/<br\s*\/?>/gi, "\n")
        // remove remaining tags
        .replace(/<\/?[^>]+(>|$)/g, ""),
    ).trim();

  // patterns
  const patterns = {
    tenderTitle:
      /<td[^>]*>\s*Solicitation\s+Title\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    issuingAuthority:
      /<td[^>]*>\s*(?:Buying\s+Organization|Buying\s+Org(?:anization)?|Issuing\s+Authority|Issued\s+By)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    description:
      /<td[^>]*>\s*Description\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    contractTable:
      /<td[^>]*>\s*(?:Contract\s+Value|Estimated\s+Value|Total\s+Contract\s+Value|Contract\s+Amount|Estimated\s+Budget)\s*:?\s*<\/td>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/i,
    contractInline:
      /(?:Contract\s+Value|Estimated\s+Value|Total\s+Contract\s+Value|Contract\s+Amount|Estimated\s+Budget)[:\-\s]*([A-Za-z$€£]{0,3}\s*[0-9\.,]+(?:\s*(?:USD|EUR|GBP))?)/i,
  };

  // result skeleton
  const result = {
    tenderTitle: null,
    issuingAuthority: null,
    contractValue: null,
    description: null,
    extractedLinks: [],
    deadline: null, 
    rawMatches: {},
  };

  // extract table-based fields
  const mTitle = html.match(patterns.tenderTitle);
  if (mTitle && mTitle[1]) {
    result.tenderTitle = stripTags(mTitle[1]);
    result.rawMatches.tenderTitle = mTitle[1];
  }

  const mIssuer = html.match(patterns.issuingAuthority);
  if (mIssuer && mIssuer[1]) {
    result.issuingAuthority = stripTags(mIssuer[1]);
    result.rawMatches.issuingAuthority = mIssuer[1];
  }

  const mDesc = html.match(patterns.description);
  if (mDesc && mDesc[1]) {
    result.description = stripTags(mDesc[1]);
    result.rawMatches.description = mDesc[1];
  }

  // contract value: prefer table label; fallback to inline amount or plain text money-like token
  const mContractTbl = html.match(patterns.contractTable);
  if (mContractTbl && mContractTbl[1]) {
    result.contractValue = stripTags(mContractTbl[1]);
    result.rawMatches.contractTable = mContractTbl[1];
  } else {
    const mInline = html.match(patterns.contractInline);
    if (mInline && mInline[1]) {
      result.contractValue = mInline[1].trim();
      result.rawMatches.contractInline = mInline[1];
    } else {
      const plain = stripTags(html);
      const money = plain.match(
        "\b(?:USD|EUR|GBP|INR|AUD|CAD|SGD|AED|JPY|CNY|\$|€|£|₹)\s?\d+(?:[,\.\s]\d{3})*(?:\.\d{2})?\b",
      );
      if (money) result.contractValue = money[1].trim();
    }
  }

  // extract links and deadline (run on both the HTML and plain text to be safe)
  result.extractedLinks = extractLinks(html);
  // if links empty, try plain text
  if (!result.extractedLinks.length) {
    result.extractedLinks = extractLinks(stripTags(html));
  }

  result.deadline = extractDeadline(html) || extractDeadline(stripTags(html));

  return result;
}

/**
 * Extract all absolute URLs from HTML or text.
 * - prioritizes href/src attributes (covers anchor tags and images)
 * - falls back to scanning for https?:// tokens
 * - filters out image/tracking URLs and duplicates
 */
export function extractLinks(body) {
  if (!body) return [];

  // helpers
  const seen = new Set();
  const urls = [];

  const pushIfValid = (url) => {
    if (!url) return;
    const lower = url.toLowerCase();

    // Common patterns to exclude (images, tracking pixels, cdn assets)
    const INVALID_PATTERNS = [
      "image",
      "img",
      "logo",
      "banner",
      "pixel",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      "cdn.",
      "/wf/open", // sendgrid open-tracking pixel paths
      "/wf/clk", // some tracking
      "tracking",
      "utm_",
    ];

    if (INVALID_PATTERNS.some((p) => lower.includes(p))) return;

    if (seen.has(url)) return;
    seen.add(url);
    urls.push({ url });
  };

  // 1) Capture href="https://..." and src="https://..."
  const attrRegex = /(?:href|src)\s*=\s*["'](https?:\/\/[^"'\s>]+)["']/gi;
  let m;
  while ((m = attrRegex.exec(body)) !== null) {
    pushIfValid(m[1]);
  }

  // 2) Capture standalone https://... occurrences
  const urlRegex = /https?:\/\/[^\s"'<>()]+/gi;
  while ((m = urlRegex.exec(body)) !== null) {
    pushIfValid(m[0]);
  }

  return urls;
}

/**
 * Extract deadline from RFP / Tender email body.
 * Runs regex against html and plain text and returns:
 * { rawDeadline, parsedDate } or null if not found.
 *
 * parsedDate is a JS Date object if parsing with Date() succeeded; otherwise null.
 * For best real-world results, use `chrono-node` to parse natural language dates.
 */
export function extractDeadline(emailBody) {
  if (!emailBody) return null;

  const combinedDeadlineRegex = new RegExp(
    "\\b(?:deadline|due date|closing date|submission deadline|submit by|closing on|last date(?: for submission)?)" +
      "[\\s:–—-]*" +
      "(" +
      // ISO format
      "[0-9]{4}-[0-9]{2}-[0-9]{2}(?:[T\\s][0-9]{2}:[0-9]{2}(?::[0-9]{2})?(?:Z|[+\\-][0-9]{2}:?[0-9]{2})?)?" +
      "|" +
      // 15 January 2026 / 15 January, 2026
      "\\d{1,2}(?:st|nd|rd|th)?\\s+" +
      "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|" +
      "Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
      "\\s*,?\\s*\\d{4}" +
      "|" +
      // January 15, 2026
      "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|" +
      "Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)" +
      "\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s*\\d{4}" +
      "|" +
      // Numeric formats
      "\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{2,4}" +
      ")" +
      // Optional time
      "(?:[\\s,]*(?:at|@)?\\s*\\d{1,2}(?::\\d{2})?" +
      "(?:\\s*[APMapm]{2})?" +
      "(?:\\s*[A-Z]{2,5})?)?",
    "i",
  );

  const match = emailBody.match(combinedDeadlineRegex);
  if (!match || !match[1]) return null;

  const rawDeadline = match[1].trim();

  return  rawDeadline;
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Read the json-body.json file
// const jsonPath = path.join(__dirname, "../json-body.json");
// const jsonData = await fs.readFile(jsonPath, "utf-8");

// const emailPayload = JSON.parse(jsonData);

// const result = parseRfpFromHtml(emailPayload.HtmlBody);
// fs.writeFile(
//   path.join(__dirname, "../test_html_output.json"),
//   JSON.stringify(result, null, 2),
//   "utf-8",
//   (err) => {
//     if (err) console.error(err);
//     else console.log("Output written to test_output.json");
//   },
// );
