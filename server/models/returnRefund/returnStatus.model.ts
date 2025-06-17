import mongoose from "mongoose";

const returnStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
});

const ReturnStatus = mongoose.model("ReturnStatus", returnStatusSchema);
export default ReturnStatus;
