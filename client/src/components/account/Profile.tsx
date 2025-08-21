import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AVATAR_ALLOWED_TYPES,
  USER_GENDER_OPTIONS,
} from "../../../../common/configs.common";
import { AVATAR_HINT_MESSAGE } from "../../configs";
import {
  capFirstLetter,
  convertUtcToLocalISOString,
  isValidAvatar,
  isValidBirthDate,
  isValidUserFullName,
  readFileAsDataUrl,
} from "../../../../common/utils.common";
import defaultAvatar from "../../assets/default-avatar.webp";
import { useAuthStore } from "../../store/authStore";
import ApiError from "../ApiError";
import type { FormFileInput, FormInput } from "../../utils/types";
import type { UserUpdateSelfGeneralInfo } from "../../../../common/types.common";
import { formatError, uploadFile } from "../../utils/utils";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import UpdateSelfEmailModal from "../modal/UpdateSelfEmailModal";
import UpdateSelfPhoneModal from "../modal/UpdateSelfPhoneModal";
import { Modal } from "react-bootstrap";
import VerifyForm from "../VerifyForm";
import UpdateSelfPasswordModal from "../modal/UpdateSelfPasswordModal";
import SetSelfPasswordModal from "../modal/SetSelfPasswordModal";
import HorizontalDivider from "../HorizontalDivider";
import { useNavigate } from "react-router-dom";

type FormData = {
  fullName: FormInput;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  birth: FormInput;
  avatar: FormFileInput;
};

type ModalUpdateState = {
  email: boolean;
  phoneNumber: boolean;
  password: boolean;
  setPassword: boolean;
};

type ModalVerifyState = Pick<ModalUpdateState, "email" | "phoneNumber">;

export default function Profile() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Profile render count:", renderCount.current);

  const {
    user,
    isLoading,
    isDeleting,
    startLoading,
    stopLoading,
    updateSelfGeneralInfo,
    deleteAccount,
  } = useAuthStore();
  const navigate = useNavigate();

  const originalBirthDate = useMemo(
    () =>
      convertUtcToLocalISOString(user?.birth || new Date().toString()).slice(
        0,
        10
      ),
    [user?.birth]
  );

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: user?.fullName || "Not provided" },
    gender: user?.gender || "other",
    birth: { val: originalBirthDate },
    avatar: { file: user?.avatarUrl || defaultAvatar },
  });

  const changeAvatarRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>(
    user?.avatarUrl || defaultAvatar
  );

  const [modalUpdateState, setModalUpdateState] = useState<ModalUpdateState>({
    email: false,
    phoneNumber: false,
    password: false,
    setPassword: false,
  });

  const [modalVerifyState, setModalVerifyState] = useState<ModalVerifyState>({
    email: false,
    phoneNumber: false,
  });

  // Update avatarPreviewUrl when formData.avatar.file changes
  useEffect(() => {
    const updateAvatarPreview = async (): Promise<void> => {
      const avatarFile = formData.avatar.file;

      setAvatarPreviewUrl(
        avatarFile
          ? avatarFile instanceof File
            ? ((await readFileAsDataUrl(avatarFile)) as string)
            : avatarFile
          : defaultAvatar
      );
    };

    updateAvatarPreview();
  }, [formData.avatar.file]);

  const handleRemoveAvatar = useCallback((): void => {
    setFormData((prev) => ({
      ...prev,
      avatar: {
        file: null,
        err: undefined,
      },
    }));
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const { name, value, type } = e.target;

      if (type === "file") {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          setFormData((prev) => ({
            ...prev,
            [name]: { file: files[0], err: undefined },
          }));
        }
        return;
      }

      if (type === "radio") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: { val: value, err: undefined },
      }));
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

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
        if (!newFormData.birth.val) {
          newFormData.birth.err = "Date of birth is required";
          allValid = false;
        } else if (!isValidBirthDate(newFormData.birth.val)) {
          newFormData.birth.err = "Date of birth is invalid";
          allValid = false;
        }
        if (
          newFormData.avatar.file instanceof File &&
          (await isValidAvatar(newFormData.avatar.file)).length
        ) {
          newFormData.avatar.err = "Avatar file is invalid";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      startLoading();
      if (await validateForm()) {
        const getChangedData = async (): Promise<UserUpdateSelfGeneralInfo> => {
          const changedData: UserUpdateSelfGeneralInfo = {};
          if (formData.fullName.val !== user?.fullName) {
            changedData.fullName = formData.fullName.val;
          }
          if (formData.gender !== user?.gender) {
            changedData.gender = formData.gender;
          }
          if (formData.birth.val !== originalBirthDate) {
            changedData.birth = formData.birth.val;
          }
          if (formData.avatar.file instanceof File) {
            const downloadUrl = await uploadFile(
              formData.avatar.file,
              "avatar"
            );
            if (!downloadUrl) throw new Error("Failed to upload avatar");
            changedData.avatarUrl = downloadUrl;
          } else if (formData.avatar.file === null && user?.avatarUrl) {
            changedData.avatarUrl = null; // Remove avatar
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          await updateSelfGeneralInfo(await getChangedData());
          toast.success("Profile updated successfully!");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          stopLoading();
        }
        return;
      }
      stopLoading();
    },
    [
      formData,
      originalBirthDate,
      startLoading,
      stopLoading,
      updateSelfGeneralInfo,
      user?.avatarUrl,
      user?.fullName,
      user?.gender,
    ]
  );

  const closeModal = useCallback((): void => {
    setModalUpdateState({
      email: false,
      phoneNumber: false,
      password: false,
      setPassword: false,
    });
    setModalVerifyState({
      email: false,
      phoneNumber: false,
    });
  }, []);

  const handleDeleteAccount = useCallback(async (): Promise<void> => {
    try {
      await deleteAccount();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [deleteAccount, navigate]);

  return (
    <>
      {!user ? (
        <ApiError errMsg="User data is not available." />
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <div>
              <h1 className="h3 card-title mb-0">My Profile</h1>
              <p className="text-muted m-0">Manage your profile settings.</p>
            </div>
            <div className="mt-2 mb-4">
              <HorizontalDivider />
            </div>

            <div className="row">
              <div className="col-md-8">
                {/* Full name */}
                <div className="mb-3">
                  <label htmlFor="fullName" className="form-label">
                    Full name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    className="form-control"
                    placeholder={user.fullName}
                    value={formData.fullName.val}
                    onChange={handleChange}
                  />
                  {formData.fullName.err && (
                    <div className="text-danger small mt-1">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
                      {formData.fullName.err}
                    </div>
                  )}
                </div>
                {/* Email */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email
                    {user.email &&
                      (user.isEmailVerified ? (
                        <span className="badge bg-success ms-2">verified</span>
                      ) : (
                        <span className="badge bg-warning text-dark ms-2">
                          not verified
                        </span>
                      ))}
                  </label>
                  <div className="input-group">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      value={user.email || "Not provided"}
                      autoComplete="email"
                      disabled
                    />
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() =>
                        setModalUpdateState((prev) => ({
                          ...prev,
                          email: true,
                        }))
                      }
                      disabled={isLoading}
                    >
                      change
                    </button>
                    {user.email && !user.isEmailVerified && (
                      <button
                        className="btn btn-warning"
                        type="button"
                        onClick={() =>
                          setModalVerifyState((prev) => ({
                            ...prev,
                            email: true,
                          }))
                        }
                      >
                        verify
                      </button>
                    )}
                  </div>
                </div>
                {/* Phone number */}
                <div className="mb-3">
                  <label htmlFor="phoneNumber" className="form-label">
                    Phone number
                    {user.phoneNumber &&
                      (user.isPhoneNumberVerified ? (
                        <span className="badge bg-success ms-2">verified</span>
                      ) : (
                        <span className="badge bg-warning text-dark ms-2">
                          not verified
                        </span>
                      ))}
                  </label>
                  <div className="input-group">
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      className="form-control"
                      autoComplete="tel"
                      value={user.phoneNumber || "Not provided"}
                      disabled
                    />
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() =>
                        setModalUpdateState((prev) => ({
                          ...prev,
                          phoneNumber: true,
                        }))
                      }
                      disabled={isLoading}
                    >
                      change
                    </button>
                    {user.phoneNumber && !user.isPhoneNumberVerified && (
                      <button
                        className="btn btn-warning"
                        type="button"
                        onClick={() =>
                          setModalVerifyState((prev) => ({
                            ...prev,
                            phoneNumber: true,
                          }))
                        }
                      >
                        verify
                      </button>
                    )}
                  </div>
                </div>
                {/* Password */}
                <div className="mb-3">
                  {user.authProvider === "local" ? (
                    <>
                      <label htmlFor="password" className="form-label">
                        Password
                      </label>
                      <div className="input-group">
                        <input
                          type="password"
                          id="password"
                          name="password"
                          className="form-control"
                          value="********"
                          disabled
                        />
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() =>
                            setModalUpdateState((prev) => ({
                              ...prev,
                              password: true,
                            }))
                          }
                          disabled={isLoading}
                        >
                          change
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="form-text mb-2">
                        You signed up using {capFirstLetter(user.authProvider)}.
                        You can set a password to enable logging in with your
                        email as well.
                      </p>
                      <button
                        className="btn btn-link p-0"
                        type="button"
                        onClick={() =>
                          setModalUpdateState((prev) => ({
                            ...prev,
                            setPassword: true,
                          }))
                        }
                        disabled={isLoading}
                      >
                        set password
                      </button>
                    </>
                  )}
                </div>
                {/* Gender */}
                <div className="mb-3">
                  <p className="form-label d-block">Gender</p>
                  {USER_GENDER_OPTIONS.map((option) => (
                    <div className="form-check form-check-inline" key={option}>
                      <input
                        type="radio"
                        id={option}
                        name="gender"
                        value={option}
                        className="form-check-input"
                        defaultChecked={user.gender === option}
                        onChange={handleChange}
                      />
                      <label
                        htmlFor={option}
                        className="form-check-label text-capitalize"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
                {/* Date of birth */}
                <div className="mb-3">
                  <label htmlFor="birth" className="form-label">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    id="birth"
                    name="birth"
                    className="form-control"
                    value={formData.birth.val}
                    onChange={handleChange}
                  />
                  {formData.birth.err && (
                    <div className="text-danger small mt-1">
                      <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
                      {formData.birth.err}
                    </div>
                  )}
                </div>
              </div>
              {/* Avatar */}
              <div className="col-md-4 text-center">
                <img
                  src={avatarPreviewUrl}
                  alt="Avatar Preview"
                  className="avatar--g avatar--lg--g mb-3"
                  loading="lazy"
                />

                <div hidden aria-hidden>
                  <label
                    htmlFor="avatar"
                    className="form-label"
                    hidden
                    aria-hidden
                  >
                    Avatar
                  </label>
                  <input
                    type="file"
                    id="avatar"
                    name="avatar"
                    className="form-control"
                    accept={AVATAR_ALLOWED_TYPES.join(", ")}
                    ref={changeAvatarRef}
                    aria-describedby="avatarHelp"
                    onChange={handleChange}
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
                    disabled={isLoading}
                  >
                    remove
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-link p-0"
                  onClick={() => changeAvatarRef.current?.click()}
                  disabled={isLoading}
                >
                  {formData.avatar.file ? "change" : "upload"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-4"
              disabled={isLoading}
            >
              {isLoading ? (
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
          </form>

          {/* Danger Zone */}
          <div className="mt-5">
            <h2 className="h3 text-danger m-0">Danger Zone</h2>
            <div className="mt-2 mb-4">
              <HorizontalDivider />
            </div>
            <p className="">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  ></span>
                  <output>Deleting...</output>
                </>
              ) : (
                "Delete My Account"
              )}
            </button>
          </div>

          {/* Modals for changing email, phone number, password and set password */}
          <UpdateSelfEmailModal
            show={modalUpdateState.email}
            onHide={closeModal}
          />
          <UpdateSelfPhoneModal
            show={modalUpdateState.phoneNumber}
            onHide={closeModal}
          />
          <UpdateSelfPasswordModal
            show={modalUpdateState.password}
            onHide={closeModal}
          />
          <SetSelfPasswordModal
            show={modalUpdateState.setPassword}
            onHide={closeModal}
          />

          {/* Modals for verifying email and phone number */}
          <Modal show={modalVerifyState.email} onHide={closeModal} centered>
            <Modal.Header closeButton></Modal.Header>
            <VerifyForm type="email" onSuccess={closeModal} />
          </Modal>

          <Modal
            show={modalVerifyState.phoneNumber}
            onHide={closeModal}
            centered
          >
            <Modal.Header closeButton></Modal.Header>
            <VerifyForm type="phoneNumber" onSuccess={closeModal} />
          </Modal>
        </>
      )}
    </>
  );
}
