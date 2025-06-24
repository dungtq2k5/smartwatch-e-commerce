import mongoose from "mongoose";
import {
  IMMUTABILITY_USER_EMAILS,
  PROTECTED_USER_EMAILS,
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
    },
    email: {
      // Can be undefined if phoneNumber is provided
      type: String,
      unique: true,
      sparse: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      // Can be undefined if email is provided
      type: String,
      unique: true,
      sparse: true,
    },
    isPhoneNumberVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
    },
    userBalanceCents: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastLogin: {
      type: Date,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    roles: {
      type: [userRole],
      default: [],
    },
  },
  { timestamps: true }
);

// --- IMMUTABILITY MIDDLEWARE FOR PROTECTED USERS ---
const ALLOWED_PROTECTED_USER_MODIFIABLE_FIELDS = [
  "fullName",
  "avatarUrl",
  "email",
  "password",
  "lastLogin",
  "updatedAt",
];

// 1. PREVENT MODIFICATION via 'doc.save()'
userSchema.pre("save", function (next) {
  // 'this' refers to the document being saved
  if (!this.isNew && typeof this.email === "string") {
    if (IMMUTABILITY_USER_EMAILS.includes(this.email)) {
      return next(
        new Error(`Immutable user ('${this.email}') cannot be modified.`)
      );
    }

    if (PROTECTED_USER_EMAILS.includes(this.email)) {
      // Get all fields that were modified
      const modifiedPaths = this.modifiedPaths();

      const forbiddenFiles = modifiedPaths.filter(
        (path) => !ALLOWED_PROTECTED_USER_MODIFIABLE_FIELDS.includes(path)
      );

      if (forbiddenFiles.length > 0) {
        return next(
          new Error(
            `Protected user ('${
              this.email
            }') cannot modify fields: ${forbiddenFiles.join(", ")}.`
          )
        );
      }
    }
  }
  next();
});

// 2. PREVENT MODIFICATION via query-based updates
const preventProtectedUserMod = async function (
  next: mongoose.CallbackWithoutResultAndOptionalError
) {
  // 'this' refers to the query being executed
  const filter = this.getFilter();

  // Check if any document matching the update query is an immutable user.
  const isUpdatingImmutableUser = await this.model.exists({
    ...filter,
    email: { $in: IMMUTABILITY_USER_EMAILS },
  });
  if (isUpdatingImmutableUser) {
    return next(new Error(`Immutable user(s) cannot be modified.`));
  }

  // Check if any document matching the update query is a protected user.
  const isUpdatingProtectedUser = await this.model.exists({
    ...filter,
    email: { $in: PROTECTED_USER_EMAILS },
  });

  if (isUpdatingProtectedUser) {
    const update = this.getUpdate();

    // Extract all keys from update operators like $set, $inc, etc.
    const updatedKeys = [
      ...Object.keys(update?.$set || {}),
      ...Object.keys(update?.$unset || {}),
      ...Object.keys(update?.$inc || {}),
      ...Object.keys(update || {}),
      // Add more operators if needed
    ];

    // Check if any updated key is NOT in the allowed list.
    const forbiddenFields = updatedKeys.filter(
      (key) => !ALLOWED_PROTECTED_USER_MODIFIABLE_FIELDS.includes(key)
    );

    if (forbiddenFields.length > 0) {
      return next(
        new Error(
          `Protected user(s) cannot modify fields: ${forbiddenFields.join(
            ", "
          )}.`
        )
      );
    }
  }

  next();
};
userSchema.pre("updateOne", preventProtectedUserMod);
userSchema.pre("updateMany", preventProtectedUserMod);
userSchema.pre("findOneAndUpdate", preventProtectedUserMod);

// 3. PREVENT DELETION via query-based deletes
const preventProtectUserDeletion = async function (
  next: mongoose.CallbackWithoutResultAndOptionalError
) {
  // 'this' refers to the query being executed
  const filter = this.getFilter();

  // Check if any document matching the delete query is an immutable user.
  const isDeletingImmutableUser = await this.model.exists({
    ...filter,
    email: { $in: IMMUTABILITY_USER_EMAILS },
  });
  if (isDeletingImmutableUser) {
    return next(new Error(`Immutable user(s) cannot be deleted.`));
  }

  // Check if any document matching the delete query is a protected user.
  const isDeletingProtectedUser = await this.model.exists({
    ...filter,
    email: { $in: PROTECTED_USER_EMAILS },
  });

  if (isDeletingProtectedUser) {
    return next(new Error(`Protected user(s) cannot be deleted.`));
  }

  next();
};

userSchema.pre("deleteOne", preventProtectUserDeletion);
userSchema.pre("deleteMany", preventProtectUserDeletion);
userSchema.pre("findOneAndDelete", preventProtectUserDeletion);

const User = mongoose.model("User", userSchema);
export default User;
