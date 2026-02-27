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
  results = await aiEmailParser(payload);

  //step 2: fallback manual parsing
  if (!results) {
    results = manualParseRfpFromHtml(payload.HtmlBody);
  }

  return {
    messageId: payload.MessageID || null,
    fromEmail,
    subject,
    tenderTitle : results.tenderTitle,
    issuingAuthority : results.issuingAuthority,
    deadline: results.deadline,
    contractValue: results.contractValue,
    description: results.description,
    date: payload.Date ? new Date(payload.Date) : new Date(),
    extractedLinks : results.extractedLinks,
    rawPayload: payload, // Store original for debugging / re-processing
  };
}
