import RFPEmail from "../models/emailModel.js";
import FilteredRFPEmail from "../models/filteredEmailModel.js";
import fs from "fs";
import path from "path";
import { Parser } from "@json2csv/plainjs";
import { TARGET_NAICS_CODES, KEYWORDS } from "../config/constants.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const FILTER_REGEX = [
  ...TARGET_NAICS_CODES.map(escapeRegex),
  ...KEYWORDS.map(escapeRegex),
];
/**
 * Filters emails from RFPEmail using a regex on subject or body,
 * stores them in FilteredRFPEmail if not already present.
 */
export async function filterAndStoreEmails() {
  // Find emails matching regex and not already filtered
  const emails = await RFPEmail.find({
    $or: [
      { subject: { $regex: FILTER_REGEX } },
      { textBody: { $regex: FILTER_REGEX } },
      { htmlBody: { $regex: FILTER_REGEX } },
    ],
    isFiltered: { $ne: true },
  }).lean();

  for (const email of emails) {
    // Mark as filtered
    await RFPEmail.updateOne(
      { _id: email._id },
      { $set: { isFiltered: true } },
    );
  }
  return emails.length;
}

/**
 * Exports all filtered emails to a CSV file.
 */
export async function exportFilteredEmailsToCSV() {
  const filteredEmails = await FilteredRFPEmail.find({}).lean();
  if (!filteredEmails.length) return null;

  const fields = [
    "fromEmail",
    "tenderTitle",
    "issuingAuthority",
    "deadline",
    "contractValue",
    "description",
    "attachments.storageUrl",
    "extractedLinks",
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(filteredEmails);

  const exportDir = path.join("exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const filePath = path.join(exportDir, `filtered_emails_${Date.now()}.csv`);
  fs.writeFileSync(filePath, csv);
  return filePath;
}

// Schedule the filter and export job to run every day at midnight

// For cron scheduling only
// export function scheduleFilteredEmailExportCron() {
//   cron.schedule("0 0 * * *", async () => {
//     await filterAndStoreEmails();
//     await exportFilteredEmailsToCSV();
//     console.log("[Cron] Filtered emails processed and exported to CSV.");
//   });
// }

// Express route handler for manual export
export async function exportFilteredEmailsHandler(_req, res) {
  try {
    const filteredCount = await filterAndStoreEmails();
    const filePath = await exportFilteredEmailsToCSV();
    res.json({ success: true, filteredCount, filePath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
