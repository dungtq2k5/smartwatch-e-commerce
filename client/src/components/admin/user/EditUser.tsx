import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useRoleStore from "../../../store/admin/roleStore";
import useUserStore from "../../../store/admin/userStore";
import type { FormFileInput, FormInput } from "../../../utils/types";
import {
  AVATAR_ALLOWED_TYPES,
  PASSWORD_HINT_MESSAGE,
  USER_GENDER_OPTIONS,
} from "../../../../../common/configs.common";
import {
  capFirstLetter,
  compareList,
  formatError,
  getLocalDateString,
  isValidBirthDate,
  isValidEmail,
  isValidPassword,
  isValidUserFullName,
  isValidVnPhoneNumber,
  readFileAsDataUrl,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import type {
  AdminUserResponse,
  UserEmailUpdate,
  UserPhoneNumberUpdate,
  UserUpdate,
} from "../../../../../common/types.common";
import defaultAvatar from "../../../assets/default-avatar.webp";
import toast from "react-hot-toast";
import { AVATAR_HINT_MESSAGE, WAITING_EMOJI } from "../../../configs";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import { getImgFileErrs, uploadFile } from "../../../utils/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faCircleQuestion,
} from "@fortawesome/free-solid-svg-icons";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import useRefreshStore from "../../../store/admin/refreshStore";
import EditUserSkeleton from "../skeleton/EditUserSkeleton";
import Title from "../Title";

type FormData = {
  fullName: FormInput;
  avatar: FormFileInput;
  password: FormInput;
  birth: FormInput;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  isLocked: boolean;
  roleIds: string[];
  // Contact info
  email: FormInput;
  isEmailVerified: boolean;
  phoneNumber: FormInput;
  isPhoneNumberVerified: boolean;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingAvatar: boolean;
  isUpdatingGeneralInfo: boolean;
  isUpdatingContactInfo: boolean;
};

export default function EditUser() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`EditUser render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { roles, fetchRoles } = useRoleStore();
  const { fetchUser, updateUser, updateUserEmail, updateUserPhoneNumber } =
    useUserStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const canEditUser = useHasPermission("u_usr");

  const [user, setUser] = useState<AdminUserResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    avatar: { val: null },
    password: { val: "" },
    birth: { val: "" },
    gender: "other",
    isLocked: false,
    roleIds: [],
    // Contact info
    email: { val: "" },
    isEmailVerified: false,
    phoneNumber: { val: "" },
    isPhoneNumberVerified: false,
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingAvatar: false,
    isUpdatingGeneralInfo: false,
    isUpdatingContactInfo: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const changeAvatarRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>(
    user?.avatarUrl || defaultAvatar
  );

  // Fetch and set initial data when first load or refresh signal: roles, user
  useEffect(() => {
    const handleFetchSetInitial = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("User ID is missing.");

        const [fetchedUser] = await Promise.all([
          fetchUser(id),
          roles ? Promise.resolve() : fetchRoles(),
        ]);

        setUser(fetchedUser);

        const copiedUser = structuredClone(fetchedUser); // Avoid direct mutation
        setFormData({
          fullName: { val: copiedUser.fullName },
          avatar: { val: copiedUser.avatarUrl },
          password: { val: "" },
          birth: { val: copiedUser.birth },
          gender: copiedUser.gender,
          isLocked: copiedUser.isLocked,
          roleIds: copiedUser.roles.map((role) => role.id),
          // Contact info
          email: { val: copiedUser.email || "" },
          isEmailVerified: copiedUser.isEmailVerified,
          phoneNumber: { val: copiedUser.phoneNumber || "" },
          isPhoneNumberVerified: copiedUser.isPhoneNumberVerified,
        });
        setAvatarPreviewUrl(copiedUser.avatarUrl || defaultAvatar);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

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
      avatar: { val: null },
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
              val: file,
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
      if (!val && ["email", "phoneNumber", "password"].includes(name)) {
        err = `${capFirstLetter(name)} is required`;
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

  const handleSubmitGeneralInfo = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!user) {
        toast.error("User data is not available.");
        return;
      }
      if (!canEditUser) {
        toast.error("You do not have permission to update user information.");
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
        if (newFormData.avatar.val instanceof File) {
          const imgFileErrs = await getImgFileErrs(
            newFormData.avatar.val,
            "avatar"
          );
          if (imgFileErrs.length) {
            newFormData.avatar.err = `Avatar file is invalid: ${imgFileErrs.join(
              ", "
            )}`;
            allValid = false;
          }
        }
        if (
          newFormData.password.val &&
          !isValidPassword(newFormData.password.val)
        ) {
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
        isUpdatingGeneralInfo: true,
      }));

      if (await validateForm()) {
        const getChangedData = async (): Promise<UserUpdate> => {
          const changedData: UserUpdate = {};

          if (formData.fullName.val !== user.fullName) {
            changedData.fullName = formData.fullName.val;
          }
          if (formData.avatar.val instanceof File) {
            const downloadUrl = await uploadFile(formData.avatar.val, "avatar");
            if (!downloadUrl) throw new Error("Failed to upload avatar image.");
            changedData.avatarUrl = downloadUrl;
          } else if (formData.avatar.val === null && user.avatarUrl) {
            changedData.avatarUrl = null; // Remove avatar
          }
          if (formData.password.val) {
            changedData.password = formData.password.val;
          }
          if (
            getLocalDateString(formData.birth.val) !==
            getLocalDateString(user.birth)
          ) {
            changedData.birth = new Date(formData.birth.val).toISOString();
          }
          if (formData.gender !== user.gender) {
            changedData.gender = formData.gender;
          }
          if (formData.isLocked !== user.isLocked) {
            changedData.isLocked = formData.isLocked;
          }
          if (
            !compareList<string>(
              formData.roleIds,
              user.roles.map((role) => role.id)
            )
          ) {
            changedData.roleIds = formData.roleIds;
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          await updateUser(user.id, changedData);
          toast.success("User general information updated successfully!");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUpdatingGeneralInfo: false,
          }));
        }
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUpdatingGeneralInfo: false,
      }));
    },
    [canEditUser, formData, process.isProcessing, updateUser, user]
  );

  const handleSubmitContactInfo = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!user) {
        toast.error("User data is not available.");
        return;
      }
      if (!canEditUser) {
        toast.error("You do not have permission to update user information.");
        return;
      }

      const validateForm = (): boolean => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

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

        setFormData(newFormData);
        return allValid;
      };

      if (validateForm()) {
        const getChangedData = (): {
          emailData: UserEmailUpdate;
          phoneData: UserPhoneNumberUpdate;
        } => {
          const emailData: UserEmailUpdate = {};
          const phoneData: UserPhoneNumberUpdate = {};

          if (formData.email.val !== user.email) {
            emailData.email = formData.email.val || null;
          }
          if (formData.isEmailVerified !== user.isEmailVerified) {
            emailData.isEmailVerified = formData.isEmailVerified;
          }
          if (formData.phoneNumber.val !== user.phoneNumber) {
            phoneData.phoneNumber = formData.phoneNumber.val || null;
          }
          if (formData.isPhoneNumberVerified !== user.isPhoneNumberVerified) {
            phoneData.isPhoneNumberVerified = formData.isPhoneNumberVerified;
          }

          return { emailData, phoneData };
        };

        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isUpdatingContactInfo: true,
        }));
        
        try {
          const { emailData, phoneData } = getChangedData();
          const emailChanged = Object.keys(emailData).length > 0;
          const phoneChanged = Object.keys(phoneData).length > 0;

          if (!emailChanged && !phoneChanged) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          await Promise.all([
            emailChanged
              ? updateUserEmail(user.id, emailData)
              : Promise.resolve(),
            phoneChanged
              ? updateUserPhoneNumber(user.id, phoneData)
              : Promise.resolve(),
          ]);

          toast.success("User contact information updated successfully!");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUpdatingContactInfo: false,
          }));
        }
      }
    },
    [
      canEditUser,
      formData,
      process.isProcessing,
      updateUserEmail,
      updateUserPhoneNumber,
      user,
    ]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate(-1);
  }, [navigate, process.isProcessing]);

  return (
    <>
      {process.isInitializing ? (
        <EditUserSkeleton />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !roles ? (
        <ApiError errMsg="Roles data not found." />
      ) : !user ? (
        <ApiError errMsg="User data not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Update User #ID ${user.id}`}
            parentTitle="User Management"
            parentLink="/admin/users"
            className="mb-4"
          />

          {/* General Info Form */}
          <form onSubmit={handleSubmitGeneralInfo} className="mb-4">
            <div className="card shadow-sm">
              <div className="card-header card-header-p-g">
                <h2 className="fs-5 mb-0">General Information</h2>
              </div>
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

                    {/* Password */}
                    <div className="mb-3">
                      <label htmlFor="password" className="form-label">
                        New Password
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
                        <FontAwesomeIcon
                          icon={faCircleQuestion}
                          className="ms-2 text-muted"
                          title="System will notify this user about their account lock change via email or phone."
                        />
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

                      {formData.avatar.val && (
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
                        {formData.avatar.val ? "change" : "upload"}
                      </button>
                      {formData.avatar.err && (
                        <InvalidInputMsg msg={formData.avatar.err} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-footer text-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={process.isProcessing}
                >
                  {process.isUpdatingGeneralInfo ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      <output>Saving...</output>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Contact Info Form */}
          <form onSubmit={handleSubmitContactInfo} className="mb-4">
            <div className="card shadow-sm">
              <div className="card-header card-header-p-g">
                <h2 className="fs-5 mb-0">Contact Information</h2>
              </div>
              <div className="card-body">
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

                {/* Announcement */}
                <div className="d-flex align-items-center bg-warning-subtle p-2 rounded">
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    className="me-2 text-warning"
                  />
                  <p className="mb-0 small">
                    <span className="fw-bold">Attention:</span> System will
                    notify the changed user if one of their contact info has
                    been updated.
                  </p>
                </div>
              </div>
              <div className="card-footer text-end">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={process.isProcessing}
                >
                  {process.isUpdatingContactInfo ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      <output>Saving...</output>
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDiscard}
              disabled={process.isProcessing}
            >
              Discard
            </button>
          </div>
        </>
      )}
    </>
  );
}
