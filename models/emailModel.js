import mongoose from "mongoose";

// Mongoose Schema
const rfpEmailSchema = new mongoose.Schema(
  {
    // Core email fields
    messageId: { type: String, unique: true, sparse: true },
    subject: { type: String, required: true },
    fromEmail: { type: String, required: true },
    fromName: { type: String },
    fromDomain: { type: String },
    date: { type: Date },
    textBody: { type: String },
    htmlBody: { type: String },
    attachments: [
      {
        name: String,
        contentType: String,
        storageUrl: { type: String, default: null },
      },
    ],
    //links extracted from body
    extractedLinks: [
      {
        url: { type: String, default: null },
      },
    ],

    // Tender detection metadata
    isTender: { type: Boolean, required: true, default: false },
    detectedBy: { type: String, default: null }, // "domain" | "emailPattern" | "subject"
    detectedValue: { type: String, default: null }, // The matched value

    // Raw payload for debugging / re-processing
    rawPayload: { type: mongoose.Schema.Types.Mixed },

    // Processing status
    status: {
      type: String,
      enum: ["received", "processed", "error"],
      default: "received",
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    collection: "rfp_emails",
  },
);

// Indexes for common queries
rfpEmailSchema.index({ fromDomain: 1 });
rfpEmailSchema.index({ isTender: 1 });
rfpEmailSchema.index({ createdAt: -1 });

const RFPEmail =
  mongoose.models.RFPEmail || mongoose.model("RFPEmail", rfpEmailSchema);

export default RFPEmail;
