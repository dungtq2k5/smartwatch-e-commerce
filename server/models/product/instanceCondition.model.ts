import mongoose from "mongoose";

const instanceConditionSchema = new mongoose.Schema({
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