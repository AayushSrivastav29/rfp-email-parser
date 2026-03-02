import { connectDB } from "../config/db.js";
import { parseInboundEmail } from "../utils/emailParser.js";
import { saveEmails } from "../repositories/emailRepository.js";
import { saveLog } from "../repositories/logsRepository.js";

/**
 * Flow:
 *   Postmark → POST /api/inbound-email → parse → save each tender → MongoDB
 * A single email payload may contain multiple tenders.
 * parseInboundEmail() always returns an Array; saveEmails() persists them all.
 */

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  const startTime = Date.now();
  console.log("[Webhook] Inbound email received from Postmark.");

  try {
    // 1. Connect to DB
    await connectDB();

    // 2. Validate payload
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      console.log("[Webhook] Empty or invalid payload received.");
      return res.status(400).json({ error: "Invalid payload." });
    }

    // 3. Parse → always returns Array<tender>
    const tenders = await parseInboundEmail(payload);
    console.log(
      `[Webhook] Parsed ${tenders.length} tender(s) | from=${tenders[0]?.fromEmail} | subject="${tenders[0]?.subject}"`,
    );

    // 4. Bulk-save all tenders
    const savedDocs = await saveEmails(tenders);

    const elapsed = Date.now() - startTime;
    console.log(
      `[Webhook] Done in ${elapsed}ms | saved ${savedDocs.length} tender(s)`,
    );

    // 5. Log success
    await saveLog({
      status: "success",
      sender: tenders[0]?.fromEmail,
      subject: tenders[0]?.subject,
      reason: savedDocs.length > 0 ? `${savedDocs.length} tender(s) saved successfully` : "No valid tenders found",
    });

    // 6. Respond 200 to Postmark
    return res.status(200).json({
      success: true,
      messageId: tenders[0]?.messageId,
      tendersFound: tenders.length,
      savedCount: savedDocs.length,
      dbIds: savedDocs.map((d) => d._id),
      elapsed: `${elapsed}ms`,
    });
  } catch (error) {
    console.error("[Webhook] Error processing inbound email:", error);

    // Attempt to log the error to DB
    try {
      if (req.body) {
        await saveLog({
          status: "error",
          sender: req.body.FromFull?.Email || req.body.From || "unknown",
          subject: req.body.Subject || "unknown",
          error_message: error.message || "Internal Server Error",
        });
      }
    } catch (e) {
      console.error("[Webhook] Failed to save error log:", e);
    }

    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
}
