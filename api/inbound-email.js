import { connectDB } from "../config/db.js";
import { parseInboundEmail } from "../utils/emailParser.js";
import { detectTenderEmail } from "../utils/tenderDetector.js";
import { saveEmail } from "../repositories/emailRepository.js";
import { saveLog } from "../repositories/logsRepository.js";

/**
 * Flow:
 *   Postmark → POST /api/inbound-email → parse → detect → save to MongoDB
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

    // 2. Parse Postmark Payload
    const payload = req.body;

    if (!payload || typeof payload !== "object") {
      console.warn("[Webhook] Empty or invalid payload received.");
      return res.status(400).json({ error: "Invalid payload." });
    }

    const parsedEmail = parseInboundEmail(payload);
    console.log(
      `[Webhook] Parsed email | from=${parsedEmail.fromEmail} | subject="${parsedEmail.subject}"`,
    );

    // 3. Tender Detection
    const detection = detectTenderEmail(parsedEmail);
    console.log(
      `[Webhook] Detection result | isTender=${detection.isTender} | matchedBy=${detection.matchedBy} | value=${detection.matchedValue}`,
    );

    //  4. Save to MongoDB
    const saved = await saveEmail(parsedEmail, detection);

    const elapsed = Date.now() - startTime;
    console.log(`[Webhook] Done in ${elapsed}ms | docId=${saved._id}`);

    // 5. Save success/skipped log
    await saveLog({
      status: detection.isTender ? "success" : "skipped",
      sender: parsedEmail.fromEmail,
      subject: parsedEmail.subject,
      reason: detection.isTender ? "Tender matched" : "Not a tender",
    });

    // 6. Respond 200 to Postmark
    // Postmark expects a 2xx within 30s or it will retry
    return res.status(200).json({
      success: true,
      messageId: parsedEmail.messageId,
      isTender: detection.isTender,
      detectedBy: detection.matchedBy,
      detectedValue: detection.matchedValue,
      dbId: saved._id,
      elapsed: `${elapsed}ms`,
    });
  } catch (error) {
    console.error("[Webhook] Error processing inbound email:", error);

    // Attempt to log the error to db
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
