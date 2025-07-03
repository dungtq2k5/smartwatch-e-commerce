import mongoose from "mongoose";

const returnReasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const ReturnReason = mongoose.model("ReturnReason", returnReasonSchema);
export default ReturnReason;
