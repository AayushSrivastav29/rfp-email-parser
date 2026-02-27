import mongoose from "mongoose";

const filteredRFPEmailSchema = new mongoose.Schema({
  fromEmail: { type: String, required: true },
  tenderTitle: {
    type: String,
    required: true,
  },
  issuingAuthority: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
  },
  contractValue: {
    type: String,
  },
  description: {
    type: String,
  },
  extractedLinks: [
    {
      url: { type: String, default: null },
    },
  ],
});

export default mongoose.models.FilteredRFPEmail ||
  mongoose.model("FilteredRFPEmail", filteredRFPEmailSchema);
