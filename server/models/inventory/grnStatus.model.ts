import mongoose from "mongoose";

const grnStatusSchema = new mongoose.Schema({
  lookupId: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  }
});

const GrnStatus = mongoose.model("GrnStatus", grnStatusSchema);
export default GrnStatus;