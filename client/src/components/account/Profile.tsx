import { useRef } from "react";
import {
  AVATAR_ALLOWED_TYPES,
  AVATAR_HINT_MESSAGE,
  USER_GENDER_OPTIONS,
} from "../../../../common/configs.common";
import { convertUtcToLocalISOString } from "../../../../common/utils.common";
import type { UserResponse } from "../../../../common/types.common";
import defaultAvatar from "../../assets/default-avatar.webp";

export default function Profile() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Profile render count:", renderCount.current);

  // DEV mock user data
  const user: UserResponse = {
    id: "12345",
    fullName: "John Doe",
    avatarUrl: undefined,
    isEmailVerified: true,
    isPhoneNumberVerified: false,
    birth: "1999-01-01T00:00:00Z", // ISO 8601 format
    gender: "male",
    stripeCustomerId: undefined,
    userBalanceCents: 10000, // in cents
    lastLogin: "2023-10-01T12:00:00Z",
    createdAt: "2023-01-01T12:00:00Z",
    updatedAt: "2023-10-01T12:00:00Z",
    email: "dungtq2k5@gmail.com",
    phoneNumber: undefined,
  };

  return (
    <form>
      <h1 className="h3 card-title mb-0">My Profile</h1>
      <p className="text-muted mb-4">Manage your profile settings.</p>

      <div className="row">
        <div className="col-md-8">
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
              defaultValue={user.fullName}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <div className="input-group">
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                defaultValue={user.email || "Not provided"}
                autoComplete="email"
                disabled
              />
              <button className="btn btn-outline-secondary" type="button">
                Change
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="phoneNumber" className="form-label">
              Phone number
            </label>
            <div className="input-group">
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                className="form-control"
                autoComplete="tel"
                defaultValue={user.phoneNumber || "Not provided"}
                disabled
              />
              <button className="btn btn-outline-secondary" type="button">
                Change
              </button>
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="input-group">
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                defaultValue="********"
                disabled
              />
              <button className="btn btn-outline-secondary" type="button">
                Change
              </button>
            </div>
          </div>
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
          <div className="mb-3">
            <label htmlFor="birth" className="form-label">
              Date of birth
            </label>
            <input
              type="date"
              id="birth"
              name="birth"
              className="form-control"
              defaultValue={convertUtcToLocalISOString(user.birth).slice(0, 10)}
            />
          </div>
        </div>
        <div className="col-md-4 text-center">
          <label htmlFor="avatar" className="form-label" hidden aria-hidden>
            Avatar
          </label>
          <img
            src={user.avatarUrl ?? defaultAvatar}
            alt="Avatar Preview"
            className="avatar--g avatar--lg--g mb-3"
          />
          <input
            type="file"
            id="avatar"
            name="avatar"
            className="form-control"
            accept={AVATAR_ALLOWED_TYPES.join(", ")}
            aria-describedby="avatarHelp"
          />
          <div id="avatarHelp" className="form-text">
            {AVATAR_HINT_MESSAGE}
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary mt-4">
        Save Changes
      </button>
    </form>
  );
}
