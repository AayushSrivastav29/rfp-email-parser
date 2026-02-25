/**
 * Parses a raw Postmark inbound email webhook payload into a
 * normalized, database-ready object.
 * @param {Object} payload - The raw JSON body from Postmark webhook
 * @returns {Object} Parsed email object
 */
export function parseInboundEmail(payload) {
  // Sender info
  const fromEmail = payload.FromFull?.Email || payload.From || "";
  const fromName = payload.FromFull?.Name || "";
  const fromDomain = extractDomain(fromEmail);

  // Attachments
  const attachments = (payload.Attachments || []).map((a) => ({
    name: a.Name || "",
    contentType: a.ContentType || "",
  }));


  return { 
    messageId: payload.MessageID || null,
    subject: payload.Subject || "(No Subject)",
    fromEmail,
    fromName,
    fromDomain,
    date: payload.Date ? new Date(payload.Date) : new Date(),
    textBody: payload.TextBody || null,
    htmlBody: payload.HtmlBody || null,
    attachments,
    rawPayload: payload, // Store original for debugging / re-processing
  };
}

/**
 * Extracts domain from an email address string.
 * e.g. "rfp@sam.gov" → "sam.gov"
 */
function extractDomain(email) {
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : "";
}
