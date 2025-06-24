import mongoose from "mongoose";
import { IMMUTABILITY_ROLE_NAMES } from "../../../common/configs.common";

const rolePermission = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
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
      type: [rolePermission],
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

// --- IMMUTABILITY MIDDLEWARE FOR PROTECTED ROLES ---
// 1. PREVENT MODIFICATION via 'doc.save()'
roleSchema.pre("save", function (next) {
  if (!this.isNew && IMMUTABILITY_ROLE_NAMES.includes(this.name)) {
    return next(
      new Error(`Role "${this.name}" is immutable and cannot be modified.`)
    );
  }
});

const preventImmutableRoleMod = function (action: "deletes" | "updates") {
  return async (next: mongoose.CallbackWithoutResultAndOptionalError) => {
    const filter = this.getFilter();

    const isModifyingImmutableRole = await this.model.exists({
      ...filter,
      name: { $in: IMMUTABILITY_ROLE_NAMES },
    });
    if (isModifyingImmutableRole) {
      return next(
        action === "deletes"
          ? new Error(
              `Cannot delete immutable role(s): ${IMMUTABILITY_ROLE_NAMES.join(
                ", "
              )}`
            )
          : new Error(
              `Cannot modify immutable role(s): ${IMMUTABILITY_ROLE_NAMES.join(
                ", "
              )}.`
            )
      );
    }
    next();
  };
};

// 2. PREVENT MODIFICATION via query-based updates
roleSchema.pre("updateOne", preventImmutableRoleMod("updates"));
roleSchema.pre("updateMany", preventImmutableRoleMod("updates"));
roleSchema.pre("findOneAndUpdate", preventImmutableRoleMod("updates"));

// 3. PREVENT DELETION via query-based deletes
roleSchema.pre("deleteOne", preventImmutableRoleMod("deletes"));
roleSchema.pre("deleteMany", preventImmutableRoleMod("deletes"));
roleSchema.pre("findOneAndDelete", preventImmutableRoleMod("deletes"));

const Role = mongoose.model("Role", roleSchema);
export default Role;
