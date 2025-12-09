import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import useOrderStore from "../../store/user/orderStore";
import type {
  OrderResponse,
  OrderReturnCreate,
} from "../../../../common/types.common";
import { createFileList, getImgFilesErrs, uploadFile } from "../../utils/utils";
import ApiError from "../../components/common/ApiError";
import useReturnReasonStore from "../../store/common/returnRefund/returnReasonStore";
import useUserAddressStore from "../../store/user/addressStore";
import defaultProductImg from "../../assets/default-product.webp";
import SlashColor from "../../components/common/SlashColor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faTriangleExclamation,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import CreateAddressModal from "../../components/user/modal/CreateAddressModal";
import { useNavigate, useParams } from "react-router-dom";
import {
  BUYER_RETURN_REASON_HINT_MESSAGE,
  BUYER_RETURN_REASON_MAX_LENGTH,
  MAX_ESTIMATE_PICKUP_TIME_GAP,
  MAX_ORDER_RETURN_IMG_UPLOAD,
  ORDER_RETURN_IMG_ALLOWED_TYPES,
  ORDER_RETURN_IMG_HINT_MESSAGE,
} from "../../../../common/configs.common";
import {
  formatError,
  isValidBuyerReturnReason,
  readFileAsDataUrl,
} from "../../../../common/utils.common";
import type { FormInput } from "../../utils/types";
import toast from "react-hot-toast";
import useReturnStore from "../../store/user/orderReturnStore";
import { WAITING_EMOJI } from "../../configs";
import ReturnCreateSkeleton from "../../components/user/skeleton/ReturnCreateSkeleton";

type FormData = {
  reasonId: string;
  imageUrls: FormInput<File[]>;
  buyerReason: FormInput;
  userAddressIdToPickup: FormInput;
  estimatePickupDate: string;
  items: FormInput<"all" | { variationId: string; instanceId: string }[]>;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImgs: boolean;
  isCreating: boolean;
};

export default function ReturnRefundCreate() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`CreateReturnModal render count: ${renderCount.current}`);

  const { orderId } = useParams();
  const navigate = useNavigate();

  const { fetchOrder } = useOrderStore();
  const { returnReasons, fetchReturnReasons } = useReturnReasonStore();
  const { addresses, fetchAddresses } = useUserAddressStore();
  const { createReturn } = useReturnStore();

  const [order, setOrder] = useState<OrderResponse | undefined>(undefined);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [showCreateAddrModal, setShowCreateAddrModal] =
    useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    reasonId: "",
    imageUrls: { val: [] },
    buyerReason: { val: "" },
    userAddressIdToPickup: { val: "" },
    estimatePickupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10), // Default to next day
    items: { val: [], err: "" },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImgs: false,
    isCreating: false,
  });

  // Fetch on initial load or deps changes: order, return reasons, addresses, setFormData
  useEffect(() => {
    const handleFetchSetInitial = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!orderId) throw new Error("Order ID is required.");

        const [fetchedOrder, fetchedReasons, fetchedAddresses] =
          await Promise.all([
            fetchOrder(orderId),
            returnReasons
              ? Promise.resolve(returnReasons)
              : fetchReturnReasons(),
            addresses ? Promise.resolve(addresses) : fetchAddresses(),
          ]);

        setOrder(fetchedOrder);

        // Pre-select
        setFormData((prev) => {
          const newFormData = { ...prev };

          if (fetchedReasons.total) {
            newFormData.reasonId = fetchedReasons.reasons[0].id;
          }
          if (fetchedAddresses.total) {
            const defaultAddr = fetchedAddresses.addresses.find(
              (addr) => addr.isDefault
            );
            newFormData.userAddressIdToPickup = {
              val: defaultAddr
                ? defaultAddr.id
                : fetchedAddresses.addresses[0].id,
            };
          }
          return newFormData;
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

    handleFetchSetInitial();
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

  const returnableInstances = useMemo((): {
    variationId: string;
    instanceId: string;
  }[] => {
    if (!order) return [];

    return order.items.flatMap((item) =>
      item.instances
        .filter((inst) => inst.state === "ordered")
        .map((inst) => ({
          variationId: item.variation.id,
          instanceId: inst.id,
        }))
    );
  }, [order]);

  const handleSelectAddress = useCallback((newAddressId: string): void => {
    setFormData((prev) => ({
      ...prev,
      userAddressIdToPickup: { val: newAddressId },
    }));
  }, []);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ): void => {
      if (!order || process.isProcessing) return;

      const { name, value: val, type } = e.target;

      // Handle checkbox items change
      if (type === "checkbox" && name.startsWith("instance-")) {
        const checked = (e.target as HTMLInputElement).checked;
        const instanceId = name.split("instance-")[1];

        if (instanceId === "all") {
          setFormData((prev) => ({
            ...prev,
            items: { val: checked ? "all" : [] },
          }));
          return;
        }

        const variationId = e.target.dataset.variationId;
        if (!variationId) return;

        setFormData((prev) => {
          let updatedItems:
            | { variationId: string; instanceId: string }[]
            | "all" = [];

          /*
            Logic:
              - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
              - If individually selecting/deselecting, update the list accordingly.
              - If all items are selected individually, switch to "all".
              - If none-selected item -> display err.
          */

          if (prev.items.val === "all") {
            if (!checked) {
              // If "all" was selected, deselecting one means selecting all others
              updatedItems = returnableInstances.filter(
                (item) => item.instanceId !== instanceId
              );
            } else {
              // This case should not happen as all are already selected, but as fallback
              updatedItems = "all";
            }
          } else {
            updatedItems = [...prev.items.val];
            if (checked) {
              updatedItems.push({ variationId, instanceId });
            } else {
              updatedItems = updatedItems.filter(
                (item) => item.instanceId !== instanceId
              );
            }
          }

          // If all instances are now selected, switch to "all"
          return {
            ...prev,
            items: {
              val:
                updatedItems.length === returnableInstances.length
                  ? "all"
                  : updatedItems,
              err:
                updatedItems !== "all" && updatedItems.length > 0
                  ? undefined
                  : "Must select at least one item to return.",
            },
          };
        });
        return;
      }

      // Handle radio button for address selection
      if (type === "radio" && name === "userAddressIdToPickup") {
        setFormData((prev) => ({
          ...prev,
          userAddressIdToPickup: { val },
        }));
        return;
      }

      // Handle buyerReason change
      if (name === "buyerReason") {
        const err =
          val && !isValidBuyerReturnReason(val) // Allow empty
            ? "Return reason is invalid."
            : "";
        setFormData((prev) => ({
          ...prev,
          buyerReason: { val, err },
        }));
        return;
      }

      // Handle other input/select change
      setFormData((prev) => ({
        ...prev,
        [name]: val,
      }));
    },
    [order, process.isProcessing, returnableInstances]
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
    if (files.length + currFiles.length > MAX_ORDER_RETURN_IMG_UPLOAD) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          val: currFiles,
          err: `You can upload up to ${MAX_ORDER_RETURN_IMG_UPLOAD} images.`,
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
    const validationErrs = await getImgFilesErrs(files, "order return");
    if (validationErrs.length > 0) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          val: currFiles,
          err: `Invalid files found: ${validationErrs.join(", ")}`,
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
      imageUrls: {
        val: [...currFiles, ...files],
        err: undefined,
      },
    }));
    setProcess((prev) => ({
      ...prev,
      isProcessing: false,
      isUploadingImgs: false,
    }));
  }, [formData.imageUrls.val, process.isProcessing]);

  const handleRemoveImg = useCallback((idx: number): void => {
    setFormData((prev) => {
      const updatedImgs = [...prev.imageUrls.val];
      updatedImgs.splice(idx, 1);

      return { ...prev, imageUrls: { val: updatedImgs, err: "" } };
    });
  }, []);

  const genImgPreviews = useCallback((): JSX.Element[] => {
    return imgPreviews.map((src, idx) => (
      <li
        key={`${src} - ${idx}`}
        className="position-relative d-inline-block me-2 mb-2"
      >
        <img
          src={src}
          alt={`Preview ${idx + 1}`}
          className="create-return-img-preview--g"
        />
        <button
          type="button"
          className="btn border-0 position-absolute top-0 end-0 p-1 bg-white rounded-1"
          onClick={() => handleRemoveImg(idx)}
          aria-label={`Remove image ${idx + 1}`}
          style={{ zIndex: 1 }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </li>
    ));
  }, [handleRemoveImg, imgPreviews]);

  const genSelectItem = useCallback(
    (item: OrderResponse["items"][0]): JSX.Element => {
      const productDisplayName = `${item.variation.productModel.product.name} - ${item.variation.productModel.name}`;

      return (
        <div key={item.variation.id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex gap-3">
              <img
                src={item.variation.imageUrls[0] || defaultProductImg}
                alt={productDisplayName}
                loading="lazy"
                className="purchase-item-img--g rounded"
              />
              <div className="flex-grow-1">
                <p className="fw-semibold mb-1">{productDisplayName}</p>
                <div className="d-flex align-items-center small text-muted mb-2">
                  <SlashColor
                    hexColor={item.variation.color.hex}
                    size="medium"
                    className="me-1"
                  />
                  {item.variation.color.name}
                </div>
                <div className="d-flex flex-column gap-2">
                  {item.instances.map((instance) => {
                    const isReturnable = instance.state === "ordered";

                    return (
                      <div
                        key={instance.id}
                        className={`form-check ${
                          !isReturnable ? "opacity-50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          name={`instance-${instance.id}`}
                          id={`instance-${instance.id}`}
                          className="form-check-input"
                          disabled={!isReturnable}
                          data-variation-id={item.variation.id}
                          checked={
                            isReturnable &&
                            (formData.items.val === "all" ||
                              formData.items.val.some(
                                (i) => i.instanceId === instance.id
                              ))
                          }
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`instance-${instance.id}`}
                        >
                          {`SKU: ${instance.sku}`}
                        </label>
                        {!isReturnable && (
                          <span className="badge bg-secondary ms-2 text-capitalize">
                            {instance.state}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
    [formData.items.val, handleChange]
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
      if (!orderId) {
        toast.error("Order ID is required.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (newFormData.imageUrls.val.length) {
          if (newFormData.imageUrls.val.length > MAX_ORDER_RETURN_IMG_UPLOAD) {
            newFormData.imageUrls.err = `You can upload up to ${MAX_ORDER_RETURN_IMG_UPLOAD} images.`;
            allValid = false;
          } else {
            const imgFileErrs = await getImgFilesErrs(
              newFormData.imageUrls.val,
              "order return"
            );
            if (imgFileErrs.length) {
              newFormData.imageUrls.err = `Invalid files found: ${imgFileErrs.join(
                ", "
              )}`;
              allValid = false;
            }
          }
        }
        if (
          newFormData.buyerReason.val &&
          !isValidBuyerReturnReason(newFormData.buyerReason.val)
        ) {
          newFormData.buyerReason.err = "Return reason is invalid.";
          allValid = false;
        }
        if (!newFormData.userAddressIdToPickup.val) {
          newFormData.userAddressIdToPickup.err =
            "Must select a pickup address.";
          allValid = false;
        }
        if (
          newFormData.items.val !== "all" &&
          newFormData.items.val.length === 0
        ) {
          newFormData.items.err = "Must select at least one item to return.";
          allValid = false;
        }

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isCreating: true,
      }));
      if (await validateForm()) {
        const data: OrderReturnCreate = {
          reasonId: formData.reasonId,
          userAddressIdToPickup: formData.userAddressIdToPickup.val,
          estimatePickupDate: formData.estimatePickupDate,
          items:
            formData.items.val === "all"
              ? "all"
              : formData.items.val.reduce(
                  (acc, { variationId, instanceId }) => {
                    const found = acc.find(
                      (item) => item.variationId === variationId
                    );
                    if (!found) {
                      acc.push({ variationId, instanceIds: [instanceId] });
                    } else {
                      found.instanceIds.push(instanceId);
                    }
                    return acc;
                  },
                  [] as { variationId: string; instanceIds: string[] }[]
                ),
        };
        if (formData.imageUrls.val.length > 0) {
          const downloadUrls: string[] = [];
          for (const img of formData.imageUrls.val) {
            const downloadUrl = await uploadFile(img, "order-return");
            if (!downloadUrl) throw new Error("Failed to upload image.");
            downloadUrls.push(downloadUrl);
          }
          data.imageUrls = downloadUrls;
        }
        if (formData.buyerReason.val) {
          data.buyerReason = formData.buyerReason.val;
        }

        try {
          const orderReturn = await createReturn(orderId, data);

          navigate(
            `/account/purchase/order/${orderId}/return-refund/${orderReturn.id}`,
            { replace: true }
          );
          toast.success("Return request created successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isCreating: false,
          }));
        }
        return;
      }
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreating: false,
      }));
    },
    [createReturn, formData, navigate, orderId, process.isProcessing]
  );

  const handleCancel = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate(-1);
  }, [navigate, process.isProcessing]);

  return (
    <>
      <main className="container--g">
        <h1 className="mb-4 fw-semibold text-center">Return / Refund</h1>

        {process.isInitializing ? (
          <ReturnCreateSkeleton />
        ) : apiErr ? (
          <ApiError errMsg={apiErr} />
        ) : !order ? (
          <ApiError errMsg="Order data not available." />
        ) : !returnReasons ? (
          <ApiError errMsg="Return reasons not available." />
        ) : !addresses ? (
          <ApiError errMsg="User addresses not available." />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* Left Column: Form Details */}
              <div className="col-lg-8">
                <div className="d-flex flex-column gap-4">
                  {/* Select items and their instances */}
                  <div className="card shadow-sm">
                    <div className="card-header bg-white py-3">
                      <h2 className="h5 mb-0">Select Items to Return</h2>
                    </div>
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3 bg-warning-subtle p-2 rounded">
                        <FontAwesomeIcon
                          icon={faBullhorn}
                          className="me-2 text-warning"
                        />
                        <p className="mb-0">
                          <span className="fw-bold">Note:</span> If you have
                          multiple products to refund, please submit all product
                          in a single request.
                        </p>
                      </div>
                      {/* Select all */}
                      <div className="form-check mb-3">
                        <input
                          type="checkbox"
                          name="instance-all"
                          id="instance-all"
                          className="form-check-input"
                          checked={formData.items.val === "all"}
                          onChange={handleChange}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="instance-all"
                        >
                          Select all returnable item
                        </label>
                      </div>
                      {/* Select instances */}
                      <div className="create-return-items-container">
                        {order.items.map(genSelectItem)}
                      </div>
                      {formData.items.err && (
                        <div className="text-danger small mt-1 ms-1">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="me-2"
                          />
                          {formData.items.err}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reason for return */}
                  <div className="card shadow-sm">
                    <div className="card-header bg-white py-3">
                      <h2 className="h5 mb-0">Reason for Return</h2>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        {/* Select reason */}
                        <div>
                          <div className="form-floating">
                            <select
                              name="reasonId"
                              id="reasonId"
                              className="form-select"
                              value={formData.reasonId}
                              onChange={handleChange}
                            >
                              {returnReasons.reasons.map((reason) => (
                                <option key={reason.id} value={reason.id}>
                                  <span className="text-capitalize">
                                    {reason.name}
                                  </span>{" "}
                                  ({reason.description?.toLowerCase()})
                                </option>
                              ))}
                            </select>
                            <label htmlFor="reasonId">Select a reason</label>
                          </div>
                        </div>
                        {/* Additional details */}
                        <div className="col-12">
                          <p className="mb-0 ms-1">
                            Your specific reason to return (optional){" "}
                            <span className="small text-muted">
                              ({formData.buyerReason.val.length}/
                              {BUYER_RETURN_REASON_MAX_LENGTH})
                            </span>
                          </p>
                          <div className="form-floating">
                            <textarea
                              name="buyerReason"
                              id="buyerReason"
                              className="form-control"
                              value={formData.buyerReason.val}
                              placeholder="Please provide more details about the issue."
                              onChange={handleChange}
                              aria-describedby="buyerReasonHelp"
                              style={{ height: "100px" }}
                            ></textarea>
                            <label htmlFor="buyerReason">
                              Please provide more details about the issue
                            </label>
                          </div>
                          {formData.buyerReason.err && (
                            <div className="text-danger small mt-1 ms-1">
                              <FontAwesomeIcon
                                icon={faTriangleExclamation}
                                className="me-2"
                              />
                              {formData.buyerReason.err}
                            </div>
                          )}
                          <div id="buyerReasonHelp" className="form-text ms-1">
                            {BUYER_RETURN_REASON_HINT_MESSAGE}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Images upload and previews */}
                  <div className="card shadow-sm">
                    <div className="card-header bg-white py-3">
                      <h2 className="h5 mb-0">Upload Images (optional)</h2>
                    </div>
                    <div className="card-body">
                      <p className="text-muted">
                        Provide some images for us to easier to validate the
                        products' conditions.
                      </p>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <input
                          type="file"
                          name="imageUrls"
                          id="imageUrls"
                          className="form-control"
                          ref={fileInputRef}
                          accept={ORDER_RETURN_IMG_ALLOWED_TYPES.join(",")}
                          aria-describedby="imgHelp"
                          multiple
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          style={{ whiteSpace: "nowrap" }}
                          onClick={handleUploadImgs}
                          disabled={process.isProcessing}
                        >
                          {process.isUploadingImgs ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                aria-hidden="true"
                              ></span>
                              <output>Uploading...</output>
                            </>
                          ) : (
                            <>
                              <FontAwesomeIcon
                                icon={faUpload}
                                className="me-2"
                              />
                              Upload Images
                            </>
                          )}
                        </button>
                      </div>
                      {formData.imageUrls.err && (
                        <div className="text-danger small mt-1 ms-1">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="me-2"
                          />
                          {formData.imageUrls.err}
                        </div>
                      )}
                      <div id="imgHelp" className="form-text">
                        {ORDER_RETURN_IMG_HINT_MESSAGE}
                      </div>

                      {/* Images previews */}
                      {imgPreviews.length === 0 ? (
                        <p className="text-muted mt-3 mb-0">
                          Your uploaded images will be displayed here.
                        </p>
                      ) : (
                        <div className="mt-3">
                          <p>
                            <span className="fw-semibold me-1">
                              Image Previews
                            </span>
                            <span className="small text-muted">
                              ({imgPreviews.length}/
                              {MAX_ORDER_RETURN_IMG_UPLOAD})
                            </span>
                          </p>
                          <ul className="list-unstyled d-flex flex-wrap gap-2">
                            {genImgPreviews()}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pickup address time, submit buttons */}
              <div className="col-lg-4">
                <div
                  className="card shadow-sm position-sticky"
                  style={{ top: "1rem" }}
                >
                  <div className="card-header bg-white py-3">
                    <h2 className="h5 mb-0">Pickup Address & Time</h2>
                  </div>
                  <div className="card-body">
                    {/* Pickup Address */}
                    <div>
                      <p className="fs-5 mb-3">Select Pickup Address</p>
                      <div className="create-return-items-container">
                        {addresses.total === 0 ? (
                          <div className="d-flex align-items-center gap-1">
                            <p className="mb-0">No address found, please</p>
                            <button
                              type="button"
                              className="btn btn-link m-0 p-0"
                              onClick={() => setShowCreateAddrModal(true)}
                              disabled={process.isProcessing}
                            >
                              add one.
                            </button>
                          </div>
                        ) : (
                          addresses.addresses.map((addr) => (
                            <div
                              key={addr.id}
                              className="d-flex border rounded p-3 mb-2 gap-2"
                            >
                              <input
                                type="radio"
                                name="userAddressIdToPickup"
                                id={`addr-${addr.id}`}
                                value={addr.id}
                                className="form-check-input"
                                checked={
                                  formData.userAddressIdToPickup.val === addr.id
                                }
                                onChange={handleChange}
                              />
                              <label
                                className="form-check-label address-select-label--g"
                                htmlFor={`addr-${addr.id}`}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <div>
                                    <span className="fw-semibold me-2">
                                      {addr.name}
                                    </span>
                                    <span className="text-muted">
                                      {addr.phoneNumber}
                                    </span>
                                  </div>
                                  {addr.isDefault && (
                                    <span className="badge bg-primary">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-muted mb-0">
                                  {addr.fullAddress}
                                </p>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      {formData.userAddressIdToPickup.err && (
                        <div className="text-danger small mt-1 ms-1">
                          <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="me-2"
                          />
                          {formData.userAddressIdToPickup.err}
                        </div>
                      )}
                      <div className="d-flex justify-content-end">
                        <button
                          type="button"
                          className="btn btn-link mt-1 p-0"
                          onClick={() => setShowCreateAddrModal(true)}
                          disabled={process.isProcessing}
                        >
                          Add new address
                        </button>
                      </div>
                    </div>

                    <hr />

                    {/* Pickup Date */}
                    <div className="form-floating">
                      <select
                        name="estimatePickupDate"
                        id="estimatePickupDate"
                        className="form-select"
                        value={formData.estimatePickupDate}
                        onChange={handleChange}
                      >
                        {[
                          ...new Array(
                            MAX_ESTIMATE_PICKUP_TIME_GAP / (24 * 60 * 60 * 1000)
                          ).keys(),
                        ].map((day) => {
                          day++; // Start from 1

                          const pickupDate = new Date(
                            Date.now() + day * 24 * 60 * 60 * 1000
                          );
                          const isoDate = pickupDate.toISOString().slice(0, 10);
                          const localDateString =
                            pickupDate.toLocaleDateString();

                          return (
                            <option key={day} value={isoDate}>
                              In {day} day{day !== 1 ? "s" : ""} - (
                              {localDateString})
                            </option>
                          );
                        })}
                      </select>
                      <label htmlFor="estimatePickupDate">
                        Select a date to pickup
                      </label>
                    </div>
                  </div>

                  <div className="card-footer d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={process.isProcessing}
                    >
                      {process.isCreating ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            aria-hidden="true"
                          ></span>
                          <output>Submitting...</output>
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary w-100"
                      onClick={handleCancel}
                      disabled={process.isProcessing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Create Address Modal */}
      <CreateAddressModal
        isFirstAddress={addresses?.total === 0}
        show={showCreateAddrModal}
        onHide={() => setShowCreateAddrModal(false)}
        onSuccess={handleSelectAddress}
      />
    </>
  );
}
