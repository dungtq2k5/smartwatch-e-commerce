import mongoose from "mongoose";
import {
  PROTECTED_ROLE_NAMES,
  MODIFIABLE_PROTECTED_ROLES_FIELDS,
} from "../../../common/configs.common";

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
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
      lowercase: true,
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

// --- MIDDLEWARE FOR PROTECTED ROLES ---
// 1. PREVENT MODIFICATION via 'doc.save()'
roleSchema.pre("save", function (next) {
  if (this.isNew || !PROTECTED_ROLE_NAMES.includes(this.name as any)) {
    return next();
  }

  const modifiedPaths = this.modifiedPaths();

  const modifiable = modifiedPaths.every((field: any) =>
    MODIFIABLE_PROTECTED_ROLES_FIELDS.includes(field)
  );

  if (!modifiable) {
    return next(
      new Error(
        `Role '${this.name}' is protected.
        Only the ${MODIFIABLE_PROTECTED_ROLES_FIELDS.join(
          ", "
        )} field(s) can be modified.`
      )
    );
  }

  next();
});

const preventProtectedRoleMod = function (action: "deletes" | "updates") {
  return async function (next: mongoose.CallbackWithoutResultAndOptionalError) {
    const filter = this.getFilter();

    const isModifyingProtectedRole = await this.model.exists({
      ...filter,
      name: { $in: PROTECTED_ROLE_NAMES },
    });

    if (!isModifyingProtectedRole) {
      return next(); // Not an immutable role, so proceed.
    }

    if (action === "deletes") {
      return next(new Error("Cannot delete protected role(s)."));
    }

    // If it's an update action, check which fields are being updated.
    const update = this.getUpdate();
    if (!update) return next();

    // Get all fields being modified, including those inside operators like $set or $inc
    const updatedFields = Object.keys(update).reduce((acc: string[], key) => {
      if (key.startsWith("$")) {
        return acc.concat(Object.keys(update[key]));
      }
      acc.push(key);
      return acc;
    }, []);

    // Check if every field in the update is 'userAssigned'
    const modifiable = updatedFields.every((field: any) =>
      MODIFIABLE_PROTECTED_ROLES_FIELDS.includes(field)
    );

    if (!modifiable) {
      return next(
        new Error(
          `Protected role(s) cannot be modified.
          Only the ${MODIFIABLE_PROTECTED_ROLES_FIELDS.join(
            ", "
          )} field(s) can be modified.`
        )
      );
    }

    next();
  };
};

// 2. PREVENT MODIFICATION via query-based updates
roleSchema.pre("updateOne", preventProtectedRoleMod("updates"));
roleSchema.pre("updateMany", preventProtectedRoleMod("updates"));
roleSchema.pre("findOneAndUpdate", preventProtectedRoleMod("updates"));

// 3. PREVENT DELETION via query-based deletes
roleSchema.pre("deleteOne", preventProtectedRoleMod("deletes"));
roleSchema.pre("deleteMany", preventProtectedRoleMod("deletes"));
roleSchema.pre("findOneAndDelete", preventProtectedRoleMod("deletes"));

const Role = mongoose.model("Role", roleSchema);
export default Role;
