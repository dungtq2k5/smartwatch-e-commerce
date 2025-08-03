import mongoose from "mongoose";
import {
  IMMUTABILITY_USER_EMAILS,
  MODIFIABLE_PROTECTED_USER_FIELDS,
  PROTECTED_USER_EMAILS,
  USER_GENDER_OPTIONS,
  AUTH_PROVIDER_OPTIONS,
} from "../../../common/configs.common";

const userRole = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      required: false,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      required: false,
      default: null,
    },
    email: {
      // Can be null if phoneNumber is provided
      type: String,
      unique: true,
      sparse: true,
      required: false,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    phoneNumber: {
      // Can be null if email is provided
      type: String,
      unique: true,
      sparse: true,
      required: false,
      default: null,
    },
    isPhoneNumberVerified: {
      type: Boolean,
      required: false,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    birth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: USER_GENDER_OPTIONS,
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: false,
      default: null,
    },
    userBalanceCents: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    lastLogin: {
      type: Date,
      required: false,
      default: null,
    },
    isLocked: {
      type: Boolean,
      required: false,
      default: false,
    },
    authProvider: {
      type: String,
      enum: AUTH_PROVIDER_OPTIONS,
      required: false,
      default: "local",
    },
    isDeleted: {
      type: Boolean,
      required: false,
      default: false,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null,
    },
    roles: {
      type: [userRole],
      required: false,
      default: [],
    },
  },
  { timestamps: true }
);

// --- IMMUTABILITY MIDDLEWARE FOR PROTECTED USERS ---
// 1. PREVENT MODIFICATION via 'doc.save()'
userSchema.pre("save", function (next) {
  // 'this' refers to the document being saved
  if (this.isNew || typeof this.email !== "string") {
    return next();
  }

  if (IMMUTABILITY_USER_EMAILS.includes(this.email)) {
    return next(
      new Error(`Immutable user '${this.email}' cannot be modified.`)
    );
  }

  if (PROTECTED_USER_EMAILS.includes(this.email)) {
    // Get all fields that were modified
    const modifiedPaths = this.modifiedPaths();

    const modifiable = modifiedPaths.every((field: any) =>
      MODIFIABLE_PROTECTED_USER_FIELDS.includes(field)
    );

    if (!modifiable) {
      return next(
        new Error(
          `User '${this.email} is protected'.
          Only the ${MODIFIABLE_PROTECTED_USER_FIELDS.join(
            ", "
          )} fields can be modified.`
        )
      );
    }
  }

  next();
});

const preventBaseUserMod = function (action: "deletes" | "updates") {
  return async function (next: mongoose.CallbackWithoutResultAndOptionalError) {
    const filter = this.getFilter();

    const isModifyingImmutableUser = await this.model.exists({
      ...filter,
      email: { $in: IMMUTABILITY_USER_EMAILS },
    });

    if (isModifyingImmutableUser) {
      return next(new Error(`Immutable user(s) cannot be modified.`));
    }

    const isModifyingProtectedUser = await this.model.exists({
      ...filter,
      email: { $in: PROTECTED_USER_EMAILS },
    });

    if (!isModifyingProtectedUser) {
      return next(); // Not a protected user, so proceed.
    }

    if (action === "deletes") {
      return next(new Error(`Cannot delete protected user(s).`));
    }

    const update = this.getUpdate();
    if (!update) return next();

    const updatedFields = Object.keys(update).reduce((acc: string[], key) => {
      if (key.startsWith("$")) {
        return acc.concat(Object.keys(update[key]));
      }
      acc.push(key);
      return acc;
    }, []);

    const modifiable = updatedFields.every((field: any) =>
      MODIFIABLE_PROTECTED_USER_FIELDS.includes(field)
    );

    if (!modifiable) {
      return next(
        new Error(
          `Protected user(s) cannot be modified.
          Only the ${MODIFIABLE_PROTECTED_USER_FIELDS.join(
            ", "
          )} field(s) can be modified.`
        )
      );
    }

    next();
  };
};

// 2. PREVENT MODIFICATION via query-based updates
userSchema.pre("updateOne", preventBaseUserMod("updates"));
userSchema.pre("updateMany", preventBaseUserMod("updates"));
userSchema.pre("findOneAndUpdate", preventBaseUserMod("updates"));

// 3. PREVENT DELETION via query-based deletes
userSchema.pre("deleteOne", preventBaseUserMod("deletes"));
userSchema.pre("deleteMany", preventBaseUserMod("deletes"));
userSchema.pre("findOneAndDelete", preventBaseUserMod("deletes"));

const User = mongoose.model("User", userSchema);
export default User;
