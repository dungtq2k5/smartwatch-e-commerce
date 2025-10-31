import { useCallback, useRef, useState } from "react";
import {
  AVATAR_ALLOWED_TYPES,
  USER_GENDER_OPTIONS,
} from "../../../../../common/configs.common";
import { AVATAR_HINT_MESSAGE, WAITING_EMOJI } from "../../../configs";
import {
  formatError,
  getLocalDateString,
  isValidBirthDate,
  isValidUserFullName,
  readFileAsDataUrl,
} from "../../../../../common/utils.common";
import defaultAvatar from "../../../assets/default-avatar.webp";
import { useAuthStore } from "../../../store/user/authStore";
import ApiError from "../../common/ApiError";
import type { FormFileInput, FormInput } from "../../../utils/types";
import type { UserSelfGeneralInfoUpdate } from "../../../../../common/types.common";
import { getImgFileErrs, uploadFile } from "../../../utils/utils";
import toast from "react-hot-toast";
import UpdateSelfEmailModal from "../modal/UpdateSelfEmailModal";
import UpdateSelfPhoneModal from "../modal/UpdateSelfPhoneModal";
import { Modal } from "react-bootstrap";
import VerifyForm from "../VerifyForm";
import UpdateSelfPasswordModal from "../modal/UpdateSelfPasswordModal";
import SetSelfPasswordModal from "../modal/SetSelfPasswordModal";
import HorizontalDivider from "../HorizontalDivider";
import { useNavigate } from "react-router-dom";
import InvalidInputMsg from "../../common/InvalidInputMsg";

type FormData = {
  fullName: FormInput;
  gender: (typeof USER_GENDER_OPTIONS)[number];
  birth: FormInput;
  avatar: FormFileInput;
};

type Process = {
  isProcessing: boolean;
  isUpdatingSelfGeneralInfo: boolean;
  isDeletingAccount: boolean;
  isUploadingAvatar: boolean;
};

type ModalUpdate = {
  email: boolean;
  phoneNumber: boolean;
  password: boolean;
  setPassword: boolean;
};

type ModalVerify = Pick<ModalUpdate, "email" | "phoneNumber">;

export default function Profile() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Profile render count:", renderCount.current);

  const { user, updateSelfGeneralInfo, deleteAccount } = useAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: user?.fullName || "Not provided" },
    gender: user?.gender || "other",
    birth: { val: user?.birth || new Date().toISOString() }, // Default to today if not set
    avatar: { file: user?.avatarUrl || null },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: false,
    isUpdatingSelfGeneralInfo: false,
    isDeletingAccount: false,
    isUploadingAvatar: false,
  });

  const changeAvatarRef = useRef<HTMLInputElement | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>(
    user?.avatarUrl || defaultAvatar
  );

  const [modalUpdate, setModalUpdate] = useState<ModalUpdate>({
    email: false,
    phoneNumber: false,
    password: false,
    setPassword: false,
  });

  const [modalVerify, setModalVerify] = useState<ModalVerify>({
    email: false,
    phoneNumber: false,
  });

  // Update avatarPreviewUrl when formData.avatar.file changes
  // useEffect(() => {
  //   const updateAvatarPreview = async (): Promise<void> => {
  //     const avatarFile = formData.avatar.file;

  //     setAvatarPreviewUrl(
  //       avatarFile
  //         ? avatarFile instanceof File
  //           ? ((await readFileAsDataUrl(avatarFile)) as string)
  //           : avatarFile
  //         : defaultAvatar
  //     );
  //   };

  //   updateAvatarPreview();
  // }, [formData.avatar.file]);

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

      const { name, value, type } = e.target;

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

          setFormData((prev) => ({
            ...prev,
            avatar: { file: files[0] },
          }));

          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUploadingAvatar: false,
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
        [name]: { val: value },
      }));
    },
    [process.isProcessing]
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
        if (!newFormData.birth.val) {
          newFormData.birth.err = "Date of birth is required";
          allValid = false;
        } else if (!isValidBirthDate(newFormData.birth.val)) {
          newFormData.birth.err = "Date of birth is invalid";
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

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUpdatingSelfGeneralInfo: true,
      }));
      if (await validateForm()) {
        const getChangedData = async (): Promise<UserSelfGeneralInfoUpdate> => {
          if (!user) {
            throw new Error("User data is not available.");
          }
          const changedData: UserSelfGeneralInfoUpdate = {};

          if (formData.fullName.val !== user.fullName) {
            changedData.fullName = formData.fullName.val;
          }
          if (formData.gender !== user.gender) {
            changedData.gender = formData.gender;
          }
          if (formData.birth.val !== user.birth) {
            changedData.birth = new Date(formData.birth.val).toISOString();
          }
          if (formData.avatar.file instanceof File) {
            const downloadUrl = await uploadFile(
              formData.avatar.file,
              "avatar"
            );
            if (!downloadUrl) throw new Error("Failed to upload avatar.");
            changedData.avatarUrl = downloadUrl;
          } else if (formData.avatar.file === null && user.avatarUrl) {
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
        }
      }
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUpdatingSelfGeneralInfo: false,
      }));
    },
    [formData, process.isProcessing, updateSelfGeneralInfo, user]
  );

  const closeModal = useCallback((): void => {
    setModalUpdate({
      email: false,
      phoneNumber: false,
      password: false,
      setPassword: false,
    });
    setModalVerify({
      email: false,
      phoneNumber: false,
    });
  }, []);

  const handleDeleteAccount = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isDeletingAccount: true,
    }));
    try {
      await deleteAccount();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isDeletingAccount: false,
      }));
    }
  }, [deleteAccount, navigate, process.isProcessing]);

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

            <div className="row pt-4 border-top">
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
                    <InvalidInputMsg msg={formData.fullName.err} />
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
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setModalUpdate((prev) => ({
                          ...prev,
                          email: true,
                        }))
                      }
                      disabled={process.isProcessing}
                    >
                      change
                    </button>
                    {user.email && !user.isEmailVerified && (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={() =>
                          setModalVerify((prev) => ({
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
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        setModalUpdate((prev) => ({
                          ...prev,
                          phoneNumber: true,
                        }))
                      }
                      disabled={process.isProcessing}
                    >
                      change
                    </button>
                    {user.phoneNumber && !user.isPhoneNumberVerified && (
                      <button
                        type="button"
                        className="btn btn-warning"
                        onClick={() =>
                          setModalVerify((prev) => ({
                            ...prev,
                            phoneNumber: true,
                          }))
                        }
                        disabled={process.isProcessing}
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
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            setModalUpdate((prev) => ({
                              ...prev,
                              password: true,
                            }))
                          }
                          disabled={process.isProcessing}
                        >
                          change
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="form-text mb-2">
                        You signed up using{" "}
                        <span className="text-capitalize">
                          {user.authProvider}
                        </span>
                        . You can set a password to enable logging in with your
                        email as well.
                      </p>
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        onClick={() =>
                          setModalUpdate((prev) => ({
                            ...prev,
                            setPassword: true,
                          }))
                        }
                        disabled={process.isProcessing}
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
                    value={getLocalDateString(formData.birth.val)}
                    onChange={handleChange}
                  />
                  {formData.birth.err && (
                    <InvalidInputMsg msg={formData.birth.err} />
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
                  <label htmlFor="avatar" className="form-label">
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
                    disabled={process.isProcessing}
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

            <button
              type="submit"
              className="btn btn-primary mt-4"
              disabled={process.isProcessing}
            >
              {process.isUpdatingSelfGeneralInfo ? (
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
              disabled={process.isProcessing}
            >
              {process.isDeletingAccount ? (
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
          <UpdateSelfEmailModal show={modalUpdate.email} onHide={closeModal} />
          <UpdateSelfPhoneModal
            show={modalUpdate.phoneNumber}
            onHide={closeModal}
          />
          <UpdateSelfPasswordModal
            show={modalUpdate.password}
            onHide={closeModal}
          />
          <SetSelfPasswordModal
            show={modalUpdate.setPassword}
            onHide={closeModal}
          />

          {/* Modals for verifying email and phone number */}
          <Modal show={modalVerify.email} onHide={closeModal} centered>
            <Modal.Header closeButton></Modal.Header>
            <VerifyForm type="email" onSuccess={closeModal} />
          </Modal>

          <Modal show={modalVerify.phoneNumber} onHide={closeModal} centered>
            <Modal.Header closeButton></Modal.Header>
            <VerifyForm type="phoneNumber" onSuccess={closeModal} />
          </Modal>
        </>
      )}
    </>
  );
}
