import RFPEmail from "../models/emailModel.js";
import fs from "fs";
import path from "path";
import { Parser } from "@json2csv/plainjs";
import { aifilterEmails } from "../utils/aiEmailParser.js";
import { TARGET_NAICS_CODES, KEYWORDS } from "../config/constants.js";
import { appendEmailsToSheet } from "../services/googleSheetsService.js";

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const FILTER_REGEX = [
  ...TARGET_NAICS_CODES.map(escapeRegex),
  ...KEYWORDS.map(escapeRegex),
].join("|");

/**
 * Filters emails from RFPEmail using a regex on subject or body,
 * stores them in FilteredRFPEmail if not already present.
 */
export async function filterAndStoreEmails() {
  // Find emails matching regex and not already filtered
  let emails = null;
  emails = await RFPEmail.find({ isFiltered: false }).lean();

  let results = null ;
  results = await aifilterEmails(emails);
  console.log("results", results);
  if (!results) {
    results = await RFPEmail.find({
      $or: [
        { subject: { $regex: FILTER_REGEX, $options: "i" } },
        { tenderTitle: { $regex: FILTER_REGEX, $options: "i" } },
        { description: { $regex: FILTER_REGEX, $options: "i" } },
      ],
      isFiltered: false,
    }).lean();
    console.log("results manual", results);
  }
  for (const email of results) {
    // Mark as filtered
    await RFPEmail.updateOne(
      { _id: email._id },
      { $set: { isFiltered: true } },
    );
  }
  return results;
}

/**
 * Exports all filtered emails to a CSV file.
 */
export async function exportFilteredEmailsToCSV() {
  const filteredEmails = await RFPEmail.find({ isFiltered: true }).lean();
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
  const filePath = path.join(exportDir, `filteredRfps.csv`);
  fs.writeFileSync(filePath, csv);
  return filePath;
}


export async function exportFilteredEmailsHandler() {
  try {
    // Step 1: Filter + mark emails
    const newlyFiltered = await filterAndStoreEmails();

    // Step 2: Append to Google Sheet
    let sheetRowsAdded = 0;
    if (newlyFiltered.length > 0) {
      sheetRowsAdded = await appendEmailsToSheet(newlyFiltered);
    }

    console.log("newlyFiltered", newlyFiltered.length);
    console.log("sheetRowsAdded", sheetRowsAdded);
    return {
      success: true,
      filteredCount: newlyFiltered.length,
      sheetRowsAdded,
    };
  } catch (err) {
    console.error("[exportFilteredEmailsHandler] Error:", err);
    return { success: false, error: err.message };
  }
}


// Express route handler for manual export
export async function exportFilteredEmailsToExportsHandler() {
  try {
    const filteredCount = await filterAndStoreEmails();
    const filePath = await exportFilteredEmailsToCSV();
    return { success: true, filteredCount, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
