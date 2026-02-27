import { aiEmailParser } from "./aiEmailParser.js";
import { manualParseRfpFromHtml } from "./manualEmailParser.js";

/**
 * Parses a raw Postmark inbound email webhook payload into a
 * normalized, database-ready object.
 */
export async function parseInboundEmail(payload) {
  const fromEmail = payload.FromFull?.Email || payload.From || "";
  const subject = payload.Subject || "(No Subject)";

  // step 1 : ai parsing
  let results = null;
  let parsingMethod = "ai";
  results = await aiEmailParser(payload);
  console.log("ai email parsing results", results);
  //step 2: fallback manual parsing
  if (!results || results.length === 0 || results === null) {
    results = manualParseRfpFromHtml(payload.HtmlBody);
    console.log("manual email parsing results", results);
    parsingMethod = "manual";
  }
  const rawLinks = Array.isArray(results.extractedLinks)
    ? results.extractedLinks
    : results[0]?.extractedLinks || [];

  const extractedLinks = rawLinks.map((link) =>
    typeof link === "string" ? { url: link } : link,
  );

  return {
    messageId: payload.MessageID || null,
    fromEmail,
    subject,
    tenderTitle: results.tenderTitle || results[0].tenderTitle,
    issuingAuthority: results.issuingAuthority || results[0].issuingAuthority,
    deadline: results.deadline || results[0].deadline,
    contractValue: results.contractValue || results[0].contractValue,
    description: results.description || results[0].description,
    date: payload.Date ? new Date(payload.Date) : new Date(),
    extractedLinks,
    rawPayload: payload, // Store original for debugging / re-processing
    parsingMethod,
  };
}
