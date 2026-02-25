import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(
        `[Server] RFP Email Parser running on http://localhost:${PORT}`,
      );
      console.log(
        `[Server] Webhook endpoint: POST http://localhost:${PORT}/api/inbound-email`,
      );
    });
  } catch (err) {
    console.error("[Server] Failed to start:", err.message);
    process.exit(1);
  }
}

start();
