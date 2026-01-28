import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useInstanceStore from "../../../store/admin/product/instanceStore";
import useInstanceConditionStore from "../../../store/admin/product/instanceConditionStore";
import useVariationStore from "../../../store/admin/product/variationStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { FormInput } from "../../../utils/types";
import type {
  ModelVariationResponse,
  VariationInstanceCreate,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { WAITING_EMOJI } from "../../../configs";
import toast from "react-hot-toast";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import CreateInstanceSkeleton from "../skeleton/CreateInstanceSkeleton";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isCreating: boolean;
};

export type FormData = {
  supplierSerialNumber: FormInput;
  supplierImeiNumber: FormInput;
  conditionId: FormInput<string, undefined>;
  isActive: FormInput<boolean, undefined>;
};

export default function CreateInstance() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateInstance render count:", renderCount.current);

  const { variationId } = useParams();

  const navigate = useNavigate();

  const { createInstance } = useInstanceStore();
  const { instanceConditions, fetchInstanceConditions } =
    useInstanceConditionStore();
  const { fetchVariationLite } = useVariationStore();

  const canCreateInstance = useHasPermission("c_variation_instance");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isCreating: false,
  });

  const [variation, setVariation] = useState<ModelVariationResponse | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>({
    supplierSerialNumber: { val: "" },
    supplierImeiNumber: { val: "" },
    conditionId: { val: "" },
    isActive: { val: true },
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch set data on initial load: instance conditions, variation
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!variationId) throw new Error("Variation ID is missing.");

        const [fetchedVariation, fetchedInstanceConditions] = await Promise.all(
          [
            fetchVariationLite(variationId),
            instanceConditions
              ? Promise.resolve(instanceConditions)
              : fetchInstanceConditions(),
          ]
        );

        setVariation(fetchedVariation);
        setFormData((prev) => ({
          ...prev,
          conditionId: {
            val: fetchedInstanceConditions.conditions[0]?.id || "",
          },
        }));
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
  }, []);

  const handleChange = useCallback(
    (e: React.FormEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (process.isProcessing) return;

      const { name, value: val, type } = e.currentTarget;

      if (type === "checkbox") {
        setFormData((prev) => ({
          ...prev,
          [name]: { val: (e.target as HTMLInputElement).checked },
        }));
        return;
      }

      setFormData((prev) => {
        let err = "";
        if (!val && name === "supplierSerialNumber") {
          err = "Supplier serial number is required.";
        } else if (
          name === "supplierImeiNumber" &&
          val &&
          !removeOddSpaces(val)
        ) {
          err = "IMEI number is invalid.";
        }

        return {
          ...prev,
          [name]: { val, err },
        };
      });
    },
    [process.isProcessing]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!variationId) {
        setApiErr("Variation ID is missing.");
        return;
      }
      if (!canCreateInstance) {
        setApiErr("You do not have permission to create a variation instance.");
        return;
      }

      const validateForm = (): boolean => {
        let allValid = true;
        const updatedFormData: FormData = { ...formData };

        const { supplierSerialNumber, supplierImeiNumber } = formData;

        if (!supplierSerialNumber.val) {
          updatedFormData.supplierSerialNumber.err =
            "Supplier serial number is required.";
          allValid = false;
        } else if (!removeOddSpaces(supplierSerialNumber.val)) {
          updatedFormData.supplierSerialNumber.err =
            "Supplier serial number is invalid.";
          allValid = false;
        }
        if (
          supplierImeiNumber.val &&
          !removeOddSpaces(supplierImeiNumber.val)
        ) {
          updatedFormData.supplierImeiNumber.err = "IMEI number is invalid.";
          allValid = false;
        }

        setFormData(updatedFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreating: true,
      }));

      if (validateForm()) {
        try {
          const instance: VariationInstanceCreate = {
            modelVariationId: variationId,
            supplierSerialNumber: formData.supplierSerialNumber.val,
            supplierImeiNumber: formData.supplierImeiNumber.val || null,
            conditionId: formData.conditionId.val,
            isActive: formData.isActive.val,
          };

          const createdInstance = await createInstance(instance);
          toast.success("Variation instance created successfully.");
          navigate(
            `/admin/variation-instances?searchTerm=${createdInstance.id}`
          );
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
    [
      canCreateInstance,
      createInstance,
      formData,
      navigate,
      process.isProcessing,
      variationId,
    ]
  );

  return (
    <>
      {process.isInitializing ? (
        <CreateInstanceSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !instanceConditions ? (
        <ApiError errorMessage="Instance conditions data not found." />
      ) : !variation ? (
        <ApiError errorMessage="Variation data not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Manually create Instance for ${variation.name}`}
            parentTitle="Instance Management"
            parentLink="/admin/variation-instances"
            className="mb-4"
          />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left Column */}
              <div className="col-lg-8">
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">General Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label
                        htmlFor="supplierSerialNumber"
                        className="form-label"
                      >
                        Supplier Serial Number
                      </label>
                      <input
                        type="text"
                        name="supplierSerialNumber"
                        id="supplierSerialNumber"
                        className="form-control"
                        placeholder="A90X-U234PQR500"
                        value={formData.supplierSerialNumber.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        autoComplete="off"
                      />
                      {formData.supplierSerialNumber.err && (
                        <InvalidInputMsg
                          msg={formData.supplierSerialNumber.err}
                        />
                      )}
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="supplierImeiNumber"
                        className="form-label"
                      >
                        Supplier IMEI Number
                      </label>
                      <input
                        type="text"
                        name="supplierImeiNumber"
                        id="supplierImeiNumber"
                        className="form-control"
                        placeholder="356938035643809"
                        value={formData.supplierImeiNumber.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        autoComplete="off"
                      />
                      {formData.supplierImeiNumber.err && (
                        <InvalidInputMsg
                          msg={formData.supplierImeiNumber.err}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Status & Condition</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="conditionId" className="form-label">
                        Condition
                      </label>
                      <select
                        name="conditionId"
                        id="conditionId"
                        className="form-select"
                        value={formData.conditionId.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      >
                        {instanceConditions.conditions.map((condition) => (
                          <option key={condition.id} value={condition.id}>
                            {condition.name} -{" "}
                            {condition.description.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        name="isActive"
                        id="isActive"
                        checked={formData.isActive.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      <label className="form-check-label" htmlFor="isActive">
                        Active
                      </label>
                      <FontAwesomeIcon
                        icon={faQuestionCircle}
                        className="ms-2 text-muted"
                        title="If disabled, this instance won't be available for sale."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
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
                Create
              </Btn>
            </div>
          </form>
        </>
      )}
    </>
  );
}
