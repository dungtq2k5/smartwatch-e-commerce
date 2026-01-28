import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import type { FormInput } from "../../../utils/types";
import type { FormData as CreateFormData } from "./CreateVariation";
import { useNavigate, useParams } from "react-router-dom";
import useVariationStore from "../../../store/admin/product/variationStore";
import useUserStore from "../../../store/admin/userStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  AdminModelVariationResponse,
  ModelVariationCreate,
  ModelVariationUpdate,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  compareList,
  formatError,
  isValidColorHex,
  isValidProductName,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import {
  createFileList,
  getImgFilesErrs,
  uploadFile,
} from "../../../utils/utils";
import {
  MAX_PRODUCT_IMG_UPLOAD,
  PRODUCT_IMAGE_ALLOWED_TYPES,
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
import Title from "../Title";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import ColorListInput from "../ColorListInput";
import DetailUserLink from "../DetailUserLink";
import Btn from "../../common/Btn";
import Label from "../../common/Label";
import Input from "../../common/Input";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImages: boolean;
  isUpdating: boolean;
};

type FormData = CreateFormData & {
  currImageUrls: FormInput<string[], undefined>;
};

export default function EditVariation() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("EditVariation render count:", renderCount.current);

  const { id } = useParams();

  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchVariation, updateVariation } = useVariationStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditVariation, canReadUser] = [
    useHasPermission("u_model_variation"),
    useHasPermission("r_usr"),
  ];

  const [variation, setVariation] =
    useState<AdminModelVariationResponse | null>(null);
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImages: false,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    color: { hex: { val: "" }, name: { val: "" } },
    imageUrls: { val: [] },
    currImageUrls: { val: [] },
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

  // Fetch set data on initial load: sysUserId, variation, formData
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("Variation ID is missing");

        const [fetchedVariation] = await Promise.all([
          fetchVariation(id),
          sysUserId ? Promise.resolve() : fetchSysUserId(),
        ]);

        setVariation(fetchedVariation);
        updateFormData(fetchedVariation);
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

  const updateFormData = useCallback(
    (variation: AdminModelVariationResponse) => {
      const {
        name,
        color,
        imageUrls,
        additionalPriceCents,
        stockAdditionalPriceCents,
        band,
        stopSelling,
      } = structuredClone(variation); // Avoid direct mutation

      setFormData({
        name: { val: name },
        color: {
          hex: { val: color.hex },
          name: { val: color.name },
        },
        imageUrls: { val: [] },
        currImageUrls: { val: imageUrls },
        additionalPriceCents: { val: additionalPriceCents.toString() },
        stockAdditionalPriceCents: {
          val: stockAdditionalPriceCents.toString(),
        },
        band: {
          widthMm: { val: band.widthMm.toString() },
          lugWidthMm: { val: band.lugWidthMm.toString() },
          material: { val: band.material },
          colors: band.colors.map((color) => ({
            hex: { val: color.hex },
            name: { val: color.name },
          })),
          claspType: { val: band.claspType },
          adjustableRange: {
            minMm: { val: band.adjustableRange.minMm.toString() },
            maxMm: { val: band.adjustableRange.maxMm.toString() },
          },
          style: { val: band.style },
          quickRelease: { val: band.quickRelease },
          waterResistance: { val: band.waterResistance },
          hypoallergenic: { val: band.hypoallergenic },
          weightMg: { val: band.weightMg.toString() },
        },
        stopSelling: { val: stopSelling },
      });
    },
    [],
  );

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
          (cf) =>
            cf.name === f.name && cf.size === f.size && cf.type === f.type,
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
    const imgFileErrs = await getImgFilesErrs(files, "product-image");
    if (imgFileErrs.length > 0) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          ...prev.imageUrls,
          err: `Invalid files found: ${imgFileErrs.join(", ")}`,
        },
      }));
    } else {
      // All valid -> add to form data
      setFormData((prev) => ({
        ...prev,
        imageUrls: { val: [...currFiles, ...files] },
      }));
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: false,
      isUploadingImgs: false,
    }));
  }, [formData.imageUrls.val, process.isProcessing]);

  const handleRemoveImg = useCallback(
    (idx: number, type: "current" | "new"): void => {
      if (process.isProcessing) return;

      switch (type) {
        case "current":
          setFormData((prev) => {
            const updatedImgs = [...prev.currImageUrls.val];
            updatedImgs.splice(idx, 1);
            return { ...prev, currImageUrls: { val: updatedImgs } };
          });
          break;
        case "new":
          setFormData((prev) => {
            const updatedImgs = [...prev.imageUrls.val];
            updatedImgs.splice(idx, 1);
            return { ...prev, imageUrls: { val: updatedImgs } };
          });
          break;
      }
    },
    [process.isProcessing],
  );

  const genImgPreviews = useCallback(
    (imgUrls: string[], type: "current" | "new"): JSX.Element[] => {
      return imgUrls.map((src, idx) => (
        <div key={`${src} - ${idx}`} className="col-4">
          <div className="position-relative">
            <img
              src={src}
              alt={`Preview ${idx + 1} type ${type}`}
              loading="lazy"
              className="admin-edit-product-img-preview--g"
            />
            <button
              type="button"
              className="btn border-0 position-absolute top-0 end-0 mt-1 me-1 bg-white rounded-1"
              onClick={() => handleRemoveImg(idx, type)}
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
    [handleRemoveImg, process.isProcessing],
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
    [],
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
    [getFieldErr, process.isProcessing],
  );

  const handleChangeBandColors = useCallback(
    (
      color: ModelVariationCreate["band"]["colors"][number],
      action: "add" | "delete",
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
            (c) => c.hex.val !== color.hex && c.name.val !== color.name,
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
      if (!variation) {
        toast.error("Variation data not found.");
        return;
      }
      if (!canEditVariation) {
        toast.error("You do not have permission to edit a variation.");
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
            const imgFileErrs = await getImgFilesErrs(
              imageUrls.val,
              "product-image",
            );
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
        const getChangedData = async (): Promise<ModelVariationUpdate> => {
          const changedData: ModelVariationUpdate = {};

          const {
            name,
            color,
            imageUrls,
            currImageUrls,
            additionalPriceCents,
            stockAdditionalPriceCents,
            band,
            stopSelling,
          } = formData;
          const {
            widthMm,
            lugWidthMm,
            material,
            colors,
            claspType,
            adjustableRange,
            style,
            quickRelease,
            waterResistance,
            hypoallergenic,
            weightMg,
          } = band;

          if (name.val !== variation.name) changedData.name = name.val;
          if (
            color.hex.val !== variation.color.hex ||
            color.name.val !== variation.color.name
          ) {
            changedData.color = {
              hex: color.hex.val,
              name: color.name.val,
            };
          }
          if (
            imageUrls.val.length > 0 ||
            currImageUrls.val.length !== variation.imageUrls.length
          ) {
            const uploadedImgUrls: string[] = [];

            for (const imgUrl of imageUrls.val) {
              const downloadUrl = await uploadFile(imgUrl, "product-image");
              if (!downloadUrl) {
                setFormData((prev) => ({
                  ...prev,
                  imageUrls: {
                    ...prev.imageUrls,
                    err: "Some images failed to upload. Please try again.",
                  },
                }));
                throw new Error(
                  "Some images failed to upload. Please try again.",
                );
              }
              uploadedImgUrls.push(downloadUrl);
            }
            changedData.imageUrls = [...currImageUrls.val, ...uploadedImgUrls];
          }
          if (
            additionalPriceCents.val !==
            variation.additionalPriceCents.toString()
          ) {
            changedData.additionalPriceCents = Number(additionalPriceCents.val);
          }
          if (
            stockAdditionalPriceCents.val !==
            variation.stockAdditionalPriceCents.toString()
          ) {
            changedData.stockAdditionalPriceCents = Number(
              stockAdditionalPriceCents.val,
            );
          }
          if (stopSelling.val !== variation.stopSelling) {
            changedData.stopSelling = stopSelling.val;
          }

          // Band fields
          const bandChanges: ModelVariationUpdate["band"] = {};
          if (widthMm.val !== variation.band.widthMm.toString()) {
            bandChanges.widthMm = Number(widthMm.val);
          }
          if (lugWidthMm.val !== variation.band.lugWidthMm.toString()) {
            bandChanges.lugWidthMm = Number(lugWidthMm.val);
          }
          if (material.val !== variation.band.material) {
            bandChanges.material = material.val;
          }
          if (colors.length !== variation.band.colors.length) {
            const flatColors = colors.map((c) => ({
              hex: c.hex.val,
              name: c.name.val,
            }));
            if (!compareList(flatColors, variation.band.colors)) {
              bandChanges.colors = flatColors;
            }
          }
          if (claspType.val !== variation.band.claspType) {
            bandChanges.claspType = claspType.val;
          }
          if (
            adjustableRange.minMm.val !==
              variation.band.adjustableRange.minMm.toString() ||
            adjustableRange.maxMm.val !==
              variation.band.adjustableRange.maxMm.toString()
          ) {
            bandChanges.adjustableRange = {
              minMm: Number(adjustableRange.minMm.val),
              maxMm: Number(adjustableRange.maxMm.val),
            };
          }
          if (style.val !== variation.band.style) {
            bandChanges.style = style.val;
          }
          if (quickRelease.val !== variation.band.quickRelease) {
            bandChanges.quickRelease = quickRelease.val;
          }
          if (waterResistance.val !== variation.band.waterResistance) {
            bandChanges.waterResistance = waterResistance.val;
          }
          if (hypoallergenic.val !== variation.band.hypoallergenic) {
            bandChanges.hypoallergenic = hypoallergenic.val;
          }
          if (weightMg.val !== variation.band.weightMg.toString()) {
            bandChanges.weightMg = Number(weightMg.val);
          }

          if (Object.keys(bandChanges).length > 0) {
            changedData.band = bandChanges;
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No need to update.");
            return;
          }

          await updateVariation(variation.id, changedData);
          const updatedVariation = await fetchVariation(variation.id);

          setVariation(updatedVariation);
          updateFormData(updatedVariation);

          toast.success("Variation updated successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isCreating: false,
          }));
        }
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreating: false,
      }));
    },
    [
      process.isProcessing,
      variation,
      canEditVariation,
      formData,
      updateVariation,
      fetchVariation,
      updateFormData,
    ],
  );

  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO loading skeleton
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !sysUserId ? (
        <ApiError errorMessage="System user ID data not found." />
      ) : !variation ? (
        <ApiError errorMessage="Variation data not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Edit Variation #ID ${variation.id}`}
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
                      <Label htmlFor="name" className="form-label" required>
                        Name
                      </Label>
                      <Input
                        type="text"
                        name="name"
                        id="name"
                        className="form-control"
                        placeholder={variation.name}
                        value={formData.name.val}
                        onChange={handleChange}
                        autoComplete="off"
                        disabled={process.isProcessing}
                        required
                        error={formData.name.err}
                      />
                    </div>

                    {/* Color */}
                    <div className="mb-3">
                      <Label
                        htmlFor="color.name"
                        className="form-label"
                        required
                      >
                        Color
                      </Label>
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
                        <Input
                          type="text"
                          name="color.name"
                          id="color.name"
                          className="form-control"
                          placeholder={variation.color.name}
                          value={formData.color.name.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.color.name.err}
                          neverShowErrorMessage
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
                        <Label
                          htmlFor="additionalPriceCents"
                          className="form-label"
                        >
                          Selling Additional Price (&#65504; - cents)
                        </Label>
                        <Input
                          type="number"
                          name="additionalPriceCents"
                          id="additionalPriceCents"
                          className="form-control"
                          placeholder={variation.additionalPriceCents.toString()}
                          min={0}
                          value={formData.additionalPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          error={formData.additionalPriceCents.err}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="stockAdditionalPriceCents"
                          className="form-label"
                        >
                          Stock Additional Price (&#65504; - cents)
                        </Label>
                        <Input
                          type="number"
                          name="stockAdditionalPriceCents"
                          id="stockAdditionalPriceCents"
                          className="form-control"
                          placeholder={variation.stockAdditionalPriceCents.toString()}
                          min={0}
                          value={formData.stockAdditionalPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          error={formData.stockAdditionalPriceCents.err}
                        />
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
                        <Label
                          htmlFor="band.widthMm"
                          className="form-label"
                          required
                        >
                          Width (mm)
                        </Label>
                        <Input
                          type="number"
                          name="band.widthMm"
                          id="band.widthMm"
                          className="form-control"
                          placeholder={variation.band.widthMm.toString()}
                          min={0}
                          value={formData.band.widthMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.widthMm.err}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="band.lugWidthMm"
                          className="form-label"
                          required
                        >
                          Lug Width (mm)
                        </Label>
                        <Input
                          type="number"
                          name="band.lugWidthMm"
                          id="band.lugWidthMm"
                          className="form-control"
                          placeholder={variation.band.lugWidthMm.toString()}
                          min={0}
                          value={formData.band.lugWidthMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.lugWidthMm.err}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="band.material"
                          className="form-label"
                          required
                        >
                          Material
                        </Label>
                        <Input
                          type="text"
                          name="band.material"
                          id="band.material"
                          className="form-control"
                          placeholder={variation.band.material}
                          value={formData.band.material.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.material.err}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="band.claspType"
                          className="form-label"
                          required
                        >
                          Clasp Type
                        </Label>
                        <Input
                          type="text"
                          name="band.claspType"
                          id="band.claspType"
                          className="form-control"
                          placeholder={variation.band.claspType}
                          value={formData.band.claspType.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          error={formData.band.claspType.err}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="band.style"
                          className="form-label"
                          required
                        >
                          Style
                        </Label>
                        <Input
                          type="text"
                          name="band.style"
                          id="band.style"
                          className="form-control"
                          placeholder={variation.band.style}
                          value={formData.band.style.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.style.err}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <Label
                          htmlFor="band.weightMg"
                          className="form-label"
                          required
                        >
                          Weight (mg)
                        </Label>
                        <Input
                          type="number"
                          name="band.weightMg"
                          id="band.weightMg"
                          className="form-control"
                          placeholder={variation.band.weightMg.toString()}
                          min={0}
                          value={formData.band.weightMg.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.weightMg.err}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label
                        htmlFor="band.adjustableRange.minMm"
                        className="form-label"
                        required
                      >
                        Adjustable Range (Min - Max)
                      </Label>
                      <div className="input-group">
                        <Input
                          type="number"
                          name="band.adjustableRange.minMm"
                          className="form-control"
                          placeholder={`Min: ${variation.band.adjustableRange.minMm}`}
                          min={0}
                          value={formData.band.adjustableRange.minMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.adjustableRange.minMm.err}
                          neverShowErrorMessage
                        />
                        <span className="input-group-text">
                          <FontAwesomeIcon
                            icon={faMinus}
                            className="text-muted"
                          />
                        </span>
                        <Input
                          type="number"
                          name="band.adjustableRange.maxMm"
                          className="form-control"
                          placeholder={`Max: ${variation.band.adjustableRange.maxMm}`}
                          min={formData.band.adjustableRange.minMm.val || 0}
                          value={formData.band.adjustableRange.maxMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                          required
                          error={formData.band.adjustableRange.maxMm.err}
                          neverShowErrorMessage
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
                      <Label htmlFor="band.colors" className="form-label">
                        Band Colors
                      </Label>
                      <ColorListInput
                        name="band.colors"
                        id="band.colors"
                        value={formData.band.colors.map((c) => ({
                          hex: c.hex.val,
                          name: c.name.val,
                        }))}
                        onChange={handleChangeBandColors}
                        placeholder={variation.band.colors
                          .map((c) => c.name)
                          .join(", ")}
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
                      {imgPreviews.length +
                        formData.currImageUrls.val.length ===
                        0 && (
                        <p className="text-muted mt-3 mb-0">
                          Your uploaded images will be displayed here.
                        </p>
                      )}
                      {imgPreviews.length > 0 &&
                        genImgPreviews(imgPreviews, "new")}
                      {formData.currImageUrls.val.length > 0 &&
                        genImgPreviews(formData.currImageUrls.val, "current")}
                    </div>
                    <div className="mt-3">
                      <Label htmlFor="imageUrls" className="form-label">
                        Upload new images
                      </Label>
                      <Input
                        type="file"
                        id="imageUrls"
                        name="imageUrls"
                        className="form-control"
                        multiple
                        accept={PRODUCT_IMAGE_ALLOWED_TYPES.join(",")}
                        ref={fileInputRef}
                        disabled={process.isProcessing}
                        error={formData.imageUrls.err}
                        neverShowErrorMessage
                      />
                      <Btn
                        type="button"
                        className="btn btn-outline-secondary mt-2 w-100"
                        onClick={handleUploadImgs}
                        disabled={process.isProcessing}
                        loading={process.isUploadingImages}
                        icon={<FontAwesomeIcon icon={faUpload} />}
                      >
                        Upload Images
                      </Btn>
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
                    <h2 className="fs-5 mb-0">Status & Metadata</h2>
                  </div>
                  <div className="card-body">
                    <div className="form-check form-switch mb-3">
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

                    <div className="mb-3">
                      <label htmlFor="id" className="form-label">
                        ID
                      </label>
                      <input
                        type="text"
                        name="id"
                        id="id"
                        className="form-control"
                        value={variation.id}
                        readOnly
                        disabled
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="stockQuantity" className="form-label">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stockQuantity"
                        id="stockQuantity"
                        className="form-control"
                        value={variation.stockQuantity}
                        readOnly
                        disabled
                      />
                    </div>

                    <div className="mb-3">
                      <p className="form-label mb-2">Created By</p>
                      <DetailUserLink
                        userId={variation.createdBy.id}
                        title="View user details"
                        disabled={!canReadUser}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        className="form-control bg-gray--g"
                      >
                        {variation.createdBy.fullName}
                      </DetailUserLink>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="createdAt" className="form-label">
                        Created At
                      </label>
                      <input
                        type="text"
                        name="createdAt"
                        id="createdAt"
                        className="form-control"
                        value={new Date(variation.createdAt).toLocaleString()}
                        readOnly
                        disabled
                      />
                    </div>

                    <div className="mb-3">
                      <label htmlFor="updatedAt" className="form-label">
                        Updated At
                      </label>
                      <input
                        type="text"
                        name="updatedAt"
                        id="updatedAt"
                        className="form-control"
                        value={new Date(variation.updatedAt).toLocaleString()}
                        readOnly
                        disabled
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
