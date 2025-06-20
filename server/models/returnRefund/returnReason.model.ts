import mongoose from "mongoose";

const returnReasonSchema = new mongoose.Schema({
  lookupId: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const ReturnReason = mongoose.model("ReturnReason", returnReasonSchema);
export default ReturnReason;
