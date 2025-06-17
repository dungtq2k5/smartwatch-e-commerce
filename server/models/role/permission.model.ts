import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
  actionName: {
    type: String,
    unique: true,
    required: true,
  },
  actionCode: {
    type: String,
    unique: true,
    required: true,
  },
});

const Permission = mongoose.model("Permission", PermissionSchema);
export default Permission;
