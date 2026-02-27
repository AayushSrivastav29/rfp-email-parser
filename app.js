import express from "express";
import inboundEmailHandler from "./api/inbound-email.js";
import { connectDB } from "./config/db.js";
import { findAllEmails } from "./repositories/emailRepository.js";
import { exportFilteredEmailsHandler } from "./repositories/filterEmailRepository.js";
import cron from "cron";

const app = express();

// Middleware
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

//  Request logger (dev only)
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

//  Webhook Route
// This mirrors the Vercel serverless function path so local dev works identically
app.post("/api/inbound-email", inboundEmailHandler);
//cron job schedule
// const cronJob = new cron.CronJob(
//   "*/1 * * * *", // Run at every 1 minute
//   async () => {
//     try {
//       console.log("cron job started");
//       await connectDB();
//       await exportFilteredEmailsHandler();
//       console.log("cron job completed");
//     } catch (err) {
//       console.error("Error exporting emails to sheets:", err);
//     }
//   }
// );
// cronJob.start();

app.post("/api/export-to-sheets", exportFilteredEmailsHandler);

//  Read-only API Routes
/** GET /api/emails — Return all emails (paginated) */
app.get("/api/emails", async (req, res) => {
  try {
    await connectDB();
    const limit = parseInt(req.query.limit) || 100;
    const emails = await findAllEmails(limit);
    res.json({ success: true, count: emails.length, data: emails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/** GET /health — Quick health check */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
