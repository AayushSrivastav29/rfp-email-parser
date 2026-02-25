import Log from "../models/logsModel.js";

/**
 * Save an email processing log
 * @param {Object} logData
 * @param {String} logData.status - 'success', 'skipped', or 'error'
 * @param {String} [logData.sender]
 * @param {String} [logData.subject]
 * @param {String} [logData.reason]
 * @param {String} [logData.error_message]
 */
export async function saveLog(logData) {
  try {
    const log = new Log(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error("[LogsRepository] Error saving log:", error.message);
  }
}
