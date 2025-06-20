import mongoose from "mongoose";

const returnStatusSchema = new mongoose.Schema({
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

const ReturnStatus = mongoose.model("ReturnStatus", returnStatusSchema);
export default ReturnStatus;
