import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGrnStateStore from "../../../store/admin/grn/grnStateStore";
import useInventoryMovementTypeStore from "../../../store/admin/grn/inventoryMovementTypeStore";
import useGrnStore from "../../../store/admin/grn/grnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  GrnResponse,
  GrnUpdate,
} from "../../../../../common/types.common";
import type { FormInput } from "../../../utils/types";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import useRefreshStore from "../../../store/admin/refreshStore";
import toast from "react-hot-toast";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import ApiError from "../../common/ApiError";
import useProviderStore from "../../../store/admin/grn/providerStore";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import Btn from "../../common/Btn";
import Label from "../../common/Label";
import Input from "../../common/Input";
import Select from "../../common/Select";
import Textarea from "../../common/Textarea";
import EditGrnSkeleton from "../skeleton/EditGrnSkeleton";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

type FormData = {
  name: FormInput;
  providerId: FormInput<string, undefined>;
  totalPriceCents: FormInput;
  stateId: FormInput<string, undefined>;
  notes: FormInput;
  inventoryMovementTypeId: FormInput<string, undefined>;
  inventoryMovementQuantity: FormInput<"1" | "-1", undefined>;
  inventoryMovementNotes: FormInput;
};

export default function EditGrn() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("EditGrn render count:", renderCount.current);

  const { id } = useParams();
  const navigate = useNavigate();

  const { grnStates, fetchGrnStates } = useGrnStateStore();
  const { movementTypes, fetchMovementTypes } = useInventoryMovementTypeStore();
  const { allProvidersLite: providers, fetchProviders } = useProviderStore();
  const { fetchGrn, updateGrn } = useGrnStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditGrn, canReadUser] = [
    useHasPermission("u_grn"),
    useHasPermission("r_usr"),
  ];

  const [grn, setGrn] = useState<GrnResponse | null>(null);
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    providerId: { val: "" },
    totalPriceCents: { val: "" },
    stateId: { val: "" },
    notes: { val: "" },
    inventoryMovementTypeId: { val: "" },
    inventoryMovementQuantity: { val: "1" },
    inventoryMovementNotes: { val: "" },
  });

  // Fetch set data on initial load: grn states, movement types, providers, grn
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("GRN ID is missing.");
        const [fetchedGrn, fetchedMovementTypes] = await Promise.all([
          fetchGrn(id),
          movementTypes ? Promise.resolve(movementTypes) : fetchMovementTypes(),
          grnStates ? Promise.resolve() : fetchGrnStates(),
          providers ? Promise.resolve() : fetchProviders(),
        ]);

        setGrn(fetchedGrn);
        updateFormData(fetchedGrn);
        setFormData((prev) => ({
          ...prev,
          inventoryMovementTypeId: {
            val: fetchedMovementTypes.types[0]?.id || "",
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
  }, [id, refreshSignal]);

  const updateFormData = useCallback((grn: GrnResponse): void => {
    setFormData((prev) => ({
      ...prev,
      name: { val: grn.name },
      providerId: { val: grn.providerId },
      totalPriceCents: { val: grn.totalPriceCents.toString() },
      stateId: { val: grn.stateId },
      notes: { val: grn.notes || "" },
    }));
  }, []);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ): void => {
      if (process.isProcessing) return;

      const { name, value: val } = e.target;

      setFormData((prev) => {
        let err = undefined;
        if (!val && ["name", "totalPriceCents"].includes(name)) {
          err = `${capFirstLetter(name)} is required.`;
        } else if (name === "name" && !removeOddSpaces(val)) {
          err = "Name is invalid.";
        } else if (name === "totalPriceCents" && Number(val) < 0) {
          err = "Total price is invalid.";
        } else if (name === "notes" && val && !removeOddSpaces(val)) {
          err = "Notes is invalid.";
        } else if (
          name === "inventoryMovementNotes" &&
          val &&
          !removeOddSpaces(val)
        ) {
          err = "Inventory movement notes is invalid.";
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
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!grn) {
        toast.error("GRN data is not found. Please refresh and try again.");
        return;
      }
      if (!canEditGrn) {
        toast.error("You do not have permission to edit GRNs.");
        return;
      }

      const validateForm = (): boolean => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (!formData.name.val) {
          newFormData.name.err = "Name is required.";
          allValid = false;
        } else if (!removeOddSpaces(formData.name.val)) {
          newFormData.name.err = "Name is invalid.";
          allValid = false;
        }
        if (!formData.totalPriceCents.val) {
          newFormData.totalPriceCents.err = "Total price is required.";
          allValid = false;
        } else if (Number(formData.totalPriceCents.val) < 0) {
          newFormData.totalPriceCents.err = "Total price is invalid.";
          allValid = false;
        }
        if (formData.notes.val && !removeOddSpaces(formData.notes.val)) {
          newFormData.notes.err = "Notes is invalid.";
          allValid = false;
        }
        if (
          formData.inventoryMovementNotes.val &&
          !removeOddSpaces(formData.inventoryMovementNotes.val)
        ) {
          newFormData.inventoryMovementNotes.err =
            "Inventory movement notes is invalid.";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      if (validateForm()) {
        const getChangedData = (): GrnUpdate => {
          const changedData: GrnUpdate = {
            inventoryMovement: {
              typeId: formData.inventoryMovementTypeId.val,
              quantity: formData.inventoryMovementQuantity.val === "1" ? 1 : -1,
              notes: formData.inventoryMovementNotes.val || null,
            },
          };

          if (formData.name.val !== grn.name) {
            changedData.name = formData.name.val;
          }
          if (formData.providerId.val !== grn.providerId) {
            changedData.providerId = formData.providerId.val;
          }
          if (formData.totalPriceCents.val !== grn.totalPriceCents.toString()) {
            changedData.totalPriceCents = Number(formData.totalPriceCents.val);
          }
          if (formData.stateId.val !== grn.stateId) {
            changedData.stateId = formData.stateId.val;
          }
          if (formData.notes.val !== (grn.notes || "")) {
            changedData.notes = formData.notes.val;
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
          console.log("Changed data:", changedData);
          if (Object.keys(changedData).length <= 1) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          const updatedGrn = await updateGrn(grn.id, changedData);
          setGrn(updatedGrn);
          updateFormData(updatedGrn);
          toast.success("GRN updated successfully.");
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
    [
      canEditGrn,
      formData,
      grn,
      process.isProcessing,
      updateFormData,
      updateGrn,
    ],
  );

  return (
    <>
      {process.isInitializing ? (
        <EditGrnSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !grnStates ? (
        <ApiError errorMessage="GRN states data is not found." />
      ) : !movementTypes ? (
        <ApiError errorMessage="Inventory movement types data is not found." />
      ) : !providers ? (
        <ApiError errorMessage="Providers data is not found." />
      ) : !grn ? (
        <ApiError errorMessage="GRN data is not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Edit GRN #ID ${grn.id}`}
            parentTitle="GRN Management"
            parentLink="/admin/grns"
            className="mb-4"
          />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left Column */}
              <div className="col-lg-8">
                {/* General Information */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">General Information</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <Label htmlFor="name" className="form-label" required>
                          Name
                        </Label>
                        <Input
                          type="text"
                          name="name"
                          id="name"
                          className="form-control"
                          placeholder={grn.name}
                          value={formData.name.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          error={formData.name.err}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="providerId"
                          className="form-label"
                          required
                        >
                          Provider
                        </Label>
                        <Select
                          name="providerId"
                          id="providerId"
                          className="form-select"
                          value={formData.providerId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                        >
                          {providers.providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>
                              {provider.fullName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="totalPriceCents"
                          className="form-label"
                          required
                        >
                          Total Price (&#65504; - cents)
                        </Label>
                        <Input
                          type="number"
                          name="totalPriceCents"
                          id="totalPriceCents"
                          className="form-control"
                          placeholder={grn.totalPriceCents.toString()}
                          min={0}
                          value={formData.totalPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          error={formData.totalPriceCents.err}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="stateId"
                          className="form-label"
                          required
                        >
                          GRN State
                        </Label>
                        <Select
                          name="stateId"
                          id="stateId"
                          className="form-select"
                          value={formData.stateId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                        >
                          {grnStates.states.map((state) => (
                            <option key={state.id} value={state.id}>
                              {state.name}
                              {state.description &&
                                ` - ${state.description.toLowerCase()}`}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label htmlFor="notes" className="form-label">
                        Notes
                      </Label>
                      <Textarea
                        name="notes"
                        id="notes"
                        className="form-control"
                        rows={3}
                        placeholder={grn.notes || "None"}
                        value={formData.notes.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        error={formData.notes.err}
                      />
                    </div>
                  </div>
                </div>

                {/* Inventory Movement */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Record Inventory Movement</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="inventoryMovementTypeId"
                          className="form-label"
                          required
                        >
                          Movement Type
                        </Label>
                        <Select
                          name="inventoryMovementTypeId"
                          id="inventoryMovementTypeId"
                          className="form-select"
                          value={formData.inventoryMovementTypeId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                        >
                          {movementTypes.types.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                              {type.description &&
                                ` - ${type.description.toLowerCase()}`}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="inventoryMovementQuantity"
                          className="form-label"
                          required
                        >
                          Quantity Change
                        </Label>
                        <Select
                          name="inventoryMovementQuantity"
                          id="inventoryMovementQuantity"
                          className="form-select"
                          value={formData.inventoryMovementQuantity.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                        >
                          <option value="1">Increase Stock</option>
                          <option value="-1">Decrease Stock</option>
                        </Select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label
                        htmlFor="inventoryMovementNotes"
                        className="form-label"
                      >
                        Movement Notes
                      </Label>
                      <Textarea
                        name="inventoryMovementNotes"
                        id="inventoryMovementNotes"
                        className="form-control"
                        rows={2}
                        placeholder="Reason for movement..."
                        value={formData.inventoryMovementNotes.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        error={formData.inventoryMovementNotes.err}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                {/* Details */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Details</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="id" className="form-label">
                        ID
                      </label>
                      <input
                        type="text"
                        id="id"
                        className="form-control"
                        value={grn.id}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="quantity" className="form-label">
                        Total Quantity
                      </label>
                      <input
                        type="number"
                        id="quantity"
                        className="form-control"
                        value={grn.quantity}
                        disabled
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <p className="form-label mb-2">Created by</p>
                      <DetailUserLink
                        userId={grn.createdBy.id}
                        title="View user details"
                        disabled={!canReadUser}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        className="form-control bg-grey--g"
                      >
                        {grn.createdBy.fullName}
                      </DetailUserLink>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="createdAt" className="form-label">
                        Created at
                      </label>
                      <input
                        type="text"
                        id="createdAt"
                        className="form-control"
                        value={new Date(grn.createdAt).toLocaleString()}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
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
                Update GRN
              </Btn>
            </div>
          </form>
        </>
      )}
    </>
  );
}
