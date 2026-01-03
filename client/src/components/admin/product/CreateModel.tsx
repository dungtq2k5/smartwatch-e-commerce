import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import type { FormInput } from "../../../utils/types";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import useProductOsStore from "../../../store/common/product/osStore";
import useModelStore from "../../../store/admin/product/modelStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  capFirstLetter,
  formatError,
  getLocalDateString,
  isValidProductName,
  nonEmptyList,
  readFileAsDataUrl,
} from "../../../../../common/utils.common";
import type {
  ProductModelCreate,
  ProductResponse,
} from "../../../../../common/types.common";
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
  faTimes,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import ApiError from "../../common/ApiError";
import useProductStore from "../../../store/admin/product/productStore";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import TxtListInput from "../TxtListInput";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImages: boolean;
  isCreating: boolean;
};

type FormData = {
  name: FormInput;
  priceCents: FormInput;
  stockPriceCents: FormInput;
  imageUrls: FormInput<File[]>;
  feature: {
    speakerAndMicrophone: FormInput<boolean>;
    waterResistance: {
      rating: FormInput;
      description: FormInput;
    };
    utilities: {
      healths: FormInput<string[]>;
      sports: FormInput<string[]>;
      specials: FormInput<string[]>;
      others: FormInput<string[]>;
    };
    supportedAppsForNotifications: FormInput<string[]>;
  };
  config: {
    connectivities: FormInput<string[]>;
    camera: {
      resolutionMp: FormInput;
      features: FormInput<string[]>;
    };
    chipset: FormInput;
    memory: {
      ramBytes: FormInput;
      storageBytes: FormInput;
    };
    osId: FormInput<string, undefined>;
    compatiblePhoneOs: FormInput<string[]>;
    appsConnect: FormInput<string[]>;
    sensors: FormInput<string[]>;
  };
  battery: {
    capacityMah: FormInput;
    timeOnline: {
      aodOnMin: FormInput;
      aodOffMin: FormInput;
      typicalUsageMin: FormInput;
      standByMin: FormInput;
    };
    timeFullChargeMin: FormInput;
    chargingType: FormInput;
  };
  screen: {
    display: {
      diagonalSizeInch: FormInput;
      displayType: FormInput;
    };
    brightness: {
      minNits: FormInput;
      maxNits: FormInput;
    };
    resolution: {
      hPx: FormInput;
      wPx: FormInput;
    };
    glassMaterial: FormInput;
    bezelMaterial: FormInput;
    shape: FormInput;
    refreshRateHz: FormInput;
    isCircular: FormInput<boolean, undefined>;
    diameterMm: FormInput;
    dimension: {
      wMm: FormInput;
      hMm: FormInput;
      thicknessMm: FormInput;
    };
  };
  caseMaterial: FormInput;
  watchWeightMg: FormInput;
  compatibleBandLugWidthMm: FormInput;
  releaseDate: FormInput;
  stopSelling: FormInput<boolean>;
};

export default function CreateModel() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateModel render count:", renderCount.current);

  const { productId } = useParams();

  const navigate = useNavigate();
  const location = useLocation();
  const isFromContinueToCreate: boolean =
    location.state?.fromCreateProduct || false;

  const { oses, fetchOses } = useProductOsStore();
  const { fetchProductLite } = useProductStore();
  const { createModel } = useModelStore();

  const canCreateModel = useHasPermission("c_product_model");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImages: false,
    isCreating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    priceCents: { val: "" },
    stockPriceCents: { val: "" },
    imageUrls: { val: [] },
    feature: {
      speakerAndMicrophone: { val: false },
      waterResistance: {
        rating: { val: "" },
        description: { val: "" },
      },
      utilities: {
        healths: { val: [] },
        sports: { val: [] },
        specials: { val: [] },
        others: { val: [] },
      },
      supportedAppsForNotifications: { val: [] },
    },
    config: {
      connectivities: { val: [] },
      camera: {
        resolutionMp: { val: "" },
        features: { val: [] },
      },
      chipset: { val: "" },
      memory: {
        ramBytes: { val: "" },
        storageBytes: { val: "" },
      },
      osId: { val: "" },
      compatiblePhoneOs: { val: [] },
      appsConnect: { val: [] },
      sensors: { val: [] },
    },
    battery: {
      capacityMah: { val: "" },
      timeOnline: {
        aodOnMin: { val: "" },
        aodOffMin: { val: "" },
        typicalUsageMin: { val: "" },
        standByMin: { val: "" },
      },
      timeFullChargeMin: { val: "" },
      chargingType: { val: "" },
    },
    screen: {
      display: {
        diagonalSizeInch: { val: "" },
        displayType: { val: "" },
      },
      brightness: {
        minNits: { val: "" },
        maxNits: { val: "" },
      },
      resolution: {
        hPx: { val: "" },
        wPx: { val: "" },
      },
      glassMaterial: { val: "" },
      bezelMaterial: { val: "" },
      shape: { val: "" },
      refreshRateHz: { val: "" },
      isCircular: { val: true },
      diameterMm: { val: "" },
      dimension: {
        wMm: { val: "" },
        hMm: { val: "" },
        thicknessMm: { val: "" },
      },
    },
    caseMaterial: { val: "" },
    watchWeightMg: { val: "" },
    compatibleBandLugWidthMm: { val: "" },
    releaseDate: { val: "" },
    stopSelling: { val: false },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  const [continueToCreateVariation, setContinueToCreateVariation] =
    useState<boolean>(false);

  // Fetch set data on initial load: oses
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!productId) throw new Error("Product ID is missing.");

        const [fetchedProduct] = await Promise.all([
          fetchProductLite(productId),
          oses ? Promise.resolve() : fetchOses(),
        ]);

        setProduct(fetchedProduct);
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

  const getRequiredNumFieldErr = useCallback(
    (fieldName: string, val: string): string | undefined => {
      if (!val) {
        return `${fieldName} is required`;
      }
      if (Number.isNaN(val) || Number(val) < 0) {
        return `${fieldName} is invalid`;
      }
    },
    []
  );

  const getFieldErr = useCallback(
    (name: string, val: string): string | undefined => {
      const fieldName = capFirstLetter(name.split(".").pop() || name);

      // Check required fields
      if (!val) {
        if (
          [
            "name",
            "priceCents",
            "stockPriceCents",
            "caseMaterial",
            "watchWeightMg",
            "compatibleBandLugWithMm",
            "releaseDate",
            "config.chipset",
            "config.memory.ramBytes",
            "config.memory.storageBytes",
            "battery.capacityMah",
            "battery.timeOnline.aodOnMin",
            "battery.timeOnline.aodOffMin",
            "battery.timeFullChargeMin",
            "battery.chargingType",
            "screen.display.diagonalSizeInch",
            "screen.display.displayType",
            "screen.brightness.minNits",
            "screen.brightness.maxNits",
            "screen.resolution.hPx",
            "screen.resolution.wPx",
            "screen.glassMaterial",
            "screen.bezelMaterial",
            "screen.shape",
          ].includes(name)
        ) {
          return `${fieldName} is required`;
        }

        if (
          ["screen.diameterMm"].includes(name) &&
          formData.screen.isCircular.val
        ) {
          return `${fieldName} is required`;
        }

        if (
          [
            "screen.dimension.wMm",
            "screen.dimension.hMm",
            "screen.dimension.thicknessMm",
          ].includes(name) &&
          !formData.screen.isCircular.val
        ) {
          return `${fieldName} is required`;
        }
      }

      // Specific field validations
      switch (name) {
        case "name":
          if (!isValidProductName(val)) {
            return "Product name is invalid";
          }
          break;
        case "priceCents":
        case "stockPriceCents":
        case "watchWeightMg":
        case "compatibleBandLugWithMm":
        case "config.camera.resolutionMp":
        case "config.memory.ramBytes":
        case "config.memory.storageBytes":
        case "battery.capacityMah":
        case "battery.timeOnline.aodOnMin":
        case "battery.timeOnline.aodOffMin":
        case "battery.timeOnline.typicalUsageMin":
        case "battery.timeOnline.standByMin":
        case "battery.timeFullChargeMin":
        case "screen.display.diagonalSizeInch":
        case "screen.brightness.minNits":
        case "screen.brightness.maxNits":
        case "screen.resolution.hPx":
        case "screen.resolution.wPx":
        case "screen.refreshRateHz":
        case "screen.diameterMm":
        case "screen.dimension.wMm":
        case "screen.dimension.hMm":
        case "screen.dimension.thicknessMm":
          if (val && Number(val) < 0) {
            return `${fieldName} is invalid`;
          }
          break;
        case "releaseDate":
          if (new Date(val) > new Date()) {
            return "Release date is invalid";
          }
          break;
      }
    },
    [formData.screen.isCircular.val]
  );

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      if (process.isProcessing) return;

      const { name, value: val, type } = e.target;

      // Handle nested fields, ex: feature.waterResistance.rating
      if (name.includes(".")) {
        const nameParts = name.split(".");

        setFormData((prev) => {
          // Handle special case for screen.isCircular to update dependent fields errors
          if (name === "screen.isCircular") {
            const isCircular = (e.target as HTMLInputElement).checked;

            return {
              ...prev,
              screen: {
                ...prev.screen,
                isCircular: { val: isCircular },
                diameterMm: {
                  ...prev.screen.diameterMm,
                  err: isCircular
                    ? getRequiredNumFieldErr(
                        "Diameter mm",
                        prev.screen.diameterMm.val
                      )
                    : undefined,
                },
                dimension: {
                  ...prev.screen.dimension,
                  wMm: {
                    ...prev.screen.dimension.wMm,
                    err: !isCircular
                      ? getRequiredNumFieldErr(
                          "Dimension wMm",
                          prev.screen.dimension.wMm.val
                        )
                      : undefined,
                  },
                  hMm: {
                    ...prev.screen.dimension.hMm,
                    err: !isCircular
                      ? getRequiredNumFieldErr(
                          "Dimension hMm",
                          prev.screen.dimension.hMm.val
                        )
                      : undefined,
                  },
                  thicknessMm: {
                    ...prev.screen.dimension.thicknessMm,
                    err: !isCircular
                      ? getRequiredNumFieldErr(
                          "Dimension thicknessMm",
                          prev.screen.dimension.thicknessMm.val
                        )
                      : undefined,
                  },
                },
              },
            };
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let currField: any = prev;
          for (let i = 0; i < nameParts.length - 1; i++) {
            const field = nameParts[i];
            currField = currField[field];
            if (!currField) {
              console.warn(`Field ${field} not found in formData`);
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
    [getFieldErr, getRequiredNumFieldErr, process.isProcessing]
  );

  const handleChangeItemInListField = useCallback(
    (fieldName: string, modItem: string, action: "add" | "delete"): void => {
      if (process.isProcessing) return;

      setFormData((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let currField: any = prev;
        const nameParts = fieldName.split(".");
        for (const field of nameParts) {
          currField = currField[field];

          if (!currField) {
            console.warn(`Field ${field} not found in formData`);
            return prev;
          }
        }

        if (action === "add") {
          if (!currField.val.includes(modItem)) {
            currField.val = [...currField.val, modItem];
          }
        } else if (action === "delete") {
          currField.val = currField.val.filter(
            (item: string) => item !== modItem
          );
        }

        return { ...prev };
      });
    },
    [process.isProcessing]
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another request is being processed. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!productId) {
        toast.error("Product ID is missing.");
        return;
      }
      if (!canCreateModel) {
        toast.error("You do not have permission to create product models.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        const {
          name,
          priceCents,
          stockPriceCents,
          imageUrls,
          config,
          battery,
          screen,
          caseMaterial,
          watchWeightMg,
          compatibleBandLugWidthMm,
          releaseDate,
        } = newFormData;
        const { camera, chipset, memory } = config;
        const { capacityMah, timeOnline, timeFullChargeMin, chargingType } =
          battery;
        const {
          display,
          brightness,
          resolution,
          glassMaterial,
          bezelMaterial,
          shape,
          refreshRateHz,
          isCircular,
          diameterMm,
          dimension,
        } = screen;

        if (!name.val) {
          name.err = "Name is required";
          allValid = false;
        } else if (!isValidProductName(name.val)) {
          name.err = "Product name is invalid";
          allValid = false;
        }
        const priceCentsErr = getRequiredNumFieldErr(
          "Price cents",
          priceCents.val
        );
        if (priceCentsErr) {
          priceCents.err = priceCentsErr;
          allValid = false;
        }
        const stockPriceCentsErr = getRequiredNumFieldErr(
          "Stock price cents",
          stockPriceCents.val
        );
        if (stockPriceCentsErr) {
          stockPriceCents.err = stockPriceCentsErr;
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
        const cameraResolutionMpErr =
          camera.resolutionMp.val &&
          getRequiredNumFieldErr("Resolution MP", camera.resolutionMp.val);
        if (cameraResolutionMpErr) {
          camera.resolutionMp.err = cameraResolutionMpErr;
          allValid = false;
        }
        if (!chipset.val) {
          chipset.err = "Chipset is required";
          allValid = false;
        }
        const memoryRamBytesErr = getRequiredNumFieldErr(
          "Ram bytes",
          memory.ramBytes.val
        );
        if (memoryRamBytesErr) {
          memory.ramBytes.err = memoryRamBytesErr;
          allValid = false;
        }
        const memoryStorageBytesErr = getRequiredNumFieldErr(
          "Storage bytes",
          memory.storageBytes.val
        );
        if (memoryStorageBytesErr) {
          memory.storageBytes.err = memoryStorageBytesErr;
          allValid = false;
        }
        const batteryCapacityMahErr = getRequiredNumFieldErr(
          "Capacity mAh",
          capacityMah.val
        );
        if (batteryCapacityMahErr) {
          capacityMah.err = batteryCapacityMahErr;
          allValid = false;
        }
        const timeOnlineAodOnMinErr = getRequiredNumFieldErr(
          "AOD on time min",
          timeOnline.aodOnMin.val
        );
        if (timeOnlineAodOnMinErr) {
          timeOnline.aodOnMin.err = timeOnlineAodOnMinErr;
          allValid = false;
        }
        const timeOnlineAodOffMinErr = getRequiredNumFieldErr(
          "AOD off time min",
          timeOnline.aodOffMin.val
        );
        if (timeOnlineAodOffMinErr) {
          timeOnline.aodOffMin.err = timeOnlineAodOffMinErr;
          allValid = false;
        }
        if (
          timeOnline.typicalUsageMin.val &&
          Number(timeOnline.typicalUsageMin.val) < 0
        ) {
          timeOnline.typicalUsageMin.err = "Typical usage time is invalid";
          allValid = false;
        }
        if (
          timeOnline.standByMin.val &&
          Number(timeOnline.standByMin.val) < 0
        ) {
          timeOnline.standByMin.err = "Standby time is invalid";
          allValid = false;
        }
        const batteryTimeFullChargeMinErr = getRequiredNumFieldErr(
          "Time full charge min",
          timeFullChargeMin.val
        );
        if (batteryTimeFullChargeMinErr) {
          timeFullChargeMin.err = batteryTimeFullChargeMinErr;
          allValid = false;
        }
        if (!chargingType.val) {
          chargingType.err = "Charging type is required";
          allValid = false;
        }
        const screenDisplayDiagonalSizeInchErr = getRequiredNumFieldErr(
          "Diagonal size inch",
          display.diagonalSizeInch.val
        );
        if (screenDisplayDiagonalSizeInchErr) {
          display.diagonalSizeInch.err = screenDisplayDiagonalSizeInchErr;
          allValid = false;
        }
        if (!display.displayType.val) {
          display.displayType.err = "Display type is required";
          allValid = false;
        }
        const screenBrightnessMinNitsErr = getRequiredNumFieldErr(
          "Brightness min nits",
          brightness.minNits.val
        );
        if (screenBrightnessMinNitsErr) {
          brightness.minNits.err = screenBrightnessMinNitsErr;
          allValid = false;
        }
        const screenBrightnessMaxNitsErr = getRequiredNumFieldErr(
          "Brightness max nits",
          brightness.maxNits.val
        );
        if (screenBrightnessMaxNitsErr) {
          brightness.maxNits.err = screenBrightnessMaxNitsErr;
          allValid = false;
        }
        const screenResolutionHPxErr = getRequiredNumFieldErr(
          "Resolution H px",
          resolution.hPx.val
        );
        if (screenResolutionHPxErr) {
          resolution.hPx.err = screenResolutionHPxErr;
          allValid = false;
        }
        const screenResolutionWPxErr = getRequiredNumFieldErr(
          "Resolution W px",
          resolution.wPx.val
        );
        if (screenResolutionWPxErr) {
          resolution.wPx.err = screenResolutionWPxErr;
          allValid = false;
        }
        if (!glassMaterial.val) {
          glassMaterial.err = "Glass material is required";
          allValid = false;
        }
        if (!bezelMaterial.val) {
          bezelMaterial.err = "Bezel material is required";
          allValid = false;
        }
        if (!shape.val) {
          shape.err = "Screen shape is required";
          allValid = false;
        }
        if (refreshRateHz.val && Number(refreshRateHz.val) < 0) {
          refreshRateHz.err = "Refresh rate is invalid";
          allValid = false;
        }
        if (isCircular.val) {
          const diameterMmErr = getRequiredNumFieldErr(
            "Diameter mm",
            diameterMm.val
          );
          if (diameterMmErr) {
            diameterMm.err = diameterMmErr;
            allValid = false;
          }
        } else {
          const dimensionWMmErr = getRequiredNumFieldErr(
            "Dimension W mm",
            dimension.wMm.val
          );
          if (dimensionWMmErr) {
            dimension.wMm.err = dimensionWMmErr;
            allValid = false;
          }
          const dimensionHMmErr = getRequiredNumFieldErr(
            "Dimension H mm",
            dimension.hMm.val
          );
          if (dimensionHMmErr) {
            dimension.hMm.err = dimensionHMmErr;
            allValid = false;
          }
          const dimensionThicknessMmErr = getRequiredNumFieldErr(
            "Dimension thickness mm",
            dimension.thicknessMm.val
          );
          if (dimensionThicknessMmErr) {
            dimension.thicknessMm.err = dimensionThicknessMmErr;
            allValid = false;
          }
        }
        if (!caseMaterial.val) {
          caseMaterial.err = "Case material is required";
          allValid = false;
        }
        const watchWeightMgErr = getRequiredNumFieldErr(
          "Watch weight mg",
          watchWeightMg.val
        );
        if (watchWeightMgErr) {
          watchWeightMg.err = watchWeightMgErr;
          allValid = false;
        }
        const compatibleBandLugWidthMmErr = getRequiredNumFieldErr(
          "Compatible band lug width mm",
          compatibleBandLugWidthMm.val
        );
        if (compatibleBandLugWidthMmErr) {
          compatibleBandLugWidthMm.err = compatibleBandLugWidthMmErr;
          allValid = false;
        }
        if (!releaseDate.val) {
          releaseDate.err = "Release date is required";
          allValid = false;
        } else if (new Date(releaseDate.val) > new Date()) {
          releaseDate.err = "Release date is invalid";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUpdating: true,
      }));

      if (await validateForm()) {
        try {
          const imageUrls: string[] = [];
          for (const img of formData.imageUrls.val) {
            const downloadUrl = await uploadFile(img, "product");
            if (!downloadUrl) throw new Error("Failed to upload image file.");
            imageUrls.push(downloadUrl);
          }

          const {
            name,
            priceCents,
            stockPriceCents,
            feature,
            config,
            battery,
            screen,
            caseMaterial,
            watchWeightMg,
            compatibleBandLugWidthMm,
            releaseDate,
            stopSelling,
          } = formData;
          const {
            speakerAndMicrophone,
            waterResistance,
            utilities,
            supportedAppsForNotifications,
          } = feature;
          const {
            connectivities,
            camera,
            chipset,
            memory,
            osId,
            compatiblePhoneOs,
            appsConnect,
            sensors,
          } = config;
          const { capacityMah, timeOnline, timeFullChargeMin, chargingType } =
            battery;
          const {
            display,
            brightness,
            resolution,
            glassMaterial,
            bezelMaterial,
            shape,
            refreshRateHz,
            isCircular,
            diameterMm,
            dimension,
          } = screen;

          const model: ProductModelCreate = {
            productId,
            name: name.val,
            priceCents: Number(priceCents.val),
            stockPriceCents: Number(stockPriceCents.val),
            imageUrls,
            feature: {
              speakerAndMicrophone: speakerAndMicrophone.val,
              waterResistance: waterResistance.rating.val
                ? {
                    rating: waterResistance.rating.val,
                    description: waterResistance.description.val || null,
                  }
                : null,
              utilities: nonEmptyList(
                utilities.healths.val,
                utilities.sports.val,
                utilities.specials.val,
                utilities.others.val
              )
                ? {
                    healths: utilities.healths.val,
                    sports: utilities.sports.val,
                    specials: utilities.specials.val,
                    others: utilities.others.val,
                  }
                : null,
              supportedAppsForNotifications: supportedAppsForNotifications.val,
            },
            config: {
              connectivities: connectivities.val || null,
              camera: camera.resolutionMp.val
                ? {
                    resolutionMp: Number(camera.resolutionMp.val),
                    features: camera.features.val || null,
                  }
                : null,
              chipset: chipset.val,
              memory: {
                ramBytes: Number(memory.ramBytes.val),
                storageBytes: Number(memory.storageBytes.val),
              },
              osId: osId.val,
              compatiblePhoneOs: compatiblePhoneOs.val,
              appsConnect: appsConnect.val,
              sensors: sensors.val,
            },
            battery: {
              capacityMah: Number(capacityMah.val),
              timeOnline: {
                aodOnMin: Number(timeOnline.aodOnMin.val),
                aodOffMin: Number(timeOnline.aodOffMin.val),
                typicalUsageMin: timeOnline.typicalUsageMin.val
                  ? Number(timeOnline.typicalUsageMin.val)
                  : null,
                standByMin: timeOnline.standByMin.val
                  ? Number(timeOnline.standByMin.val)
                  : null,
              },
              timeFullChargeMin: Number(timeFullChargeMin.val),
              chargingType: chargingType.val,
            },
            screen: {
              display: {
                diagonalSizeInch: Number(display.diagonalSizeInch.val),
                displayType: display.displayType.val,
              },
              brightness: {
                minNits: Number(brightness.minNits.val),
                maxNits: Number(brightness.maxNits.val),
              },
              resolution: {
                hPx: Number(resolution.hPx.val),
                wPx: Number(resolution.wPx.val),
              },
              glassMaterial: glassMaterial.val,
              bezelMaterial: bezelMaterial.val,
              shape: shape.val,
              refreshRateHz: refreshRateHz.val
                ? Number(refreshRateHz.val)
                : null,
              ...(isCircular.val
                ? {
                    isCircular: true,
                    diameterMm: Number(diameterMm.val),
                  }
                : {
                    isCircular: false,
                    dimension: {
                      wMm: Number(dimension.wMm.val),
                      hMm: Number(dimension.hMm.val),
                      thicknessMm: Number(dimension.thicknessMm.val),
                    },
                  }),
            },
            caseMaterial: caseMaterial.val,
            watchWeightMg: Number(watchWeightMg.val),
            compatibleBandLugWidthMm: Number(compatibleBandLugWidthMm.val),
            releaseDate: releaseDate.val,
            stopSelling: stopSelling.val,
          };

          await createModel(model);
          toast.success("Product model updated successfully.");
          setContinueToCreateVariation(true);
        } catch (error) {
          toast.error(formatError(error));
        }
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUpdating: false,
      }));
    },
    [
      process.isProcessing,
      productId,
      canCreateModel,
      formData,
      getRequiredNumFieldErr,
      createModel,
    ]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (isFromContinueToCreate) {
      navigate("/admin/products", {
        replace: true,
      });
      return;
    }
    navigate(-1);
  }, [isFromContinueToCreate, navigate, process.isProcessing]);

  const handleContinueToCreate = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/admin/variation-models/create", {
      state: {
        fromCreateProduct: isFromContinueToCreate,
        fromCreateVariation: true,
      },
      replace: true,
    });
  }, [isFromContinueToCreate, navigate, process.isProcessing]);

  /*
    TODO:
      - UI to see is from continue create or not (better UI)
      - CreateModelSkeleton.
  */

  return (
    <>
      {process.isProcessing ? (
        <p>Loading...</p>
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !oses ? (
        <ApiError errMsg="Operating systems data not found." />
      ) : !product ? (
        <ApiError errMsg="Product data not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="fs-2 mb-0 d-flex gap-2">
              {isFromContinueToCreate ? (
                <>
                  <span className="text-muted text-small">Step: 2/N</span>
                  <p className="mb-0 fw-light">/</p>
                  Create Model for product {product.name}
                </>
              ) : (
                <>
                  <Link
                    to={"/admin/products"}
                    className="text-decoration-none text-black"
                  >
                    Model Management
                  </Link>
                  <p className="mb-0 fw-light">/</p>
                  Create Model for product {product.name}
                </>
              )}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left Column: Main Forms */}
              <div className="col-lg-8">
                {/* General Info */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">General Information</h2>
                  </div>
                  <div className="card-body">
                    {/* Name */}
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label">
                        Name
                        <FontAwesomeIcon
                          icon={faQuestionCircle}
                          className="ms-1 text-muted"
                          title="This model name will be displayed as a model option for the product."
                        />
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder="45mm GPS"
                        value={formData.name.val}
                        onChange={handleChange}
                        autoComplete="off"
                        disabled={process.isProcessing}
                      />
                      {formData.name.err && (
                        <InvalidInputMsg msg={formData.name.err} />
                      )}
                    </div>

                    {/* Prices */}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="priceCents" className="form-label">
                          Selling Price (&#65504; - cents)
                        </label>
                        <input
                          type="number"
                          id="priceCents"
                          name="priceCents"
                          className="form-control"
                          placeholder="9999"
                          value={formData.priceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.priceCents.err && (
                          <InvalidInputMsg msg={formData.priceCents.err} />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="stockPriceCents" className="form-label">
                          Stock Price (&#65504; - cents)
                        </label>
                        <input
                          type="number"
                          id="stockPriceCents"
                          name="stockPriceCents"
                          className="form-control"
                          placeholder="7999"
                          value={formData.stockPriceCents.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.stockPriceCents.err && (
                          <InvalidInputMsg msg={formData.stockPriceCents.err} />
                        )}
                      </div>
                    </div>

                    {/* Physical Specs */}
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label htmlFor="caseMaterial" className="form-label">
                          Case Material
                        </label>
                        <input
                          type="text"
                          id="caseMaterial"
                          name="caseMaterial"
                          className="form-control"
                          placeholder="Aluminum"
                          value={formData.caseMaterial.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.caseMaterial.err && (
                          <InvalidInputMsg msg={formData.caseMaterial.err} />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label htmlFor="watchWeightMg" className="form-label">
                          Weight (mg)
                        </label>
                        <input
                          type="number"
                          id="watchWeightMg"
                          name="watchWeightMg"
                          className="form-control"
                          placeholder="50000"
                          value={formData.watchWeightMg.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.watchWeightMg.err && (
                          <InvalidInputMsg msg={formData.watchWeightMg.err} />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="compatibleBandLugWidthMm"
                          className="form-label"
                        >
                          Band Lug Width (mm)
                        </label>
                        <input
                          type="number"
                          id="compatibleBandLugWidthMm"
                          name="compatibleBandLugWidthMm"
                          className="form-control"
                          placeholder="22"
                          value={formData.compatibleBandLugWidthMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.compatibleBandLugWidthMm.err && (
                          <InvalidInputMsg
                            msg={formData.compatibleBandLugWidthMm.err}
                          />
                        )}
                      </div>
                    </div>

                    {/* Release Date */}
                    <div className="mb-3">
                      <label htmlFor="releaseDate" className="form-label">
                        Release Date
                      </label>
                      <input
                        type="date"
                        id="releaseDate"
                        name="releaseDate"
                        className="form-control"
                        value={getLocalDateString(new Date())}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.releaseDate.err && (
                        <InvalidInputMsg msg={formData.releaseDate.err} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Screen */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Screen Specifications</h2>
                  </div>
                  <div className="card-body">
                    {/* Display Basic */}
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="screen.display.diagonalSizeInch"
                          className="form-label"
                        >
                          Diagonal Size (inch)
                        </label>
                        <input
                          type="number"
                          id="screen.display.diagonalSizeInch"
                          name="screen.display.diagonalSizeInch"
                          className="form-control"
                          placeholder="1.77"
                          value={formData.screen.display.diagonalSizeInch.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.display.diagonalSizeInch.err && (
                          <InvalidInputMsg
                            msg={formData.screen.display.diagonalSizeInch.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="screen.display.displayType"
                          className="form-label"
                        >
                          Display Type
                        </label>
                        <input
                          type="text"
                          id="screen.display.displayType"
                          name="screen.display.displayType"
                          className="form-control"
                          placeholder="AMOLED"
                          value={formData.screen.display.displayType.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.display.displayType.err && (
                          <InvalidInputMsg
                            msg={formData.screen.display.displayType.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="screen.refreshRateHz"
                          className="form-label"
                        >
                          Refresh Rate (Hz)
                        </label>
                        <input
                          type="number"
                          id="screen.refreshRateHz"
                          name="screen.refreshRateHz"
                          className="form-control"
                          placeholder="60"
                          value={formData.screen.refreshRateHz.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.refreshRateHz.err && (
                          <InvalidInputMsg
                            msg={formData.screen.refreshRateHz.err}
                          />
                        )}
                      </div>
                    </div>

                    {/* Resolution & Brightness */}
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <p className="form-label">Resolution (W x H px)</p>
                        <div className="input-group">
                          <input
                            type="number"
                            id="screen.resolution.wPx"
                            name="screen.resolution.wPx"
                            className="form-control"
                            placeholder="W: 396"
                            value={formData.screen.resolution.wPx.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                          <span className="input-group-text">
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="text-muted"
                            />
                          </span>
                          <input
                            type="number"
                            id="screen.resolution.hPx"
                            name="screen.resolution.hPx"
                            className="form-control"
                            placeholder="H: 484"
                            value={formData.screen.resolution.hPx.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                        </div>
                        {(formData.screen.resolution.wPx.err ||
                          formData.screen.resolution.hPx.err) && (
                          <InvalidInputMsg
                            msg={
                              formData.screen.resolution.wPx.err ||
                              formData.screen.resolution.hPx.err
                            }
                          />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <p className="form-label">
                          Brightness (Min - Max nits)
                        </p>
                        <div className="input-group">
                          <input
                            type="number"
                            id="screen.brightness.minNits"
                            name="screen.brightness.minNits"
                            className="form-control"
                            placeholder="Min: 100"
                            value={formData.screen.brightness.minNits.val}
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
                            id="screen.brightness.maxNits"
                            name="screen.brightness.maxNits"
                            className="form-control"
                            placeholder="Max: 1000"
                            value={formData.screen.brightness.maxNits.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                        </div>
                        {(formData.screen.brightness.minNits.err ||
                          formData.screen.brightness.maxNits.err) && (
                          <InvalidInputMsg
                            msg={
                              formData.screen.brightness.minNits.err ||
                              formData.screen.brightness.maxNits.err
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Materials & Shape */}
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="screen.glassMaterial"
                          className="form-label"
                        >
                          Glass Material
                        </label>
                        <input
                          type="text"
                          id="screen.glassMaterial"
                          name="screen.glassMaterial"
                          className="form-control"
                          placeholder="Ion-X Glass"
                          value={formData.screen.glassMaterial.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.glassMaterial.err && (
                          <InvalidInputMsg
                            msg={formData.screen.glassMaterial.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="screen.bezelMaterial"
                          className="form-label"
                        >
                          Bezel Material
                        </label>
                        <input
                          type="text"
                          id="screen.bezelMaterial"
                          name="screen.bezelMaterial"
                          className="form-control"
                          placeholder="Aluminum"
                          value={formData.screen.bezelMaterial.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.bezelMaterial.err && (
                          <InvalidInputMsg
                            msg={formData.screen.bezelMaterial.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label htmlFor="screen.shape" className="form-label">
                          Shape
                        </label>
                        <input
                          type="text"
                          id="screen.shape"
                          name="screen.shape"
                          className="form-control"
                          placeholder="Rectangular"
                          value={formData.screen.shape.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.shape.err && (
                          <InvalidInputMsg msg={formData.screen.shape.err} />
                        )}
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="screen.isCircular"
                          name="screen.isCircular"
                          checked={formData.screen.isCircular.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="screen.isCircular"
                        >
                          Is Circular Screen
                        </label>
                      </div>
                    </div>

                    {formData.screen.isCircular.val ? (
                      <div className="mb-3">
                        <label
                          htmlFor="screen.diameterMm"
                          className="form-label"
                        >
                          Diameter (mm)
                        </label>
                        <input
                          type="number"
                          id="screen.diameterMm"
                          name="screen.diameterMm"
                          className="form-control"
                          placeholder="42"
                          value={formData.screen.diameterMm.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.screen.diameterMm.err && (
                          <InvalidInputMsg
                            msg={formData.screen.diameterMm.err}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p className="form-label">
                          Dimensions (W x H x Thickness mm)
                        </p>
                        <div className="input-group">
                          <input
                            type="number"
                            id="screen.dimension.wMm"
                            name="screen.dimension.wMm"
                            className="form-control"
                            placeholder="W: 38"
                            value={formData.screen.dimension.wMm.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                          <span className="input-group-text">
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="text-muted"
                            />
                          </span>
                          <input
                            type="number"
                            name="screen.dimension.hMm"
                            className="form-control"
                            placeholder="H: 45"
                            value={formData.screen.dimension.hMm.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                          <span className="input-group-text">
                            <FontAwesomeIcon
                              icon={faTimes}
                              className="text-muted"
                            />
                          </span>
                          <input
                            type="number"
                            name="screen.dimension.thicknessMm"
                            className="form-control"
                            placeholder="T: 10.7"
                            value={formData.screen.dimension.thicknessMm.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                        </div>
                        {(formData.screen.dimension.wMm.err ||
                          formData.screen.dimension.hMm.err ||
                          formData.screen.dimension.thicknessMm.err) && (
                          <InvalidInputMsg
                            msg={
                              formData.screen.dimension.wMm.err ||
                              formData.screen.dimension.hMm.err ||
                              formData.screen.dimension.thicknessMm.err
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Battery */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Battery & Power</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="battery.capacityMah"
                          className="form-label"
                        >
                          Capacity (mAh)
                        </label>
                        <input
                          type="number"
                          id="battery.capacityMah"
                          name="battery.capacityMah"
                          className="form-control"
                          placeholder="309"
                          value={formData.battery.capacityMah.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.battery.capacityMah.err && (
                          <InvalidInputMsg
                            msg={formData.battery.capacityMah.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="battery.chargingType"
                          className="form-label"
                        >
                          Charging Type
                        </label>
                        <input
                          type="text"
                          id="battery.chargingType"
                          name="battery.chargingType"
                          className="form-control"
                          placeholder="Magnetic Charging Cable"
                          value={formData.battery.chargingType.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.battery.chargingType.err && (
                          <InvalidInputMsg
                            msg={formData.battery.chargingType.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="battery.timeFullChargeMin"
                          className="form-label"
                        >
                          Full Charge Time (min)
                        </label>
                        <input
                          type="number"
                          id="battery.timeFullChargeMin"
                          name="battery.timeFullChargeMin"
                          className="form-control"
                          placeholder="120"
                          value={formData.battery.timeFullChargeMin.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.battery.timeFullChargeMin.err && (
                          <InvalidInputMsg
                            msg={formData.battery.timeFullChargeMin.err}
                          />
                        )}
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <p className="form-label">AOD Time (On - Off min)</p>
                        <div className="input-group">
                          <input
                            type="number"
                            name="battery.timeOnline.aodOnMin"
                            className="form-control"
                            placeholder="On: 60"
                            value={formData.battery.timeOnline.aodOnMin.val}
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
                            name="battery.timeOnline.aodOffMin"
                            className="form-control"
                            placeholder="Off: 300"
                            value={formData.battery.timeOnline.aodOffMin.val}
                            onChange={handleChange}
                            disabled={process.isProcessing}
                          />
                        </div>
                        {(formData.battery.timeOnline.aodOnMin.err ||
                          formData.battery.timeOnline.aodOffMin.err) && (
                          <InvalidInputMsg
                            msg={
                              formData.battery.timeOnline.aodOnMin.err ||
                              formData.battery.timeOnline.aodOffMin.err
                            }
                          />
                        )}
                      </div>
                      <div className="col-md-3 mb-3">
                        <label
                          htmlFor="battery.timeOnline.typicalUsageMin"
                          className="form-label"
                        >
                          Typical (min)
                        </label>
                        <input
                          type="number"
                          id="battery.timeOnline.typicalUsageMin"
                          name="battery.timeOnline.typicalUsageMin"
                          className="form-control"
                          placeholder="1440"
                          value={
                            formData.battery.timeOnline.typicalUsageMin.val
                          }
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.battery.timeOnline.typicalUsageMin.err && (
                          <InvalidInputMsg
                            msg={
                              formData.battery.timeOnline.typicalUsageMin.err
                            }
                          />
                        )}
                      </div>
                      <div className="col-md-3 mb-3">
                        <label
                          htmlFor="battery.timeOnline.standByMin"
                          className="form-label"
                        >
                          Standby (min)
                        </label>
                        <input
                          type="number"
                          id="battery.timeOnline.standByMin"
                          name="battery.timeOnline.standByMin"
                          className="form-control"
                          placeholder="4320"
                          value={formData.battery.timeOnline.standByMin.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.battery.timeOnline.standByMin.err && (
                          <InvalidInputMsg
                            msg={formData.battery.timeOnline.standByMin.err}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Hardware Configuration</h2>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="config.chipset" className="form-label">
                          Chipset
                        </label>
                        <input
                          type="text"
                          id="config.chipset"
                          name="config.chipset"
                          className="form-control"
                          placeholder="Apple S8"
                          value={formData.config.chipset.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.config.chipset.err && (
                          <InvalidInputMsg msg={formData.config.chipset.err} />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="config.osId" className="form-label">
                          Operating System
                        </label>
                        <select
                          id="config.osId"
                          name="config.osId"
                          className="form-select"
                          value={formData.config.osId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        >
                          {oses.oses.oses.map((os) => (
                            <option key={os.id} value={os.id}>
                              {os.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="config.memory.ramBytes"
                          className="form-label"
                        >
                          RAM (bytes)
                        </label>
                        <input
                          type="number"
                          id="config.memory.ramBytes"
                          name="config.memory.ramBytes"
                          className="form-control"
                          placeholder="1048576"
                          value={formData.config.memory.ramBytes.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.config.memory.ramBytes.err && (
                          <InvalidInputMsg
                            msg={formData.config.memory.ramBytes.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="config.memory.storageBytes"
                          className="form-label"
                        >
                          Storage (bytes)
                        </label>
                        <input
                          type="number"
                          id="config.memory.storageBytes"
                          name="config.memory.storageBytes"
                          className="form-control"
                          placeholder="16777216"
                          value={formData.config.memory.storageBytes.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.config.memory.storageBytes.err && (
                          <InvalidInputMsg
                            msg={formData.config.memory.storageBytes.err}
                          />
                        )}
                      </div>
                      <div className="col-md-4 mb-3">
                        <label
                          htmlFor="config.camera.resolutionMp"
                          className="form-label"
                        >
                          Camera (MP)
                        </label>
                        <input
                          type="number"
                          id="config.camera.resolutionMp"
                          name="config.camera.resolutionMp"
                          className="form-control"
                          placeholder="12"
                          value={formData.config.camera.resolutionMp.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.config.camera.resolutionMp.err && (
                          <InvalidInputMsg
                            msg={formData.config.camera.resolutionMp.err}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor="config.connectivities"
                        className="form-label"
                      >
                        Connectivities
                      </label>
                      <TxtListInput
                        name="config.connectivities"
                        id="config.connectivities"
                        value={formData.config.connectivities.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "config.connectivities",
                            item,
                            action
                          )
                        }
                        placeholder="Wifi, Bluetooth, NFC"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="config.camera.features"
                        className="form-label"
                      >
                        Camera Features
                      </label>
                      <TxtListInput
                        name="config.camera.features"
                        id="config.camera.features"
                        value={formData.config.camera.features.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "config.camera.features",
                            item,
                            action
                          )
                        }
                        placeholder="None"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="config.compatiblePhoneOs"
                        className="form-label"
                      >
                        Compatible Phone OS
                      </label>
                      <TxtListInput
                        name="config.compatiblePhoneOs"
                        id="config.compatiblePhoneOs"
                        value={formData.config.compatiblePhoneOs.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "config.compatiblePhoneOs",
                            item,
                            action
                          )
                        }
                        placeholder="iOS"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="config.appsConnect"
                        className="form-label"
                      >
                        Apps Connect
                      </label>
                      <TxtListInput
                        name="config.appsConnect"
                        id="config.appsConnect"
                        value={formData.config.appsConnect.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "config.appsConnect",
                            item,
                            action
                          )
                        }
                        placeholder="Apple Health, Google Fit"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="config.sensors" className="form-label">
                        Sensors
                      </label>
                      <TxtListInput
                        name="config.sensors"
                        id="config.sensors"
                        value={formData.config.sensors.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "config.sensors",
                            item,
                            action
                          )
                        }
                        placeholder="Accelerometer, Gyroscope"
                        disabled={process.isProcessing}
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Features & Utilities</h2>
                  </div>
                  <div className="card-body">
                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="feature.speakerAndMicrophone"
                          name="feature.speakerAndMicrophone"
                          checked={formData.feature.speakerAndMicrophone.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="feature.speakerAndMicrophone"
                        >
                          Speaker and Microphone
                        </label>
                      </div>
                    </div>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label
                          htmlFor="feature.waterResistance.rating"
                          className="form-label"
                        >
                          Water Resistance Rating
                        </label>
                        <input
                          type="text"
                          id="feature.waterResistance.rating"
                          name="feature.waterResistance.rating"
                          className="form-control"
                          placeholder="5 ATM"
                          value={formData.feature.waterResistance.rating.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                        {formData.feature.waterResistance.rating.err && (
                          <InvalidInputMsg
                            msg={formData.feature.waterResistance.rating.err}
                          />
                        )}
                      </div>
                      <div className="col-md-6 mb-3">
                        <label
                          htmlFor="feature.waterResistance.description"
                          className="form-label"
                        >
                          Water Resistance Desc
                        </label>
                        <textarea
                          id="feature.waterResistance.description"
                          name="feature.waterResistance.description"
                          className="form-control"
                          rows={1}
                          placeholder="Water resistant up to 50 meters."
                          value={
                            formData.feature.waterResistance.description.val
                          }
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label
                        htmlFor="feature.utilities.healths"
                        className="form-label"
                      >
                        Health Utilities
                      </label>
                      <TxtListInput
                        name="feature.utilities.healths"
                        id="feature.utilities.healths"
                        value={formData.feature.utilities.healths.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "feature.utilities.healths",
                            item,
                            action
                          )
                        }
                        placeholder="Heart Rate Monitor, Sleep Tracking"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="feature.utilities.sports"
                        className="form-label"
                      >
                        Sports Utilities
                      </label>
                      <TxtListInput
                        name="feature.utilities.sports"
                        id="feature.utilities.sports"
                        value={formData.feature.utilities.sports.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "feature.utilities.sports",
                            item,
                            action
                          )
                        }
                        placeholder="Running, Cycling, Swimming"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="feature.utilities.specials"
                        className="form-label"
                      >
                        Special Utilities
                      </label>
                      <TxtListInput
                        name="feature.utilities.specials"
                        id="feature.utilities.specials"
                        value={formData.feature.utilities.specials.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "feature.utilities.specials",
                            item,
                            action
                          )
                        }
                        placeholder="ECG, Fall Detection"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="feature.utilities.others"
                        className="form-label"
                      >
                        Other Utilities
                      </label>
                      <TxtListInput
                        name="feature.utilities.others"
                        id="feature.utilities.others"
                        value={formData.feature.utilities.others.val}
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "feature.utilities.others",
                            item,
                            action
                          )
                        }
                        placeholder="Voice Assistant, Mobile Payments"
                        disabled={process.isProcessing}
                      />
                    </div>
                    <div className="mb-3">
                      <label
                        htmlFor="feature.supportedAppsForNotifications"
                        className="form-label"
                      >
                        Supported Apps for Notifications
                      </label>
                      <TxtListInput
                        name="feature.supportedAppsForNotifications"
                        id="feature.supportedAppsForNotifications"
                        value={
                          formData.feature.supportedAppsForNotifications.val
                        }
                        onChange={(item, action) =>
                          handleChangeItemInListField(
                            "feature.supportedAppsForNotifications",
                            item,
                            action
                          )
                        }
                        placeholder="Messages, Calls, Calendar"
                        disabled={process.isProcessing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Images & Status */}
              <div className="col-lg-4">
                {/* Images */}
                <div className="card shadow-sm mb-4">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Model Images</h2>
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

                {/* Status & Metadata */}
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
                        id="stopSelling"
                        name="stopSelling"
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
                        title="If enabled, this model won't be available for purchase."
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
                Cancel
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
            show={continueToCreateVariation}
            onHide={handleDiscard}
            onSubmit={handleContinueToCreate}
            custom={{
              action: "leave",
              title: "Continue creation process.",
              body: `Do you want to create a model for the variation ${
                formData.name.val || "N/A"
              } that you have just created?`,
              cancelText: "No, finish creation",
              submitText: "Yes, create variation",
            }}
          />
        </>
      )}
    </>
  );
}
