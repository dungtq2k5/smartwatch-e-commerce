import {
  isValidPhoneNumber,
  type CountryCode,
  type E164Number,
} from "libphonenumber-js";
import type { FormInput } from "../../../utils/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProviderStore from "../../../store/admin/grn/providerStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { WAITING_EMOJI } from "../../../configs";
import type {
  ProviderResponse,
  ProviderUpdate,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
  getCountryFromPhoneNumber,
  isValidEmail,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import Title from "../Title";
import ApiError from "../../common/ApiError";
import Label from "../../common/Label";
import Input from "../../common/Input";
import InvalidMsg from "../../common/InvalidInputMsg";
import Btn from "../../common/Btn";
import PhoneInput from "react-phone-number-input";
import useRefreshStore from "../../../store/admin/refreshStore";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

export type FormData = {
  fullName: FormInput;
  email: FormInput;
  phoneNumber: FormInput;
};

export default function EditProvider() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("EditProvider rendered", renderCount.current);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchProvider, updateProvider } = useProviderStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const canEditProvider = useHasPermission("u_provider_inventory");

  const [provider, setProvider] = useState<
    (ProviderResponse & { countryCode?: CountryCode }) | null
  >(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    email: { val: "" },
    phoneNumber: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch set data on initial load: provider
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) {
          throw new Error("Provider ID is missing.");
        }

        const fetchedProvider = await fetchProvider(id);
        setProvider({
          ...fetchedProvider,
          countryCode: getCountryFromPhoneNumber(fetchedProvider.phoneNumber)
            ?.code,
        });

        const copiedProvider = structuredClone(fetchedProvider); // Avoid direct mutation
        setFormData({
          fullName: { val: copiedProvider.fullName },
          email: { val: copiedProvider.email },
          phoneNumber: { val: copiedProvider.phoneNumber },
        });
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

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (process.isProcessing) return;

      const { name, value: val } = e.target;

      let err = undefined;
      if (!val) {
        err = `${capFirstLetter(name)} is required`;
      } else if (name === "fullName" && !removeOddSpaces(val)) {
        err = "Full name is invalid";
      } else if (name === "email" && !isValidEmail(val)) {
        err = "Email is invalid";
      }

      setFormData((prev) => ({
        ...prev,
        [name]: { val, err },
      }));
    },
    [process.isProcessing],
  );

  const handlePhoneChange = useCallback(
    (val?: E164Number) => {
      if (process.isProcessing) return;

      setFormData((prev) => ({
        ...prev,
        phoneNumber: {
          val: val || "",
          err: !val
            ? "Phone number is required"
            : !isValidPhoneNumber(val)
              ? "Phone number is invalid"
              : undefined,
        },
      }));
    },
    [process.isProcessing],
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
      if (!provider) {
        toast.error("Provider data is not available.");
        return;
      }
      if (!canEditProvider) {
        toast.error("You don't have permission to edit provider.");
        return;
      }

      const validateForm = (): boolean => {
        let isValid = true;
        const newFormData: FormData = { ...formData };

        if (!formData.fullName.val) {
          isValid = false;
          newFormData.fullName.err = "Full name is required";
        } else if (!removeOddSpaces(formData.fullName.val)) {
          isValid = false;
          newFormData.fullName.err = "Full name is invalid";
        }
        if (!formData.email.val) {
          isValid = false;
          newFormData.email.err = "Email is required";
        } else if (!isValidEmail(formData.email.val)) {
          isValid = false;
          newFormData.email.err = "Email is invalid";
        }
        if (!formData.phoneNumber.val) {
          isValid = false;
          newFormData.phoneNumber.err = "Phone number is required";
        } else if (!isValidPhoneNumber(formData.phoneNumber.val)) {
          isValid = false;
          newFormData.phoneNumber.err = "Phone number is invalid";
        }

        setFormData(newFormData);
        return isValid;
      };

      if (validateForm()) {
        const getChangedData = (): ProviderUpdate => {
          const changedData: ProviderUpdate = {};

          if (provider.fullName !== formData.fullName.val) {
            changedData.fullName = formData.fullName.val;
          }
          if (provider.email !== formData.email.val) {
            changedData.email = formData.email.val;
          }
          if (provider.phoneNumber !== formData.phoneNumber.val) {
            changedData.phoneNumber = formData.phoneNumber.val;
          }

          return changedData;
        };

        setProcess((prev) => ({
          ...prev,
          isProcessing: true,
          isUpdating: true,
        }));
        try {
          const changedData = getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No updated needed.");
            return;
          }

          await updateProvider(provider.id, changedData);
          toast.success("Provider updated successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUpdating: false,
          }));
        }
      }
    },
    [canEditProvider, formData, process.isProcessing, provider, updateProvider],
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

  // TODO Display uneditable fields: createdAt, createdBy, updatedAt.
  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO Loading skeleton
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !provider ? (
        <ApiError errorMessage="Provider data not found." />
      ) : (
        <>
          <Title
            title={`Update Provider #ID ${provider.id}`}
            parentTitle="Provider Management"
            parentLink="/admin/providers"
            className="mb-4"
          />

          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="row">
                  <div className="mb-3">
                    <Label htmlFor="fullName" required>
                      Full Name
                    </Label>
                    <Input
                      type="text"
                      id="fullName"
                      name="fullName"
                      className="form-control"
                      placeholder={provider.fullName}
                      value={formData.fullName.val}
                      onChange={handleChange}
                      disabled={process.isProcessing}
                      required
                      error={formData.fullName.err}
                      autoComplete="off"
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <Label htmlFor="email" required>
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control"
                      placeholder={provider.email}
                      value={formData.email.val}
                      onChange={handleChange}
                      disabled={process.isProcessing}
                      required
                      error={formData.email.err}
                      autoComplete="email"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="mb-3">
                    <Label htmlFor="phoneNumber" required>
                      Phone Number
                    </Label>
                    <PhoneInput
                      id="phoneNumber"
                      name="phoneNumber"
                      defaultCountry={provider.countryCode}
                      value={formData.phoneNumber.val}
                      onChange={handlePhoneChange}
                      className={formData.phoneNumber.err ? "is-invalid" : ""}
                      disabled={process.isProcessing}
                      placeholder={provider.phoneNumber}
                      international // Force E.164 format
                    />
                    {formData.phoneNumber.err && (
                      <InvalidMsg msg={formData.phoneNumber.err} />
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDiscard}
                    disabled={process.isProcessing}
                  >
                    Discard
                  </button>
                  <Btn
                    type="submit"
                    className="btn btn-primary"
                    disabled={process.isProcessing}
                    loading={process.isUpdating}
                  >
                    Update Provider
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
