import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useInstanceStore from "../../../store/admin/product/instanceStore";
import { type FormData } from "./CreateInstance";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  VariationInstanceResponse,
  VariationInstanceUpdate,
} from "../../../../../common/types.common";
import useInstanceConditionStore from "../../../store/admin/product/instanceConditionStore";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import CreateInstanceSkeleton from "../skeleton/CreateInstanceSkeleton";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

export default function EditInstance() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("EditInstance render count:", renderCount.current);

  const { id } = useParams();

  const navigate = useNavigate();

  const { instanceConditions, fetchInstanceConditions } =
    useInstanceConditionStore();
  const { fetchInstance, updateInstance } = useInstanceStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const canEditInstance = useHasPermission("u_variation_instance");

  const [instance, setInstance] = useState<VariationInstanceResponse | null>(
    null,
  );
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    supplierSerialNumber: { val: "" },
    supplierImeiNumber: { val: "" },
    conditionId: { val: "" },
    isActive: { val: false },
  });

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
        if (!id) throw new Error("Instance ID is missing.");

        const [fetchedInstance] = await Promise.all([
          fetchInstance(id),
          instanceConditions ? Promise.resolve() : fetchInstanceConditions(),
        ]);

        setInstance(fetchedInstance);
        updateFormData(fetchedInstance);
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

  const updateFormData = useCallback(
    (instance: VariationInstanceResponse): void => {
      setFormData((prev) => ({
        ...prev,
        supplierSerialNumber: { val: instance.supplierSerialNumber },
        supplierImeiNumber: { val: instance.supplierImeiNumber || "" },
        conditionId: { val: instance.conditionId },
        isActive: { val: instance.isActive },
      }));
    },
    [],
  );

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
        let err = undefined;
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
    [process.isProcessing],
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
      if (!instance) {
        toast.error("Instance data not found.");
        return;
      }
      if (!canEditInstance) {
        setApiErr("You do not have permission to edit instance.");
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
        isUpdating: true,
      }));

      if (validateForm()) {
        const getChangedData = (): VariationInstanceUpdate => {
          const changedData: VariationInstanceUpdate = {};

          if (
            formData.supplierSerialNumber.val !== instance.supplierSerialNumber
          ) {
            changedData.supplierSerialNumber =
              formData.supplierSerialNumber.val;
          }
          if (
            formData.supplierImeiNumber.val !==
            (instance.supplierImeiNumber || "")
          ) {
            changedData.supplierImeiNumber =
              formData.supplierImeiNumber.val || null;
          }
          if (formData.conditionId.val !== instance.conditionId) {
            changedData.conditionId = formData.conditionId.val;
          }
          if (formData.isActive.val !== instance.isActive) {
            changedData.isActive = formData.isActive.val;
          }

          return changedData;
        };

        try {
          const changedData = getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes made. No update needed.");
            return;
          }

          const updatedInstance = await updateInstance(
            instance.id,
            changedData,
          );

          setInstance(updatedInstance);
          updateFormData(updatedInstance);

          toast.success("Instance updated successfully.");
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

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUpdating: false,
      }));
    },
    [
      canEditInstance,
      formData,
      instance,
      process.isProcessing,
      updateFormData,
      updateInstance,
    ],
  );

  return (
    <>
      {process.isInitializing ? (
        <CreateInstanceSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !instanceConditions ? (
        <ApiError errorMessage="Instance conditions data not found." />
      ) : !instance ? (
        <ApiError errorMessage="Instance data not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Edit Instance #ID ${instance.id}`}
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
                        placeholder={instance.supplierSerialNumber}
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
                        placeholder={instance.supplierImeiNumber || "None"}
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

                {/* Additional Info Card */}
                <div className="card shadow-sm">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Additional Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="id" className="form-label">
                          ID
                        </label>
                        <input
                          type="text"
                          id="id"
                          className="form-control"
                          value={instance.id}
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="inactiveAt" className="form-label">
                          Inactive at
                        </label>
                        <input
                          type="text"
                          id="inactiveAt"
                          className="form-control"
                          value={
                            instance.inactiveAt
                              ? new Date(instance.inactiveAt).toLocaleString()
                              : "N/A"
                          }
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="createdAt" className="form-label">
                          Created at
                        </label>
                        <input
                          type="text"
                          id="createdAt"
                          className="form-control"
                          value={new Date(instance.createdAt).toLocaleString()}
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="updatedAt" className="form-label">
                          Updated at
                        </label>
                        <input
                          type="text"
                          id="updatedAt"
                          className="form-control"
                          value={new Date(instance.updatedAt).toLocaleString()}
                          disabled
                        />
                      </div>
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
                loading={process.isUpdating}
              >
                Update
              </Btn>
            </div>
          </form>
        </>
      )}
    </>
  );
}
