import RFPEmail from "../models/emailModel.js";

/**
 * Save a single parsed tender document.
 */
export async function saveEmail(parsedEmail) {
  const doc = new RFPEmail({ ...parsedEmail });
  await doc.save();
  console.log(
    `[EmailRepository] Saved tender "${parsedEmail.tenderTitle ?? parsedEmail.subject}" | id=${doc._id}`,
  );
  return doc;
}

/**
 * Save multiple tender documents from the same email in one operation.
 * Uses insertMany with ordered:false so a duplicate-key error on one
 * document doesn't block the rest.
 */

export async function saveEmails(parsedTenders) {
  // exclude any tenders that doesnt have a tenderTitle, issuingAuthority, deadline, description
  parsedTenders = parsedTenders.filter((t) => t.tenderTitle && t.issuingAuthority && t.deadline && t.description);

  if (!Array.isArray(parsedTenders) || parsedTenders.length === 0) {
    console.warn("[EmailRepository] saveEmails called with empty array.");
    return [];
  }

  if (parsedTenders.length === 1) {
    // Single tender — use the simpler save() path for better error messages
    const saved = await saveEmail(parsedTenders[0]);
    return [saved];
  }

  // Multiple tenders — bulk insert
  const docs = parsedTenders.map((t) => new RFPEmail(t));
  const result = await RFPEmail.insertMany(docs, { ordered: false });

  console.log(
    `[EmailRepository] Bulk saved ${result.length}/${parsedTenders.length} tender(s) ` +
      `from subject="${parsedTenders[0].subject}"`,
  );
  return result;
}

/**
 * Find all emails, newest first.
 */
export async function findAllEmails(limit = 100) {
  return RFPEmail.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}
