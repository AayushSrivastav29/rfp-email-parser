import {
  filterAndStoreEmails,
  exportFilteredEmailsToCSV,
} from "../repositories/filterEmailRepository.js";
import { saveLog } from "../repositories/logsRepository.js";

// Schedule the filter and export job to run every day at midnight
export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }
  const startTime = Date.now();
  try {
    const filtered = await filterAndStoreEmails();
    console.log("[Cron] Filtered emails processed.");
    const exported = await exportFilteredEmailsToCSV();
    console.log("[Cron] Filtered emails processed and exported to CSV.");

    //  Save success/skipped log
    await saveLog({
      status:
        filtered && exported
          ? "success"
          : filtered
            ? "skipped"
            : exported
              ? "skipped"
              : "error",
      subject: "Filtered & exported emails",
      reason:
        filtered && exported
          ? "Successfully filtered and exported emails"
          : filtered
            ? "filtered emails"
            : exported
              ? "exported emails"
              : "none",
    });
    const elapsed = Date.now() - startTime;
    console.log(`[Webhook] Done in ${elapsed}ms`);

    return res.status(200).json({
      success: true,
      filtered,
      exported,
      elapsed: `${elapsed}ms`,
    });
  } catch (error) {
    console.error(
      "[Webhook] Error filtering & exporting email:",
      error.message,
    );
    // Attempt to log the error to db
    await saveLog({
      status: "error",
      error_message: error.message || "Internal Server Error",
    });
    return res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
}
