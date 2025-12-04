import { useCallback, useEffect, useRef, useState } from "react";
import defaultAvatar from "../../../assets/default-avatar.webp";
import {
  AVATAR_ALLOWED_TYPES,
  PASSWORD_HINT_MESSAGE,
  USER_GENDER_OPTIONS,
} from "../../../../../common/configs.common";
import { AVATAR_HINT_MESSAGE, WAITING_EMOJI } from "../../../configs";
import { Link, useNavigate } from "react-router-dom";
import type { FormFileInput, FormInput } from "../../../utils/types";
import { useRoleStore } from "../../../store/admin/roleStore";
import {
  formatError,
  getLocalDateString,
  isValidBirthDate,
  isValidEmail,
  isValidPassword,
  isValidVnPhoneNumber,
  isValidUserFullName,
  readFileAsDataUrl,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import ApiError from "../../common/ApiError";
import { getImgFileErrs, uploadFile } from "../../../utils/utils";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import { useUserStore } from "../../../store/admin/userStore";
import type { UserCreate } from "../../../../../common/types.common";
import CreateUserSkeleton from "../skeleton/CreateUserSkeleton";

type FormData = {
  fullName: FormInput;
  avatar: FormFileInput;
  email: FormInput;
  isEmailVerified: boolean;
  phoneNumber: FormInput;
  isPhoneNumberVerified: boolean;
  password: FormInput;
  birth: FormInput;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  isLocked: boolean;
  roleIds: string[];
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingAvatar: boolean;
  isCreating: boolean;
};

export default function CreateUser() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateUser rendered", renderCount.current);

  const navigate = useNavigate();

  const { roles, fetchRoles } = useRoleStore();
  const { createUser } = useUserStore();

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    avatar: { file: null },
    email: { val: "" },
    isEmailVerified: false,
    phoneNumber: { val: "" },
    isPhoneNumberVerified: false,
    password: { val: "" },
    birth: { val: new Date().toISOString() },
    gender: "other",
    isLocked: false,
    roleIds: [],
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isCreating: false,
    isUploadingAvatar: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const changeAvatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] =
    useState<string>(defaultAvatar);

  // Fetch and set initial data when first load: roles
  useEffect(() => {
    const handleFetchSetInitial = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        await fetchRoles();
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isInitializing: false,
        }));
      }
    };

    handleFetchSetInitial();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveAvatar = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    changeAvatarRef.current!.value = "";
    setFormData((prev) => ({
      ...prev,
      avatar: { file: null },
    }));
    setAvatarPreviewUrl(defaultAvatar);
  }, [process.isProcessing]);

  const handleChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ): Promise<void> => {
      if (process.isProcessing) return;

      const { name, value: val, type } = e.target;

      // avatar
      if (name === "avatar") {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUploadingAvatar: true,
          }));
          const file = files[0];

          // Change avatarPreviewUrl
          setAvatarPreviewUrl((await readFileAsDataUrl(file)) as string);

          const imgFileErrs = await getImgFileErrs(files[0], "avatar");
          setFormData((prev) => ({
            ...prev,
            avatar: {
              file,
              err: `Avatar file is invalid: ${imgFileErrs.join(", ")}`,
            },
          }));

          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUploadingAvatar: false,
          }));
        }
        return;
      }

      // roleIds, isLocked, isEmailVerified, isPhoneNumberVerified
      if (type === "checkbox") {
        if (name === "roleIds") {
          const roleId = val;
          setFormData((prev) => {
            const roleIds = prev.roleIds.includes(roleId)
              ? prev.roleIds.filter((id) => id !== roleId)
              : [...prev.roleIds, roleId];
            return {
              ...prev,
              roleIds,
            };
          });
          return;
        }

        const checked = (e.target as HTMLInputElement).checked;
        if (name === "isEmailVerified") {
          setFormData((prev) => ({
            ...prev,
            isEmailVerified: checked,
            email: {
              ...prev.email,
              err:
                checked && !formData.email.val
                  ? "Email is required to be verified"
                  : undefined,
            },
          }));
          return;
        }
        if (name === "isPhoneNumberVerified") {
          setFormData((prev) => ({
            ...prev,
            isPhoneNumberVerified: checked,
            phoneNumber: {
              ...prev.phoneNumber,
              err:
                checked && !formData.phoneNumber.val
                  ? "Phone number is required to be verified"
                  : undefined,
            },
          }));
          return;
        }

        setFormData((prev) => ({
          ...prev,
          [name]: checked,
        }));
        return;
      }

      // gender
      if (name === "gender") {
        setFormData((prev) => ({
          ...prev,
          gender: val as (typeof USER_GENDER_OPTIONS)[number],
        }));
        return;
      }

      // Other inputs
      let err = "";
      if (!val && ["email", "phoneNumber"].includes(name)) {
        err = `${name} is required`;
      } else if (name === "fullName" && !isValidUserFullName(val)) {
        err = "Full name is invalid";
      } else if (name === "email" && !isValidEmail(val)) {
        err = "Email is invalid";
      } else if (name === "phoneNumber" && !isValidVnPhoneNumber(val)) {
        err = "Phone number is invalid";
      } else if (name === "password" && !isValidPassword(val)) {
        err = "Password is invalid";
      } else if (name === "birth" && !isValidBirthDate(val)) {
        err = "Birth date is invalid";
      }
      setFormData((prev) => ({
        ...prev,
        [name]: { val, err },
      }));
    },
    [formData.email.val, formData.phoneNumber.val, process.isProcessing]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (!newFormData.fullName.val) {
          newFormData.fullName.err = "Full name is required";
          allValid = false;
        } else if (!isValidUserFullName(newFormData.fullName.val)) {
          newFormData.fullName.err = "Full name is invalid";
          allValid = false;
        }
        if (newFormData.avatar.file instanceof File) {
          const imgFileErrs = await getImgFileErrs(
            newFormData.avatar.file,
            "avatar"
          );
          if (imgFileErrs.length) {
            newFormData.avatar.err = `Avatar file is invalid: ${imgFileErrs.join(
              ", "
            )}`;
            allValid = false;
          }
        }

        if (!newFormData.email.val && !newFormData.phoneNumber.val) {
          newFormData.email.err = newFormData.phoneNumber.err =
            "Either email or phone number is required";
          allValid = false;
        } else {
          if (newFormData.email.val) {
            if (!isValidEmail(newFormData.email.val)) {
              newFormData.email.err = "Email is invalid";
              allValid = false;
            }
          } else if (newFormData.isEmailVerified) {
            newFormData.email.err = "Email is required to be verified";
            allValid = false;
          }

          if (newFormData.phoneNumber.val) {
            if (!isValidVnPhoneNumber(newFormData.phoneNumber.val)) {
              newFormData.phoneNumber.err = "Phone number is invalid";
              allValid = false;
            }
          } else if (newFormData.isPhoneNumberVerified) {
            newFormData.phoneNumber.err =
              "Phone number is required to be verified";
            allValid = false;
          }
        }

        if (!newFormData.password.val) {
          newFormData.password.err = "Password is required";
          allValid = false;
        } else if (!isValidPassword(newFormData.password.val)) {
          newFormData.password.err = "Password is invalid";
          allValid = false;
        }
        if (!newFormData.birth.val) {
          newFormData.birth.err = "Birth date is required";
          allValid = false;
        } else if (!isValidBirthDate(newFormData.birth.val)) {
          newFormData.birth.err = "Birth date is invalid";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreating: true,
      }));
      if (await validateForm()) {
        try {
          let avatarUrl: string | null = null;
          if (formData.avatar.file instanceof File) {
            const downloadUrl = await uploadFile(
              formData.avatar.file,
              "avatar"
            );
            if (!downloadUrl) throw new Error("Failed to upload avatar file");
            avatarUrl = downloadUrl;
          }

          const user: UserCreate = {
            fullName: formData.fullName.val,
            avatarUrl,
            email: formData.email.val || null,
            isEmailVerified: formData.isEmailVerified,
            phoneNumber: formData.phoneNumber.val || null,
            isPhoneNumberVerified: formData.isPhoneNumberVerified,
            password: formData.password.val,
            birth: new Date(formData.birth.val).toISOString(),
            gender: formData.gender,
            isLocked: formData.isLocked,
            roleIds: formData.roleIds.length ? formData.roleIds : null,
          };

          await createUser(user);
          navigate("/admin/users");
          toast.success("User created successfully.");
        } catch (error) {
          toast.error(formatError(error));
        }
      }
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreating: false,
      }));
    },
    [createUser, formData, navigate, process.isProcessing]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/admin/users");
  }, [navigate, process.isProcessing]);

  return (
    <>
      {process.isInitializing ? (
        <CreateUserSkeleton />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !roles ? (
        <ApiError errMsg="Roles data not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="fs-2 mb-0 d-flex gap-2">
              <Link
                to={"/admin/users"}
                className="text-decoration-none text-black"
              >
                User Management
              </Link>
              <p className="mb-0 fw-light">/</p>
              Create User
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row">
                  {/* Left column: User Information */}
                  <div className="col-lg-8">
                    {/* Full name */}
                    <div className="mb-3">
                      <label htmlFor="fullName" className="form-label">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        name="fullName"
                        className="form-control"
                        value={formData.fullName.val}
                        placeholder="John Doe"
                        autoComplete="name"
                        onChange={handleChange}
                      />
                      {formData.fullName.err && (
                        <InvalidInputMsg msg={formData.fullName.err} />
                      )}
                    </div>

                    {/* Email */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label">
                        Email{" "}
                        <span className="text-muted small">
                          (can leave blank if phone is provided)
                        </span>
                      </label>
                      <div className="input-group">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          className="form-control"
                          value={formData.email.val}
                          placeholder="john@gmail.com"
                          autoComplete="email"
                          onChange={handleChange}
                        />
                        <div className="input-group-text">
                          <input
                            className="form-check-input mt-0"
                            type="checkbox"
                            id="isEmailVerified"
                            name="isEmailVerified"
                            checked={formData.isEmailVerified}
                            onChange={handleChange}
                          />
                          <label
                            className="form-check-label ms-2"
                            htmlFor="isEmailVerified"
                          >
                            Verified
                          </label>
                        </div>
                      </div>
                      {formData.email.err && (
                        <InvalidInputMsg msg={formData.email.err} />
                      )}
                    </div>

                    {/* Phone */}
                    <div className="mb-3">
                      <label htmlFor="phoneNumber" className="form-label">
                        Phone{" "}
                        <span className="text-muted small">
                          (can leave blank if email is provided)
                        </span>
                      </label>
                      <div className="input-group">
                        <input
                          type="tel"
                          id="phoneNumber"
                          name="phoneNumber"
                          className="form-control"
                          value={formData.phoneNumber.val}
                          placeholder="+1234567890"
                          onChange={handleChange}
                          autoComplete="tel"
                        />
                        <div className="input-group-text">
                          <input
                            className="form-check-input mt-0"
                            type="checkbox"
                            id="isPhoneNumberVerified"
                            name="isPhoneNumberVerified"
                            checked={formData.isPhoneNumberVerified}
                            onChange={handleChange}
                            autoComplete="tel"
                          />
                          <label
                            className="form-check-label ms-2"
                            htmlFor="isPhoneNumberVerified"
                          >
                            Verified
                          </label>
                        </div>
                      </div>
                      {formData.phoneNumber.err && (
                        <InvalidInputMsg msg={formData.phoneNumber.err} />
                      )}
                    </div>

                    {/* Password */}
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        className="form-control"
                        value={formData.password.val}
                        placeholder="yourVeryStrongNewPassword1234"
                        onChange={handleChange}
                        autoComplete="new-password"
                        aria-describedby="passwordHelp"
                      />
                      <div id="passwordHelp" className="form-text">
                        {PASSWORD_HINT_MESSAGE}
                      </div>
                      {formData.password.err && (
                        <InvalidInputMsg msg={formData.password.err} />
                      )}
                    </div>

                    <div className="row">
                      {/* Birth */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="birth" className="form-label">
                          Birth Date
                        </label>
                        <input
                          type="date"
                          id="birth"
                          name="birth"
                          className="form-control"
                          value={getLocalDateString(formData.birth.val)}
                          onChange={handleChange}
                        />
                        {formData.birth.err && (
                          <InvalidInputMsg msg={formData.birth.err} />
                        )}
                      </div>
                      {/* Gender */}
                      <div className="col-md-6 mb-3">
                        <label htmlFor="gender" className="form-label">
                          Gender
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          className="form-select"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          {USER_GENDER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Locked */}
                    <div className="form-check form-switch mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="isLocked"
                        name="isLocked"
                        checked={formData.isLocked}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="isLocked">
                        Lock this account
                      </label>
                    </div>

                    {/* Roles */}
                    <div>
                      <p className="form-label">Roles</p>
                      <div className="d-flex gap-3">
                        {roles.roles.map((role, idx) => {
                          const id = `role-${idx}`;
                          return (
                            <div className="form-check" key={role.id}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={id}
                                name="roleIds"
                                value={role.id}
                                checked={formData.roleIds.includes(role.id)}
                                onChange={handleChange}
                              />
                              <label
                                className="form-check-label text-capitalize"
                                htmlFor={id}
                              >
                                {role.name}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right column: Avatar */}
                  <div className="col-lg-4">
                    <div className="text-center">
                      <p className="fs-5 mb-3">Avatar</p>
                      <img
                        src={avatarPreviewUrl}
                        alt="Avatar Preview"
                        loading="lazy"
                        className="avatar--g avatar--lg--g"
                      />

                      <div hidden aria-hidden>
                        <label htmlFor="avatar">Avatar</label>
                        <input
                          type="file"
                          id="avatar"
                          name="avatar"
                          accept={AVATAR_ALLOWED_TYPES.join(", ")}
                          ref={changeAvatarRef}
                          onChange={handleChange}
                          aria-describedby="avatarHelp"
                        />
                      </div>

                      <div id="avatarHelp" className="form-text">
                        {AVATAR_HINT_MESSAGE}
                      </div>

                      {formData.avatar.file && (
                        <button
                          type="button"
                          className="btn btn-link text-danger p-0 me-2"
                          onClick={handleRemoveAvatar}
                        >
                          remove
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() => changeAvatarRef.current?.click()}
                        disabled={process.isProcessing}
                      >
                        {formData.avatar.file ? "change" : "upload"}
                      </button>
                      {formData.avatar.err && (
                        <InvalidInputMsg msg={formData.avatar.err} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-footer text-end">
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDiscard}
                    disabled={process.isProcessing}
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={process.isProcessing}
                  >
                    {process.isCreating ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        <output>Creating...</output>
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
