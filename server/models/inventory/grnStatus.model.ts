import mongoose from "mongoose";

const grnStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  }
});

const GrnStatus = mongoose.model("GrnStatus", grnStatusSchema);
export default GrnStatus;