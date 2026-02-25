/**
 * Detects whether an inbound email originated from a known tender/RFP website.
 *
 * Detection strategy (layered — any match = tender email):
 *  1. Sender domain matches a known tender domain list
 *  2. Sender email matches a known sender pattern (regex)
 *  3. Subject line contains tender-related keywords
 *
 */

const TENDER_DOMAINS = new Set([
  // US Federal
  "sam.gov",
  "grants.gov",
  "beta.sam.gov",
  "fpds.gov",
  "usaspending.gov",
  // State / Local
  "bidnet.com",
  "bidnetdirect.com",
  "publicpurchase.com",
  "periscope.com",
  "bonfirehub.com",
  "ionwave.net",
  "negometrix.com",
  // Commercial Platforms
  "rfpmart.com",
  "tendersinfo.com",
  "tendersonline.in",
  "procurenow.com",
  "govwin.com",
  "deltek.com",
  "govspend.com",
  "rfpdb.com",
  "findrfp.com",
  "bidsync.com",
  "demandstar.com",
  "onvia.com",
  "ebidboard.com",
  // UK / International
  "find-tender.service.gov.uk",
  "ted.europa.eu",
  "contracts.gov.au",
  "merx.com",
]);

const TENDER_EMAIL_PATTERNS = [
  /rfp@/i,
  /rfq@/i,
  /bid@/i,
  /bids@/i,
  /tender@/i,
  /procurement@/i,
  /solicitation@/i,
  /noreply.*sam\.gov/i,
  /notifications?@grants\.gov/i,
  /alerts?@bidnet/i,
];

const TENDER_SUBJECT_KEYWORDS = [
  "request for proposal",
  "request for quotation",
  "invitation to bid",
  "solicitation",
  "rfp#",
  "rfq#",
  "itb#",
  "bid opportunity",
  "procurement notice",
  "contract award",
  "pre-bid",
  "pre-proposal",
  "sources sought",
  "combined synopsis",
  "tender notice",
  "tender alert",
  "new opportunity",
  "bid alert",
];

/**
 * @param {Object} parsedEmail - Output of parseInboundEmail()
 * @returns {{ isTender: boolean, matchedBy: string|null, matchedValue: string|null }}
 */
export function detectTenderEmail(parsedEmail) {
  const { fromDomain, fromEmail, subject } = parsedEmail;

  // 1. Domain match
  if (fromDomain && TENDER_DOMAINS.has(fromDomain)) {
    return {
      isTender: true,
      matchedBy: "domain",
      matchedValue: fromDomain,
    };
  }

  // 2. Email pattern match
  for (const pattern of TENDER_EMAIL_PATTERNS) {
    if (pattern.test(fromEmail)) {
      return {
        isTender: true,
        matchedBy: "emailPattern",
        matchedValue: pattern.toString(),
      };
    }
  }

  // 3. Subject keyword match
  const subjectLower = (subject || "").toLowerCase();
  for (const keyword of TENDER_SUBJECT_KEYWORDS) {
    if (subjectLower.includes(keyword)) {
      return {
        isTender: true,
        matchedBy: "subject",
        matchedValue: keyword,
      };
    }
  }

  return { isTender: false, matchedBy: null, matchedValue: null };
}
