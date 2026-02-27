import mongoose from "mongoose";

// Mongoose Schema
const rfpEmailSchema = new mongoose.Schema(
  {
    // Core email fields
    messageId: { type: String, unique: true, sparse: true },
    subject: { type: String, required: true },
    fromEmail: { type: String, required: true },
    date: { type: Date },
    deadline: { type: String , default: null},
    tenderTitle: { type: String, default: null },
    issuingAuthority: { type: String, default: null },
    contractValue: { type: String, default: null },
    description: { type: String, default: null },

    //links extracted from body
    extractedLinks: [
      {
        url: {type: String, default: null},
      },
    ],
    // Raw payload for debugging / re-processing
    rawPayload: { type: mongoose.Schema.Types.Mixed },

    isFiltered:{
      type: Boolean,
      default: false,
    },
    parsingMethod: {
      type: String,
      default: null,
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
