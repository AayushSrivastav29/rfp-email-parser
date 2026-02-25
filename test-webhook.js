/**
 * test-webhook.js
 *
 * Simulates a Postmark inbound email webhook POST to your local server.
 * Run AFTER starting the dev server with: npm run dev
 *
 * Usage:
 *   node test-webhook.js                     # sends a TENDER email (sam.gov)
 *   node test-webhook.js --non-tender        # sends a normal email
 *
 * The script will print:
 *   - The webhook response (isTender, dbId, etc.)
 *   - Whether the document was written to MongoDB
 */

import http from "http";

const isTenderTest = !process.argv.includes("--non-tender");

// ─── Sample sam.gov tender alert email ──────────────────────────────────────
const tenderPayload = {
  MessageID: `test-${Date.now()}@postmark.local`,
  Date: new Date().toISOString(),
  Subject: "SAM.gov Opportunity Alert: Request for Proposal #FA8750-24-R-0001",
  From: "noreply@sam.gov",
  FromFull: { Email: "noreply@sam.gov", Name: "SAM.gov Notifications" },
  ToFull: [{ Email: "rfp@yourdomain.com", Name: "RFP Inbox" }],
  CcFull: [],
  ReplyTo: "",
  TextBody: `
A new opportunity has been posted on SAM.gov.

Title: Advanced Mission Systems Integration
Solicitation Number: FA8750-24-R-0001
Agency: Department of the Air Force
Type: Combined Synopsis/Solicitation
Response Deadline: 2024-04-30 17:00 EDT

Visit SAM.gov to view the full solicitation.
  `.trim(),
  HtmlBody: "<p>SAM.gov opportunity notification HTML body.</p>",
  StrippedTextReply: null,
  Headers: [
    { Name: "X-Spam-Status", Value: "No" },
    { Name: "X-Mailer", Value: "SAM.gov Notification System" },
  ],
  Attachments: [],
};

// ─── Normal (non-tender) email ───────────────────────────────────────────────
const normalPayload = {
  MessageID: `test-normal-${Date.now()}@postmark.local`,
  Date: new Date().toISOString(),
  Subject: "Hey, are you free for lunch?",
  From: "friend@gmail.com",
  FromFull: { Email: "friend@gmail.com", Name: "John Doe" },
  ToFull: [{ Email: "me@yourdomain.com", Name: "Me" }],
  CcFull: [],
  ReplyTo: "",
  TextBody: "Are you free for lunch today? Let me know!",
  HtmlBody: "<p>Are you free for lunch today? Let me know!</p>",
  StrippedTextReply: null,
  Headers: [],
  Attachments: [],
};

const payload = isTenderTest ? tenderPayload : normalPayload;
const body = JSON.stringify(payload);

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/inbound-email",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
};

console.log(
  `\n📨  Sending ${isTenderTest ? "TENDER" : "NORMAL"} test email to webhook...`,
);
console.log(`    From:    ${payload.FromFull.Email}`);
console.log(`    Subject: ${payload.Subject}\n`);

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const result = JSON.parse(data);
    console.log("✅  Webhook Response:\n", JSON.stringify(result, null, 2));
    if (result.isTender) {
      console.log("\n🎯  TENDER DETECTED — document saved to MongoDB.");
      console.log(`    DB Document ID: ${result.dbId}`);
    } else {
      console.log(
        "\n📭  Not a tender email — still saved to MongoDB for audit.",
      );
    }
  });
});

req.on("error", (err) => {
  console.error("❌  Request failed:", err.message);
  console.error("    Make sure the dev server is running: npm run dev");
});

req.write(body);
req.end();
