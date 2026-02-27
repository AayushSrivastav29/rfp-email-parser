import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Sheet headers — must match the order of rowValues below
const HEADERS = [
  "From Email",
  "Tender Title",
  "Issuing Authority",
  "Deadline",
  "Contract Value",
  "Description",
  "Extracted Links",
  "Date Received",
  "Relevance Score",
  "Classification",
];
// // const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
// const privateKey = Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64');
const credentials = JSON.parse(
  process.env.GOOGLE_CREDS
);

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return auth.getClient();
}

/**
 * Ensures the first row of the sheet has headers.
 * If the sheet is empty, writes headers first.
 */
async function ensureHeaders(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  const firstRow = response.data.values?.[0];
  if (!firstRow || firstRow.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
    console.log("[Sheets] Headers written.");
  }
}

/**
 * Appends an array of RFP email documents to Google Sheets.
 * @param {Array} emails - Array of RFPEmail mongoose documents (lean)
 */
export async function appendEmailsToSheet(emails) {
  if (!emails || emails.length === 0) return 0;

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || "filteredRfps";

  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  await ensureHeaders(sheets, spreadsheetId, sheetName);

  // Transform each email document into a flat row
  const rows = emails.map((email) => {
    const links = (email.extractedLinks || [])
      .map((l) => l.url || l)
      .filter(Boolean)
      .join(", ");

    return [
      email.fromEmail || "",
      email.tenderTitle || "",
      email.issuingAuthority || "",
      email.deadline || "",
      email.contractValue || "",
      email.description || "",
      links,
      email.date ? new Date(email.date).toISOString() : "",
      email.relevanceScore || "",
      email.classification || "",
    ];
  });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });

  const updatedRows = response.data.updates?.updatedRows || rows.length;
  console.log(`[Sheets] Appended ${updatedRows} rows to Google Sheet.`);
  return updatedRows;
}
