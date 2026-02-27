import RFPEmail from "../models/emailModel.js";

/**
 * Save a parsed email document.
 */
export async function saveEmail(parsedEmail) {
  const doc = new RFPEmail({
    ...parsedEmail,
  });

  await doc.save();
  console.log(
    `[EmailRepository] Saved email "${parsedEmail.subject}" | id=${doc._id}`,
  );
  return doc;
}

/**
 * Find all emails, newest first.
 */
export async function findAllEmails(limit = 100) {
  return RFPEmail.find({}).sort({ createdAt: -1 }).limit(limit).lean();
}
