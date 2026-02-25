import RFPEmail from "../models/emailModel.js";

/**
 * Save a parsed (and optionally tender-detected) email document.
 */
export async function saveEmail(parsedEmail, detection) {
  const doc = new RFPEmail({
    ...parsedEmail,
    // Remove raw base64 content before storing
    attachments: (parsedEmail.attachments || []).map(
      ({ content, ...rest }) => rest,
    ),
    isTender: detection.isTender,
    detectedBy: detection.matchedBy,
    detectedValue: detection.matchedValue,
  });

  await doc.save();
  console.log(
    `[EmailRepository] Saved email "${parsedEmail.subject}" | tender=${detection.isTender} | id=${doc._id}`,
  );
  return doc;
}

/**
 * Find all tender emails, newest first.
 */
export async function findTenderEmails(limit = 50) {
  return RFPEmail.find({ isTender: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Find all emails (tender + non-tender), newest first.
 */
export async function findAllEmails(limit = 100) {
  return RFPEmail.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}
