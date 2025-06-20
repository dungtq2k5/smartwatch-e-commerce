import mongoose from "mongoose";

const instanceConditionSchema = new mongoose.Schema({
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

const InstanceCondition = mongoose.model(
  "InstanceCondition",
  instanceConditionSchema
);
export default InstanceCondition;