import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IGrnState extends Document<Types.ObjectId> {
  lookupId: string;
  name: string;
  description: string;
}

const grnStateSchema: Schema<IGrnState> = new Schema({
  lookupId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const GrnState: Model<IGrnState> = mongoose.model<IGrnState>(
  "GrnState",
  grnStateSchema
);
export default GrnState;
