import { aiEmailParser } from "./aiEmailParser.js";
import { manualParseRfpFromHtml } from "./manualEmailParser.js";

/**
 * Parses a raw Postmark inbound email webhook payload.
 *
 * Supports emails that contain MULTIPLE tenders in a single payload.
 * Always returns an Array of database-ready objects — one per tender found.
 * If no tenders are found, returns an array with a single "empty" record so
 * the email is still stored for debugging.
 */
export async function parseInboundEmail(payload) {
  const fromEmail = payload.FromFull?.Email || payload.From || "";
  const subject = payload.Subject || "(No Subject)";
  const date = payload.Date ? new Date(payload.Date) : new Date();
  const messageId = payload.MessageID || null;

  // Step 1: AI Parsing
  let parsingMethod = "ai";
  let tenders = null;

  // Step 2: Fallback – manual parsing
  if (!Array.isArray(tenders) || tenders.length === 0) {
    const manualResult = manualParseRfpFromHtml(payload.HtmlBody);
    console.log("[emailParser] Falling back to manual parsing", manualResult.length);

    if (manualResult) {
      // manualParseRfpFromHtml returns an array of objects
      tenders = [...manualResult];
    } else {
      tenders = [];
    }
    parsingMethod = "manual";
  }

  // Step 3: Build one DB document per tender
  if (tenders.length === 0) {
    // Nothing could be parsed — still save one raw record
    console.warn("[emailParser] No tenders extracted; saving raw record only.");
    return [
      {
        messageId,
        fromEmail,
        subject,
        date,
        tenderTitle: null,
        issuingAuthority: null,
        deadline: null,
        contractValue: null,
        description: null,
        extractedLinks: [],
        parsingMethod,
      },
    ];
  }

  return tenders.map((tender, idx) => {
    // Normalise extractedLinks → [{url}] format
    const rawLinks = Array.isArray(tender.extractedLinks)
      ? tender.extractedLinks
      : tender.extractedLinks
        ? [tender.extractedLinks]
        : [];

    const extractedLinks = rawLinks.map((link) =>
      typeof link === "string" ? { url: link } : link,
    );
    console.log(
      `[emailParser] Tender ${idx + 1}: "${tender.tenderTitle ?? "untitled"}"`,
    );

    return {
      messageId,
      fromEmail,
      subject,
      date,
      tenderTitle: tender.tenderTitle ?? null,
      issuingAuthority: tender.issuingAuthority ?? null,
      deadline: tender.deadline ?? null,
      contractValue: tender.contractValue ?? null,
      description: tender.description ?? null,
      extractedLinks,
      parsingMethod,
    };
  });
}
