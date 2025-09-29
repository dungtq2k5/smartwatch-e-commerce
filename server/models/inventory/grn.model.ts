import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IGrn extends Document<Types.ObjectId> {
  name: string;
  providerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  totalPriceCents: number;
  quantity: number;
  notes: string | null;
  createdAt: Date;
  stateId: Types.ObjectId;
  reversedByGrnId: Types.ObjectId | null;
  reversedAt: Date | null;
}

const grnSchema: Schema<IGrn> = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
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
      required: false,
      default: null,
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "GrnState",
      required: true,
    },
    reversedByGrnId: {
      type: Schema.Types.ObjectId,
      ref: "Grn",
      required: false,
      default: null,
    },
    reversedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: { createdAt: true } }
);

const Grn: Model<IGrn> = mongoose.model<IGrn>("Grn", grnSchema);
export default Grn;
