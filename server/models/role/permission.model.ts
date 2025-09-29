import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IPermission extends Document<Types.ObjectId> {
  name: string;
  code: string;
}

const PermissionSchema: Schema<IPermission> = new Schema({
  name: {
    type: String,
    unique: true,
    required: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
  },
});

const Permission: Model<IPermission> = mongoose.model<IPermission>(
  "Permission",
  PermissionSchema
);
export default Permission;
