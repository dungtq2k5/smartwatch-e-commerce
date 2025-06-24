import mongoose from "mongoose";

const grnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  totalPriceCents: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  notes: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GrnStatus",
    required: true,
  },
  reversedByGrnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Grn",
  },
  reversedAt: {
    type: Date,
  },
});

const Grn = mongoose.model("Grn", grnSchema);
export default Grn;
