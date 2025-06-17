import mongoose from "mongoose";

const PermissionEntrySchema = new mongoose.Schema(
  {
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    userAssigned: {
      type: Number,
      default: 0,
      min: 0,
    },
    permissions: {
      type: [PermissionEntrySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", RoleSchema);
export default Role;
