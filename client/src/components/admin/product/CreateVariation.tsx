import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import type { FormInput } from "../../../utils/types";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import useModelStore from "../../../store/admin/product/modelStore";
import useVariationStore from "../../../store/admin/product/variationStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  ModelVariationCreate,
  ProductModelResponse,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
  isValidColorHex,
  isValidProductName,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import {
  createFileList,
  getImgFilesErrs,
  uploadFile,
} from "../../../utils/utils";
import {
  MAX_PRODUCT_IMG_UPLOAD,
  PRODUCT_IMAGE_HINT_MESSAGE,
} from "../../../../../common/configs.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMinus,
  faQuestionCircle,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import ApiError from "../../common/ApiError";
import ColorListInput from "../ColorListInput";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImages: boolean;
  isCreating: boolean;
};

type FormData = {
  name: FormInput;
  color: {
    hex: FormInput;
    name: FormInput;
  };
  imageUrls: FormInput<File[]>;
  additionalPriceCents: FormInput;
  stockAdditionalPriceCents: FormInput;
  band: {
    widthMm: FormInput;
    lugWidthMm: FormInput;
    material: FormInput;
    colors: {
      hex: FormInput;
      name: FormInput;
    }[];
    claspType: FormInput;
    adjustableRange: {
      minMm: FormInput;
      maxMm: FormInput;
    };
    style: FormInput;
    quickRelease: FormInput<boolean, undefined>;
    waterResistance: FormInput<boolean, undefined>;
    hypoallergenic: FormInput<boolean, undefined>;
    weightMg: FormInput;
  };
  stopSelling: FormInput<boolean, undefined>;
};

export default function CreateVariation() {
  // DEV temp for testing
  const renderCount = useRef(0); // Fixed type mismatch in original code if any
  renderCount.current += 1;
  console.log("CreateVariation render count:", renderCount.current);

  const { modelId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();
  const isFromProductContinueToCreate: boolean =
    location.state?.fromCreateProduct || false;
  const isFromModelContinueToCreate: boolean =
    location.state?.fromCreateModel || false;

  const { fetchModelLite } = useModelStore();
  const { createVariation } = useVariationStore();

  const canCreateVariation = useHasPermission("c_model_variation");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImages: false,
    isCreating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [model, setModel] = useState<ProductModelResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    color: { hex: { val: "" }, name: { val: "" } },
    imageUrls: { val: [] },
    additionalPriceCents: { val: "" },
    stockAdditionalPriceCents: { val: "" },
    band: {
      widthMm: { val: "" },
      lugWidthMm: { val: "" },
      material: { val: "" },
      colors: [],
      claspType: { val: "" },
      adjustableRange: {
        minMm: { val: "" },
        maxMm: { val: "" },
      },
      style: { val: "" },
      quickRelease: { val: false },
      waterResistance: { val: false },
      hypoallergenic: { val: false },
      weightMg: { val: "" },
    },
    stopSelling: { val: false },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  // TODO handle grn
  const [continueToCreateModal, setContinueToCreateModal] =
    useState<boolean>(false);

  // Fetch set data on initial load: model
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!modelId) throw new Error("Model ID is missing.");

        const fetchedModel = await fetchModelLite(modelId);
        setModel(fetchedModel);
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

  // Update imgPreviews when formData.imageUrls.val changes
  useEffect(() => {
    const updateImgPreviews = async (): Promise<void> => {
      const imgPreviews: string[] = [];
      const imgs = formData.imageUrls.val;

      for (const img of imgs) {
        imgPreviews.push((await readFileAsDataUrl(img)) as string);
      }

      setImgPreviews(imgPreviews);
    };

    updateImgPreviews();
  }, [formData.imageUrls.val]);

  const handleUploadImgs = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    let files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: { ...prev.imageUrls, err: "No file selected." },
      }));
      return;
    }

    // Filter duplicated files
    const currFiles = formData.imageUrls.val;
    if (currFiles.length > 0) {
      const filteredFiles = Array.from(files).filter((f) => {
        return !currFiles.some(
          (cf) => cf.name === f.name && cf.size === f.size && cf.type === f.type
        );
      });

      files = createFileList(filteredFiles);
      if (files.length === 0) {
        setFormData((prev) => ({
          ...prev,
          imageUrls: { ...prev.imageUrls, err: "No new file selected." },
        }));
        return;
      }
    }

    // Check max limit
    if (files.length + currFiles.length > MAX_PRODUCT_IMG_UPLOAD) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          ...prev.imageUrls,
          err: `You can upload up to ${MAX_PRODUCT_IMG_UPLOAD} images.`,
        },
      }));
      return;
    }

    // Check valid files
    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isUploadingImgs: true,
    }));
    const imgFileErrs = await getImgFilesErrs(files, "product");
    if (imgFileErrs.length > 0) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          ...prev.imageUrls,
          err: `Invalid files found: ${imgFileErrs.join(", ")}`,
        },
      }));
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUploadingImgs: false,
      }));
      return;
    }

    // All valid -> add to form data
    setFormData((prev) => ({
      ...prev,
      imageUrls: { val: [...currFiles, ...files] },
    }));
    setProcess((prev) => ({
      ...prev,
      isProcessing: false,
      isUploadingImgs: false,
    }));
  }, [formData.imageUrls.val, process.isProcessing]);

  const handleRemoveImg = useCallback(
    (idx: number): void => {
      if (process.isProcessing) return;

      setFormData((prev) => {
        const updatedImgs = [...prev.imageUrls.val];
        updatedImgs.splice(idx, 1);
        return { ...prev, imageUrls: { val: updatedImgs } };
      });
    },
    [process.isProcessing]
  );

  const genImgPreviews = useCallback(
    (imgUrls: string[]): JSX.Element[] => {
      return imgUrls.map((src, idx) => (
        <div key={`${src} - ${idx}`} className="col-4">
          <div className="position-relative">
            <img
              src={src}
              alt={`Preview ${idx + 1}`}
              loading="lazy"
              className="admin-edit-product-img-preview--g"
            />
            <button
              type="button"
              className="btn border-0 position-absolute top-0 end-0 mt-1 me-1 bg-white rounded-1"
              onClick={() => handleRemoveImg(idx)}
              aria-label={`Remove image ${idx + 1}`}
              style={{ zIndex: 1 }}
              disabled={process.isProcessing}
            >
              <FontAwesomeIcon icon={faXmark} size="sm" />
            </button>
          </div>
        </div>
      ));
    },
    [handleRemoveImg, process.isProcessing]
  );

  const getFieldErr = useCallback(
    (name: string, val: string): string | undefined => {
      const fieldName = capFirstLetter(name.split(".").pop() || name);

      // Check required fields
      if (
        !val &&
        [
          "name",
          "color.name",
          "color.hex",
          "band.widthMm",
          "band.lugWidthMm",
          "band.material",
          "band.claspType",
          "band.adjustableRange.minMm",
          "band.adjustableRange.maxMm",
          "band.style",
          "band.weightMg",
        ].includes(name)
      ) {
        return `${fieldName} is required.`;
      }

      // Specific field validations
      switch (name) {
        case "name":
          if (!isValidProductName(val)) {
            return "Variation name is invalid.";
          }
          break;
        case "color.hex":
          if (!isValidColorHex(val)) {
            return "Color hex code is invalid.";
          }
          break;
        case "color.name":
        case "band.material":
        case "band.claspType":
        case "band.style":
          if (!removeOddSpaces(val)) {
            return "Color name is invalid.";
          }
          break;
        case "additionalPriceCents":
        case "stockAdditionalPriceCents":
          if (val && Number(val) < 0) {
            return `${fieldName} is invalid.`;
          }
          break;
        case "band.widthMm":
        case "band.lugWidthMm":
        case "band.adjustableRange.minMm":
        case "band.adjustableRange.maxMm":
        case "band.weightMg":
          if (Number(val) < 0) {
            return `${fieldName} is invalid.`;
          }
          break;
      }
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing) return;

      const { name, value: val, type } = e.target;

      // Handle nested fields
      if (name.includes(".")) {
        const nameParts = name.split(".");

        setFormData((prev) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let currField: any = prev;
          for (let i = 0; i < nameParts.length - 1; i++) {
            const field = nameParts[i];
            currField = currField[field];
            if (!currField) {
              console.warn(`Field ${field} not found in formData.`);
              return prev;
            }
          }

          const lastPart = nameParts.at(-1);
          if (!lastPart) {
            console.warn(`Invalid field name: ${name}`);
            return prev;
          }

          currField[lastPart] = {
            val:
              type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : val,
            err: getFieldErr(name, val),
          };

          return { ...prev };
        });

        return;
      }

      // Handle top-level fields
      setFormData((prev) => ({
        ...prev,
        [name]: {
          val:
            type === "checkbox" ? (e.target as HTMLInputElement).checked : val,
          err: getFieldErr(name, val),
        },
      }));
    },
    [getFieldErr, process.isProcessing]
  );

  const handleChangeBandColors = useCallback(
    (
      color: ModelVariationCreate["band"]["colors"][number],
      action: "add" | "delete"
    ): void => {
      if (process.isProcessing) return;

      setFormData((prev) => {
        let updatedColors = [...prev.band.colors];

        if (action === "add") {
          updatedColors.push({
            hex: { val: color.hex },
            name: { val: color.name },
          });
        } else if (action === "delete") {
          updatedColors = updatedColors.filter(
            (c) => c.hex.val !== color.hex && c.name.val !== color.name
          );
        }

        return {
          ...prev,
          band: {
            ...prev.band,
            colors: updatedColors,
          },
        };
      });
    },
    [process.isProcessing]
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
      if (!modelId) {
        toast.error("Model ID is missing.");
        return;
      }
      if (!canCreateVariation) {
        toast.error("You do not have permission to create a variation.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const updatedFormData: FormData = { ...formData };

        const {
          name,
          color,
          imageUrls,
          additionalPriceCents,
          stockAdditionalPriceCents,
          band,
        } = formData;
        const {
          widthMm,
          lugWidthMm,
          material,
          claspType,
          adjustableRange,
          style,
          weightMg,
        } = band;

        if (!name.val) {
          name.err = "Name is required";
          allValid = false;
        } else if (!isValidProductName(name.val)) {
          name.err = "Name is invalid.";
          allValid = false;
        }
        if (!color.hex.val) {
          color.hex.err = "Color hex code is required.";
          allValid = false;
        } else if (!isValidColorHex(color.hex.val)) {
          color.hex.err = "Color hex code is invalid.";
          allValid = false;
        }
        if (!color.name.val) {
          color.name.err = "Color name is required.";
          allValid = false;
        } else if (!removeOddSpaces(color.name.val)) {
          color.name.err = "Color name is invalid.";
          allValid = false;
        }
        if (imageUrls.val.length) {
          if (imageUrls.val.length > MAX_PRODUCT_IMG_UPLOAD) {
            imageUrls.err = `You can upload up to ${MAX_PRODUCT_IMG_UPLOAD} images.`;
            allValid = false;
          } else {
            const imgFileErrs = await getImgFilesErrs(imageUrls.val, "product");
            if (imgFileErrs.length > 0) {
              imageUrls.err = `Invalid files found: ${imgFileErrs.join(", ")}`;
              allValid = false;
            }
          }
        }
        if (additionalPriceCents.val && Number(additionalPriceCents.val) < 0) {
          additionalPriceCents.err = "Additional price is invalid.";
          allValid = false;
        }
        if (
          stockAdditionalPriceCents.val &&
          Number(stockAdditionalPriceCents.val) < 0
        ) {
          stockAdditionalPriceCents.err = "Stock additional price is invalid.";
          allValid = false;
        }
        if (!widthMm.val) {
          widthMm.err = "Band width is required.";
          allValid = false;
        } else if (Number(widthMm.val) < 0) {
          widthMm.err = "Band width is invalid.";
          allValid = false;
        }
        if (!lugWidthMm.val) {
          lugWidthMm.err = "Band lug width is required.";
          allValid = false;
        } else if (Number(lugWidthMm.val) < 0) {
          lugWidthMm.err = "Band lug width is invalid.";
          allValid = false;
        }
        if (!material.val) {
          material.err = "Band material is required.";
          allValid = false;
        } else if (!removeOddSpaces(material.val)) {
          material.err = "Band material is invalid.";
          allValid = false;
        }
        if (!claspType.val) {
          claspType.err = "Band clasp type is required.";
          allValid = false;
        } else if (!removeOddSpaces(claspType.val)) {
          claspType.err = "Band clasp type is invalid.";
          allValid = false;
        }
        if (!adjustableRange.minMm.val) {
          adjustableRange.minMm.err = "Band adjustable range min is required.";
          allValid = false;
        } else if (Number(adjustableRange.minMm.val) < 0) {
          adjustableRange.minMm.err = "Band adjustable range min is invalid.";
          allValid = false;
        }
        if (!adjustableRange.maxMm.val) {
          adjustableRange.maxMm.err = "Band adjustable range max is required.";
          allValid = false;
        } else if (Number(adjustableRange.maxMm.val) < 0) {
          adjustableRange.maxMm.err = "Band adjustable range max is invalid.";
          allValid = false;
        }
        if (!style.val) {
          style.err = "Band style is required.";
          allValid = false;
        } else if (!removeOddSpaces(style.val)) {
          style.err = "Band style is invalid.";
          allValid = false;
        }
        if (!weightMg.val) {
          weightMg.err = "Band weight is required.";
          allValid = false;
        } else if (Number(weightMg.val) < 0) {
          weightMg.err = "Band weight is invalid.";
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

      if (await validateForm()) {
        try {
          const imageUrls: string[] = [];
          for (const img of formData.imageUrls.val) {
            const downloadUrl = await uploadFile(img, "product");
            if (!downloadUrl) throw new Error("Failed to upload image file.");
            imageUrls.push(downloadUrl);
          }

          const variation: ModelVariationCreate = {
            productModelId: modelId,
            name: formData.name.val,
            color: {
              hex: formData.color.hex.val,
              name: formData.color.name.val,
            },
            imageUrls,
            additionalPriceCents: formData.additionalPriceCents.val
              ? Number(formData.additionalPriceCents.val)
              : null,
            stockAdditionalPriceCents: formData.stockAdditionalPriceCents.val
              ? Number(formData.stockAdditionalPriceCents.val)
              : null,
            band: {
              widthMm: Number(formData.band.widthMm.val),
              lugWidthMm: Number(formData.band.lugWidthMm.val),
              material: formData.band.material.val,
              colors: formData.band.colors.map((c) => ({
                hex: c.hex.val,
                name: c.name.val,
              })),
              claspType: formData.band.claspType.val,
              adjustableRange: {
                minMm: Number(formData.band.adjustableRange.minMm.val),
                maxMm: Number(formData.band.adjustableRange.maxMm.val),
              },
              style: formData.band.style.val,
              quickRelease: formData.band.quickRelease.val,
              waterResistance: formData.band.waterResistance.val,
              hypoallergenic: formData.band.hypoallergenic.val,
              weightMg: Number(formData.band.weightMg.val),
            },
            stopSelling: formData.stopSelling.val,
          };

          await createVariation(variation);
          toast.success("Variation created successfully.");
          setContinueToCreateModal(true);
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
      canCreateVariation,
      createVariation,
      formData,
      modelId,
      process.isProcessing,
    ]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (isFromProductContinueToCreate && isFromModelContinueToCreate) {
      navigate("/admin/products", {
        replace: true,
      });
      return;
    }

    if (isFromModelContinueToCreate) {
      navigate("/admin/product-models", {
        replace: true,
      });
      return;
    }

    navigate(-1);
  }, [
    isFromModelContinueToCreate,
    isFromProductContinueToCreate,
    navigate,
    process.isProcessing,
  ]);

  const handleContinueToCreate = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
  }, [process.isProcessing]);

  return (
    <>
      {process.isProcessing ? (
        <p>Loading...</p> // TODO loading skeleton
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !model ? (
        <ApiError errMsg="Model data not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="fs-2 mb-0 d-flex gap-2">
              {isFromProductContinueToCreate && isFromModelContinueToCreate ? (
                <>
                  <span className="text-muted text-small">Step: 3/N</span>
                  <p className="mb-0 fw-light">/</p>
                  Create Variation for model {model.name}
                </>
              ) : (
                <>
                  <Link
                    to={"/admin/products"}
                    className="text-decoration-none text-black"
                  >
                    Variation Management
                  </Link>
                  <p className="mb-0 fw-light">/</p>
                  Create Variation for model {model.name}
                </>
              )}
            </h1>
          </div>

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
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="form-control"
                        placeholder="Apple Watch Series 8 45mm GPS Red"
                        value={formData.name.val}
                        onChange={handleChange}
                        autoComplete="off"
                        disabled={process.isProcessing}
                      />
                      {formData.name.err && (
                        <InvalidInputMsg msg={formData.name.err} />
                      )}
                    </div>

                    {/* Color */}
                    <div className="mb-3">
                      <label htmlFor="color.name" className="form-label">
                        Color
                      </label>
                      <div className="input-group">
                        <span className="input-group-text p-1 bg-white">
                          <input
                            type="color"
                            name="color.hex"
                            id="color.hex"
                            className="form-control form-control-color-input--g"
                            value={formData.color.hex.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                            title="Choose color"
                          />
                        </span>
                        <input
                          type="text"
                          name="color.name"
                          id="color.name"
                          className="form-control"
                          placeholder="Color name (e.g. Red)"
                          value={formData.color.name.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                      </div>
                      {(formData.color.hex.err || formData.color.name.err) && (
                        <InvalidInputMsg
                          msg={
                            formData.color.hex.err || formData.color.name.err
                          }
                        />
                      )}
                    </div>

                    {/* Prices */}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label
                          htmlFor="additionalPriceCents"
                          className="form-label"
                        >
                          Selling Additional Price (&#65504; - cents)
                        </label>
                        <input
                          type="number"
                          name="additionalPriceCents"
                          id="additionalPriceCents"
                          className="form-control"
                          placeholder="9999"
                          min={0}
                          value={formData.additionalPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.additionalPriceCents.err && (
                          <InvalidInputMsg
                            msg={formData.additionalPriceCents.err}
                          />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label
                          htmlFor="stockAdditionalPriceCents"
                          className="form-label"
                        >
                          Stock Additional Price (&#65504; - cents)
                        </label>
                        <input
                          type="number"
                          name="stockAdditionalPriceCents"
                          id="stockAdditionalPriceCents"
                          className="form-control"
                          placeholder="9999"
                          min={0}
                          value={formData.stockAdditionalPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.stockAdditionalPriceCents.err && (
                          <InvalidInputMsg
                            msg={formData.stockAdditionalPriceCents.err}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Band Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Band Specifications</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.widthMm" className="form-label">
                          Width (mm)
                        </label>
                        <input
                          type="number"
                          name="band.widthMm"
                          id="band.widthMm"
                          className="form-control"
                          placeholder="22"
                          min={0}
                          value={formData.band.widthMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.widthMm.err && (
                          <InvalidInputMsg msg={formData.band.widthMm.err} />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.lugWidthMm" className="form-label">
                          Lug Width (mm)
                        </label>
                        <input
                          type="number"
                          name="band.lugWidthMm"
                          id="band.lugWidthMm"
                          className="form-control"
                          placeholder="22"
                          min={0}
                          value={formData.band.lugWidthMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.lugWidthMm.err && (
                          <InvalidInputMsg msg={formData.band.lugWidthMm.err} />
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.material" className="form-label">
                          Material
                        </label>
                        <input
                          type="text"
                          name="band.material"
                          id="band.material"
                          className="form-control"
                          placeholder="Silicone"
                          value={formData.band.material.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.material.err && (
                          <InvalidInputMsg msg={formData.band.material.err} />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.claspType" className="form-label">
                          Clasp Type
                        </label>
                        <input
                          type="text"
                          name="band.claspType"
                          id="band.claspType"
                          className="form-control"
                          placeholder="Buckle"
                          value={formData.band.claspType.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.claspType.err && (
                          <InvalidInputMsg msg={formData.band.claspType.err} />
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.style" className="form-label">
                          Style
                        </label>
                        <input
                          type="text"
                          name="band.style"
                          id="band.style"
                          className="form-control"
                          placeholder="Sport"
                          value={formData.band.style.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.style.err && (
                          <InvalidInputMsg msg={formData.band.style.err} />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="band.weightMg" className="form-label">
                          Weight (mg)
                        </label>
                        <input
                          type="number"
                          name="band.weightMg"
                          id="band.weightMg"
                          className="form-control"
                          placeholder="5000"
                          min={0}
                          value={formData.band.weightMg.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.band.weightMg.err && (
                          <InvalidInputMsg msg={formData.band.weightMg.err} />
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="form-label">Adjustable Range (Min - Max)</p>
                      <div className="input-group">
                        <input
                          type="number"
                          name="band.adjustableRange.minMm"
                          className="form-control"
                          placeholder="Min: 130"
                          min={0}
                          value={formData.band.adjustableRange.minMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <span className="input-group-text">
                          <FontAwesomeIcon
                            icon={faMinus}
                            className="text-muted"
                          />
                        </span>
                        <input
                          type="number"
                          name="band.adjustableRange.maxMm"
                          className="form-control"
                          placeholder="Max: 200"
                          min={formData.band.adjustableRange.minMm.val || 0}
                          value={formData.band.adjustableRange.maxMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                      </div>
                      {(formData.band.adjustableRange.minMm.err ||
                        formData.band.adjustableRange.maxMm.err) && (
                        <InvalidInputMsg
                          msg={
                            formData.band.adjustableRange.minMm.err ||
                            formData.band.adjustableRange.maxMm.err
                          }
                        />
                      )}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="band.colors" className="form-label">
                        Band Colors
                      </label>
                      <ColorListInput
                        name="band.colors"
                        id="band.colors"
                        value={formData.band.colors.map((c) => ({
                          hex: c.hex.val,
                          name: c.name.val,
                        }))}
                        onChange={handleChangeBandColors}
                        placeholder="Black"
                        disabled={process.isProcessing}
                      />
                    </div>

                    <div className="d-flex gap-4 flex-wrap">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          name="band.quickRelease"
                          id="band.quickRelease"
                          checked={formData.band.quickRelease.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="band.quickRelease"
                        >
                          Quick Release
                        </label>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          name="band.waterResistance"
                          id="band.waterResistance"
                          checked={formData.band.waterResistance.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="band.waterResistance"
                        >
                          Water Resistance
                        </label>
                      </div>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          name="band.hypoallergenic"
                          id="band.hypoallergenic"
                          checked={formData.band.hypoallergenic.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="band.hypoallergenic"
                        >
                          Hypoallergenic
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-lg-4">
                {/* Images Card */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Variation Images</h2>
                  </div>
                  <div className="card-body">
                    <div className="row g-2">
                      {imgPreviews.length === 0 && (
                        <p className="text-muted mt-3 mb-0">
                          Your uploaded images will be displayed here.
                        </p>
                      )}
                      {imgPreviews.length > 0 && genImgPreviews(imgPreviews)}
                    </div>
                    <div className="mt-3">
                      <label htmlFor="imageUrls" className="form-label">
                        Upload new images
                      </label>
                      <input
                        type="file"
                        id="imageUrls"
                        name="imageUrls"
                        className="form-control"
                        multiple
                        accept="image/*"
                        ref={fileInputRef}
                        disabled={process.isProcessing}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary mt-2 w-100"
                        onClick={handleUploadImgs}
                        disabled={process.isProcessing}
                      >
                        {process.isUploadingImages ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              aria-hidden="true"
                            ></span>
                            <output>Uploading...</output>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faUpload} className="me-2" />
                            Upload Images
                          </>
                        )}
                      </button>
                      {formData.imageUrls.err && (
                        <InvalidInputMsg msg={formData.imageUrls.err} />
                      )}
                      <div id="imgHelp" className="form-text">
                        {PRODUCT_IMAGE_HINT_MESSAGE}
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
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        name="stopSelling"
                        id="stopSelling"
                        checked={formData.stopSelling.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      <label className="form-check-label" htmlFor="stopSelling">
                        Stop Selling
                      </label>
                      <FontAwesomeIcon
                        icon={faQuestionCircle}
                        className="ms-2 text-muted"
                        title="If enabled, this variation won't be available for purchase."
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
                    <output>Creating...</output>
                  </>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>

          {/* Modals */}
          <ConfirmSubmitModal
            show={continueToCreateModal}
            onHide={handleDiscard}
            onSubmit={handleContinueToCreate}
            custom={{
              action: "leave",
              title: "Continue creation process.",
              body: `Do you want to create another variation for the model ${
                model.name || "N/A"
              }?`,
              cancelText: "No, finish creation",
              submitText: "Yes, create another variation",
            }}
          />
        </>
      )}
    </>
  );
}
