import fs from "fs";
import path from "path";

export function extractAttachmentContent(attachment) {
  const content = Buffer.from(attachment.content, "base64");

  // ✅ Use Vercel writable directory
  const uploadDir = "/tmp/uploads";

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, attachment.name);

  fs.writeFileSync(filePath, content);

  return filePath;
}