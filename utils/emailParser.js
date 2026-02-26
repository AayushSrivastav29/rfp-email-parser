import { extractAttachmentContent } from "./pdfParser.js";

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
    content: a.Content || "", //postmark sends content in base64
  }));

  //extract attachments content and save it to a file
  attachments.forEach((attachment) => {
    extractAttachmentContent(attachment);
  });

  //extract links from body
  const extractedLinks = extractLinks(payload.HtmlBody || payload.TextBody);

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
    extractedLinks,
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

/**
 * Extract all absolute URLs from HTML or text.
 */
function extractLinks(body) {
  if (!body) return [];

  const links = [];

  // Regex for absolute URLs
  const urlRegex = /(https?:\/\/[^\s"'<>()]+|mailto:[^\s"'<>()]+)/g;

  let match;
  while ((match = urlRegex.exec(body)) !== null) {
    links.push({ url: match[0] });
  }

  return links;
}
