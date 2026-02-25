import express from "express";
import inboundEmailHandler from "./api/inbound-email.js";
import { connectDB } from "./config/db.js";
import {
  findTenderEmails,
  findAllEmails,
} from "./repositories/emailRepository.js";

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" })); // Postmark payloads can be large (attachments)
app.use(express.urlencoded({ extended: true }));

//  Request logger (dev only)
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

//  Webhook Route
// This mirrors the Vercel serverless function path so local dev works identically
app.post("/api/inbound-email", inboundEmailHandler);

//  Read-only API Routes

/** GET /api/emails/tenders — Return all detected tender emails */
app.get("/api/emails/tenders", async (req, res) => {
  try {
    await connectDB();
    const limit = parseInt(req.query.limit) || 50;
    const emails = await findTenderEmails(limit);
    res.json({ success: true, count: emails.length, data: emails });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
