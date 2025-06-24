import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
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

const Permission = mongoose.model("Permission", PermissionSchema);
export default Permission;
