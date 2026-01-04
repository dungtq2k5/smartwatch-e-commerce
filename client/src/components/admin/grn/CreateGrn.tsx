import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProviderStore from "../../../store/admin/providerStore";
import useGrnStore from "../../../store/admin/grn/grnStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { FormInput } from "../../../utils/types";
import useGrnStateStore from "../../../store/admin/grn/grnStateStore";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import {
  GRN_FILE_IMPORT_WORKSHEET_NAME,
  WAITING_EMOJI,
} from "../../../configs";
import { countExcelFileRows, getExcelFileErrs } from "../../../utils/utils";
import type {
  ModelVariationResponse,
  GrnCreate,
} from "../../../../../common/types.common";
import ApiError from "../../common/ApiError";
import useVariationStore from "../../../store/admin/product/variationStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileArrowDown,
  faFileArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import { GRN_FILE_IMPORT_EXTENSIONS } from "../../../../../common/configs.common";
import ExcelTemplates from "../../../assets/templates/excel-templates.xlsx";
import ExcelJS from "exceljs";
import useCreationWizardStore from "../../../store/admin/creationWizardStore";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import WizardStepHeader from "../WizardStepHeader";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingFile: boolean;
  isDownloadingTemplate: boolean;
  isCreating: boolean;
};

type FormData = {
  providerId: FormInput;
  name: FormInput;
  totalPriceCents: FormInput;
  quantity: number; // Will be auto calculated from file
  notes: FormInput;
  stateId: FormInput;
  file: FormInput<File | null>;
};

export default function CreateGrn() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateGrn render count:", renderCount.current);

  const { variationId } = useParams();

  const navigate = useNavigate();
  const wizard = useCreationWizardStore();

  const { fetchVariationLite } = useVariationStore();
  const { providers, fetchProviders } = useProviderStore();
  const { grnStates, fetchGrnStates } = useGrnStateStore();
  const { createGrn } = useGrnStore();

  const canCreateGrn = useHasPermission("c_grn");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingFile: false,
    isDownloadingTemplate: false,
    isCreating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [variation, setVariation] = useState<ModelVariationResponse | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>({
    providerId: { val: "" },
    name: { val: "" },
    totalPriceCents: { val: "" },
    quantity: 0,
    notes: { val: "" },
    stateId: { val: "" },
    file: { val: null },
  });

  const [restartWizard, setRestartWizard] = useState<boolean>(false);

  // Fetch set data on initial load: providers, grnStates
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!variationId) {
          throw new Error("Variation ID is missing");
        }

        const [fetchedVariation, fetchedProviders, fetchedGrnStates] =
          await Promise.all([
            fetchVariationLite(variationId),
            providers ? Promise.resolve(providers) : fetchProviders(),
            grnStates ? Promise.resolve(grnStates) : fetchGrnStates(),
          ]);

        setVariation(fetchedVariation);
        setFormData((prev) => ({
          ...prev,
          providerId: { val: fetchedProviders.providers[0]?.id || "" },
          stateId: { val: fetchedGrnStates.states[0]?.id || "" },
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
    (
      e: React.FormEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      if (process.isProcessing) return;

      const { name, value: val } = e.currentTarget;

      setFormData((prev) => {
        let err = "";
        if (!val && ["name", "totalPriceCents"].includes(name)) {
          err = `${name} is required`;
        } else if (name === "name" && !removeOddSpaces(val)) {
          err = "Name is invalid";
        } else if (name === "totalPriceCents" && Number(val) < 0) {
          err = "Total price cents is invalid";
        }

        return {
          ...prev,
          [name]: { val, err },
        };
      });
    },
    [process.isProcessing]
  );

  const handleFileChange = useCallback(
    async (e: React.FormEvent<HTMLInputElement>): Promise<void> => {
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      const files = e.currentTarget.files;
      if (!files || files.length === 0) {
        setFormData((prev) => ({
          ...prev,
          file: { ...prev.file, err: "No file selected." },
        }));
        return;
      }

      const file = files[0];
      const currFile = formData.file.val;
      // Filter duplicated files
      if (
        currFile &&
        currFile.name === file.name &&
        currFile.size === file.size &&
        currFile.type === file.type
      ) {
        return;
      }

      // Check valid files
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUploadingFile: true,
      }));
      const fileErrs = await getExcelFileErrs(file, "grn");
      if (fileErrs.length > 0) {
        setFormData((prev) => ({
          ...prev,
          file: { ...prev.file, err: fileErrs.join(", ") },
        }));
      } else {
        const quantity = (await countExcelFileRows(file)) - 1;
        setFormData((prev) => ({
          ...prev,
          quantity,
          file: { val: file },
        }));
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUploadingFile: false,
      }));
    },
    [formData.file.val, process.isProcessing]
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
      if (!variationId) {
        toast.error("Variation ID is missing.");
        return;
      }
      if (!canCreateGrn) {
        toast.error("You do not have permission to create GRNs.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const updatedFormData: FormData = { ...formData };

        const { name, totalPriceCents, notes, file } = formData;

        if (!name.val) {
          updatedFormData.name.err = "Name is required.";
          allValid = false;
        } else if (!removeOddSpaces(name.val)) {
          updatedFormData.name.err = "Name is invalid.";
          allValid = false;
        }
        if (!totalPriceCents.val) {
          updatedFormData.totalPriceCents.err =
            "Total price cents is required.";
          allValid = false;
        } else if (Number(totalPriceCents.val) < 0) {
          updatedFormData.totalPriceCents.err = "Total price cents is invalid.";
          allValid = false;
        }
        if (notes.val && !removeOddSpaces(notes.val)) {
          updatedFormData.notes.err = "Notes is invalid.";
          allValid = false;
        }
        if (!file.val) {
          updatedFormData.file.err = "File is required.";
          allValid = false;
        } else {
          const fileErrs = await getExcelFileErrs(file.val, "grn");
          if (fileErrs.length > 0) {
            updatedFormData.file.err = fileErrs.join(", ");
            allValid = false;
          }
        }

        setFormData(updatedFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreating: true,
      }));

      if (await validateForm()) {
        try {
          const grn: GrnCreate = {
            modelVariationId: variationId,
            providerId: formData.providerId.val,
            grn: {
              name: formData.name.val,
              totalPriceCents: Number(formData.totalPriceCents.val),
              quantity: formData.quantity,
              notes: removeOddSpaces(formData.notes.val) || null,
              stateId: formData.stateId.val || null,
            },
            file: formData.file.val!,
          };

          await createGrn(grn);
          toast.success("GRN created successfully.");

          if (
            wizard.isActive &&
            wizard.startStep &&
            wizard.startStep !== "grn"
          ) {
            setRestartWizard(true);
            return;
          }
          navigate(`admin/variation-instances?searchTerm=${variationId}`);
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
      canCreateGrn,
      createGrn,
      formData,
      navigate,
      process.isProcessing,
      variationId,
      wizard.isActive,
      wizard.startStep,
    ]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    wizard.reset();
    navigate(-1);
  }, [navigate, process.isProcessing, wizard]);

  const handleDownloadTemplate = useCallback(async (): Promise<void> => {
    // Since downloading has no impact to other processes, no need to block or be blocked by other processes
    setProcess((prev) => ({
      ...prev,
      isDownloadingTemplate: true,
    }));

    try {
      // Get template workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const res = await fetch(ExcelTemplates);
      const arrayBuffer = await res.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(GRN_FILE_IMPORT_WORKSHEET_NAME);
      if (!worksheet) {
        throw new Error("GRN Import Template worksheet not found.");
      }

      // Remove other worksheets
      workbook.eachSheet((sheet) => {
        if (sheet.name !== GRN_FILE_IMPORT_WORKSHEET_NAME) {
          workbook.removeWorksheet(sheet.id);
        }
      });

      // Download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `grn-import-template.xlsx`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isDownloadingTemplate: false,
      }));
    }
  }, []);

  const handleRestartWizard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!wizard.isActive || !wizard.startStep || wizard.startStep === "grn") {
      toast.error("Cannot restart wizard.");
      return;
    }

    const startStep = wizard.startStep;
    const navigateUrl =
      startStep === "product"
        ? "/admin/products/create"
        : startStep === "model"
        ? `/admin/product-models/create/${wizard.context.productId}`
        : `/admin/model-variations/create/${wizard.context.modelId}`;

    navigate(navigateUrl, { replace: true });
  }, [navigate, process.isProcessing, wizard]);

  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO loading skeleton
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !providers ? (
        <ApiError errMsg="Providers data not found." />
      ) : !grnStates ? (
        <ApiError errMsg="GRN states data not found." />
      ) : !variation ? (
        <ApiError errMsg="Variation data not found." />
      ) : (
        <>
          {/* Heading */}
          <WizardStepHeader
            currStep="grn"
            title={`Import GRN for ${variation.name}`}
            parentTitle="Variation Management"
            parentLink="/admin/model-variations"
            className="mb-4"
          />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left Column */}
              <div className="col-lg-8">
                {/* General Info Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">General Information</h2>
                  </div>
                  <div className="card-body">
                    {/* Name */}
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">
                        GRN Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="form-control"
                        placeholder="Import Batch #001"
                        value={formData.name.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        autoComplete="off"
                      />
                      {formData.name.err && (
                        <InvalidInputMsg msg={formData.name.err} />
                      )}
                    </div>

                    {/* Provider */}
                    <div className="mb-3">
                      <label htmlFor="providerId" className="form-label">
                        Provider
                      </label>
                      <select
                        name="providerId"
                        id="providerId"
                        className="form-select"
                        value={formData.providerId.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      >
                        {providers.providers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                      {formData.providerId.err && (
                        <InvalidInputMsg msg={formData.providerId.err} />
                      )}
                    </div>

                    {/* Total Price */}
                    <div className="mb-3">
                      <label htmlFor="totalPriceCents" className="form-label">
                        Total Price (&#65504; - cents)
                      </label>
                      <input
                        type="number"
                        name="totalPriceCents"
                        id="totalPriceCents"
                        className="form-control"
                        placeholder="100000"
                        min={0}
                        value={formData.totalPriceCents.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.totalPriceCents.err && (
                        <InvalidInputMsg msg={formData.totalPriceCents.err} />
                      )}
                    </div>

                    {/* Notes */}
                    <div className="mb-3">
                      <label htmlFor="notes" className="form-label">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        id="notes"
                        className="form-control"
                        rows={4}
                        placeholder="Additional notes..."
                        value={formData.notes.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.notes.err && (
                        <InvalidInputMsg msg={formData.notes.err} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                {/* File Upload Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h2 className="fs-5 mb-0">Import File</h2>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleDownloadTemplate}
                      disabled={process.isDownloadingTemplate}
                    >
                      {process.isDownloadingTemplate ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            aria-hidden="true"
                          ></span>
                          <output>Downloading...</output>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faFileArrowDown} className="me-2" />Download
                          Template
                        </>
                      )}
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="file" className="form-label">
                        Excel File ({GRN_FILE_IMPORT_EXTENSIONS.join(", ")})
                      </label>
                      <input
                        type="file"
                        name="file"
                        id="file"
                        className="form-control"
                        accept={GRN_FILE_IMPORT_EXTENSIONS.join(",")}
                        onChange={handleFileChange}
                        disabled={process.isProcessing}
                      />
                      {formData.file.err && (
                        <InvalidInputMsg msg={formData.file.err} />
                      )}
                      {process.isUploadingFile && (
                        <div className="text-muted small mt-1">
                          Processing file...
                        </div>
                      )}
                    </div>

                    {/* Quantity Display */}
                    <div className="mb-3">
                      <label htmlFor="quantity" className="form-label">
                        Detected Quantity
                      </label>
                      <input
                        type="text"
                        name="quantity"
                        id="quantity"
                        className="form-control"
                        value={formData.quantity}
                        readOnly
                        disabled
                      />
                      <div className="form-text">
                        Auto-calculated from file.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Status</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <label htmlFor="stateId" className="form-label">
                        GRN State
                      </label>
                      <select
                        name="stateId"
                        id="stateId"
                        className="form-select"
                        value={formData.stateId.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      >
                        {grnStates.states.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}{" "}
                            {s.description &&
                              `- ${s.description.toLowerCase()}`}
                          </option>
                        ))}
                      </select>
                      {formData.stateId.err && (
                        <InvalidInputMsg msg={formData.stateId.err} />
                      )}
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
                    <output>Importing...</output>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faFileArrowUp} className="me-2"/>Import GRN
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Restart Creation Wizard Modal */}
          <ConfirmSubmitModal
            show={restartWizard}
            onHide={handleDiscard}
            onSubmit={handleRestartWizard}
            custom={{
              action: "leave",
              title: "Restart creation process.",
              body: `Do you want to restart the creation process GRN from ${wizard.startStep}?`,
              cancelText: "No, finish creation",
              submitText: "Yes, restart",
            }}
          />
        </>
      )}
    </>
  );
}
