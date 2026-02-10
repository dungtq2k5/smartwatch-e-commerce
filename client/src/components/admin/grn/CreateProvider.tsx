import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { isValidPhoneNumber, type E164Number } from "libphonenumber-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import useProviderStore from "../../../store/admin/grn/providerStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  capFirstLetter,
  formatError,
  isValidEmail,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import type { ProviderCreate } from "../../../../../common/types.common";
import { type FormData } from "./EditProvider";
import { DEFAULT_PHONE_COUNTRY_CODE, WAITING_EMOJI } from "../../../configs";
import Label from "../../common/Label";
import Input from "../../common/Input";
import Btn from "../../common/Btn";
import InvalidMsg from "../../common/InvalidInputMsg";
import useProviderWizardStore from "../../../store/admin/wizard/providerWizardStore";
import CreateProviderWizardHeader from "./CreateProviderWizardHeader";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";

type Process = {
  isProcessing: boolean;
  isCreating: boolean;
};

export default function CreateProvider() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateProvider rendered", renderCount.current);

  const navigate = useNavigate();

  const wizard = useProviderWizardStore();
  const { createProvider } = useProviderStore();

  const canCreateProvider = useHasPermission("c_provider_inventory");

  const [formData, setFormData] = useState<FormData>({
    fullName: { val: "" },
    email: { val: "" },
    phoneNumber: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: false,
    isCreating: false,
  });

  const [continueToCreateModal, setContinueToCreateModal] =
    useState<boolean>(false);

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
      if (!canCreateProvider) {
        toast.error("You don't have permission to create provider.");
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
        setProcess({ isProcessing: true, isCreating: true });

        try {
          const provider: ProviderCreate = {
            fullName: formData.fullName.val,
            email: formData.email.val,
            phoneNumber: formData.phoneNumber.val, // Already in E.164 format from PhoneInput
          };

          const createdProvider = await createProvider(provider);

          wizard.setContext({
            providerId: createdProvider.id,
            providerName: createdProvider.fullName,
          });
          toast.success("Provider created successfully.");
          setContinueToCreateModal(true);
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess({ isProcessing: false, isCreating: false });
        }
      }
    },
    [canCreateProvider, createProvider, formData, process.isProcessing, wizard],
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (wizard.isActive) wizard.reset();
    navigate(-1);
  }, [navigate, process.isProcessing, wizard]);

  const handleContinueToCreate = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    const providerId = wizard.context.providerId;
    if (!providerId) {
      toast.error("Created provider data not found in context.");
      return;
    }

    if (!wizard.isActive) wizard.startFlow("provider");
    wizard.nextStep("address");

    navigate(`/admin/providers/${providerId}/addresses/create`, {
      replace: true,
    });
  }, [navigate, process.isProcessing, wizard]);

  return (
    <>
      <CreateProviderWizardHeader
        currStep="provider"
        title="Create new Provider"
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
                  placeholder="Apple Inc."
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
                  placeholder="provider@example.com"
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
                  defaultCountry={DEFAULT_PHONE_COUNTRY_CODE}
                  value={formData.phoneNumber.val}
                  onChange={handlePhoneChange}
                  className={formData.phoneNumber.err ? "is-invalid" : ""}
                  disabled={process.isProcessing}
                  placeholder="+1 234 567 8900"
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
                loading={process.isCreating}
                icon={<FontAwesomeIcon icon={faPlus} />}
              >
                Create Provider
              </Btn>
            </div>
          </form>
        </div>
      </div>

      {/* Modals */}
      <ConfirmSubmitModal
        show={continueToCreateModal}
        onHide={handleDiscard}
        onSubmit={handleContinueToCreate}
        custom={{
          action: "leave",
          title: "Continue creation process",
          body: `Do you want to create an address for the provider "${
            formData.fullName.val || "N/A"
          }" that you have just created?`,
          cancelText: "No, finish creation",
          submitText: "Yes, create address",
        }}
      />
    </>
  );
}
