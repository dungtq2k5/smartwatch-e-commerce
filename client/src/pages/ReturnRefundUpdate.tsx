import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useReturnStore } from "../store/returnRefund/returnStore";
import { useUserAddressStore } from "../store/addressStore";
import { useReturnReasonStore } from "../store/returnRefund/returnReasonStore";
import type {
  OrderReturnResponse,
  OrderReturnUpdateSelf,
} from "../../../common/types.common";
import type { FormInput } from "../utils/types";
import {
  capFirstLetter,
  compareUserAddress,
  formatError,
  isValidBuyerReturnReason,
  readFileAsDataUrl,
} from "../../../common/utils.common";
import ApiError from "../components/ApiError";
import CreateAddressModal from "../components/modal/CreateAddressModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faTriangleExclamation,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  BUYER_RETURN_REASON_HINT_MESSAGE,
  BUYER_RETURN_REASON_MAX_LENGTH,
  MAX_ESTIMATE_PICKUP_TIME_GAP,
  MAX_ORDER_RETURN_IMG_UPLOAD,
  ORDER_RETURN_IMG_ALLOWED_TYPES,
  ORDER_RETURN_IMG_HINT_MESSAGE,
} from "../../../common/configs.common";
import { createFileList, getImgFilesErrs, uploadFile } from "../utils/utils";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../configs";
import { useReturnStateStore } from "../store/returnRefund/returnStateStore";
import ConfirmSubmitModal from "../components/modal/ConfirmSubmitModal";
import ReturnUpdateSkeleton from "../components/skeleton/ReturnUpdateSkeleton";

type FormData = {
  reasonId: string;
  imageUrls: {
    val: File[];
    err?: string;
  };
  currImageUrls: {
    val: string[];
  };
  buyerReason: FormInput;
  userAddressIdToPickup: {
    val: string;
    err?: string;
  };
  estimatePickupDate: string;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImgs: boolean;
  isUpdating: boolean;
};

export default function ReturnRefundUpdate() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`ReturnRefundUpdate render count: ${renderCount.current}`);

  const { orderId, returnId } = useParams();
  const navigate = useNavigate();

  const { fetchReturn, getUserAddressIdFromReturn, updateReturn } =
    useReturnStore();
  const { returnReasons, fetchReturnReasons } = useReturnReasonStore();
  const { getReturnStateByLookupId } = useReturnStateStore();
  const { addresses, fetchAddresses, getAddress } = useUserAddressStore();

  const [orderReturn, setOrderReturn] = useState<
    OrderReturnResponse | undefined
  >(undefined);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [showCreateAddrModal, setShowCreateAddrModal] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    reasonId: "",
    imageUrls: { val: [] },
    currImageUrls: { val: [] },
    buyerReason: { val: "" },
    userAddressIdToPickup: { val: "" },
    estimatePickupDate: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  const [process, setProcess] = useState<Process>({
    isProcessing: true, // For first page load
    isInitializing: true,
    isUploadingImgs: false,
    isUpdating: false,
  });

  const [cancelReturnModal, setCancelReturnModal] = useState<boolean>(false);

  // Fetch on initial or deps changes: orderReturn, returnReasons, addresses, setFormData
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!orderId || !returnId) {
          throw new Error("Order ID or Return ID is required.");
        }

        const [fetchedReturn, , userAddresses] = await Promise.all([
          fetchReturn(orderId, returnId),
          fetchReturnReasons(),
          fetchAddresses(),
        ]);

        setOrderReturn(fetchedReturn);

        // Pre-fill form data
        setFormData((prev) => ({
          ...prev,
          reasonId: fetchedReturn.reasonId,
          currImageUrls: { val: fetchedReturn.imageUrls },
          buyerReason: { val: fetchedReturn.buyerReason || "" },
          userAddressIdToPickup: {
            val:
              getUserAddressIdFromReturn(
                fetchedReturn.pickupAddress,
                userAddresses.addresses
              ) || "",
          },
          estimatePickupDate: fetchedReturn.estimatePickupDate,
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
  }, [orderId, returnId]);

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

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ): void => {
      if (!orderReturn || process.isProcessing) return;

      const { name, value: val, type } = e.target;

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
    [process.isProcessing, orderReturn]
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
    if (
      files.length + currFiles.length + formData.currImageUrls.val.length >
      MAX_ORDER_RETURN_IMG_UPLOAD
    ) {
      setFormData((prev) => ({
        ...prev,
        imageUrls: {
          ...prev.imageUrls,
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
    const imgFileErrs = await getImgFilesErrs(files, "order return");
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
  }, [
    formData.currImageUrls.val.length,
    formData.imageUrls.val,
    process.isProcessing,
  ]);

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
    [process.isProcessing]
  );

  const genImgPreviews = useCallback(
    (list: string[], type: "current" | "new"): JSX.Element[] => {
      return list.map((src, idx) => (
        <li
          key={`${src} - ${idx}`}
          className="position-relative d-inline-block me-2 mb-2"
        >
          <img
            src={src}
            alt={`Preview ${idx + 1} type ${type}`}
            className="create-return-img-preview--g"
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
        </li>
      ));
    },
    [handleRemoveImg, process.isProcessing]
  );

  const handleCancel = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate(-1);
  }, [navigate, process.isProcessing]);

  const handleSelectAddress = useCallback((newAddressId: string): void => {
    setFormData((prev) => ({
      ...prev,
      userAddressIdToPickup: { val: newAddressId },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another request is being processed, please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!orderReturn) {
        setApiErr("Order return data is not available.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (newFormData.imageUrls.val.length) {
          if (
            newFormData.imageUrls.val.length +
              newFormData.currImageUrls.val.length >
            MAX_ORDER_RETURN_IMG_UPLOAD
          ) {
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

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUpdating: true,
      }));
      if (await validateForm()) {
        const getChangedData = async (): Promise<OrderReturnUpdateSelf> => {
          const changedData: OrderReturnUpdateSelf = {};

          if (formData.reasonId !== orderReturn.reasonId) {
            changedData.reasonId = formData.reasonId;
          }
          if (formData.buyerReason.val !== (orderReturn.buyerReason || "")) {
            changedData.buyerReason = formData.buyerReason.val;
          }
          const newAddress = await getAddress(
            formData.userAddressIdToPickup.val
          );
          if (!newAddress) {
            throw new Error("Selected pickup address not found.");
          }
          if (!compareUserAddress(newAddress, orderReturn.pickupAddress)) {
            changedData.userAddressIdToPickup =
              formData.userAddressIdToPickup.val;
          }
          if (
            formData.estimatePickupDate.slice(0, 10) !==
            orderReturn.estimatePickupDate.slice(0, 10)
          ) {
            changedData.estimatePickupDate = formData.estimatePickupDate;
          }
          if (
            formData.imageUrls.val.length > 0 ||
            formData.currImageUrls.val.length !== orderReturn.imageUrls.length
          ) {
            const uploadedImgUrls: string[] = [];

            for (const imgUrl of formData.imageUrls.val) {
              const downloadUrl = await uploadFile(imgUrl, "order-return");
              if (!downloadUrl) {
                setFormData((prev) => ({
                  ...prev,
                  imageUrls: {
                    ...prev.imageUrls,
                    err: "Some images failed to upload. Please try again.",
                  },
                }));
                throw new Error(
                  "Some images failed to upload. Please try again."
                );
              }
              uploadedImgUrls.push(downloadUrl);
            }
            changedData.imageUrls = [
              ...formData.currImageUrls.val,
              ...uploadedImgUrls,
            ];
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          const { orderId, id: returnId } = orderReturn;
          await updateReturn(orderId, returnId, changedData);

          navigate(
            `/account/purchase/order/${orderId}/return-refund/${returnId}`,
            { replace: true }
          );
          toast.success("Return updated successfully.");
        } catch (error) {
          toast.error(formatError(error));
        } finally {
          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUpdating: false,
          }));
        }
        return;
      }
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isUpdating: false,
      }));
    },
    [
      formData,
      getAddress,
      navigate,
      orderReturn,
      process.isProcessing,
      updateReturn,
    ]
  );

  const handleCancelReturn = useCallback(async (): Promise<void> => {
    if (!orderReturn) {
      toast.error("Order return data is not available.");
      return;
    }
    if (process.isProcessing) {
      toast("Another request is being processed, please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({ ...prev, isProcessing: true }));
    try {
      const cancelState = await getReturnStateByLookupId("7");

      const { orderId, id: returnId } = orderReturn;
      await updateReturn(orderId, returnId, {
        stateId: cancelState.id,
      });

      // Notify & redirect
      navigate(`/account/purchase/order/${orderId}`, { replace: true });
      toast.success("Return has been cancelled.");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [
    getReturnStateByLookupId,
    navigate,
    orderReturn,
    process.isProcessing,
    updateReturn,
  ]);

  return (
    <>
      <main className="container--g">
        <h1 className="mb-4 fw-semibold text-center">Edit Return / Refund</h1>

        {!process.isInitializing ? (
          <ReturnUpdateSkeleton />
        ) : apiErr ? (
          <ApiError errMsg={apiErr} />
        ) : !orderReturn ? (
          <ApiError errMsg="Order return data not available." />
        ) : !returnReasons ? (
          <ApiError errMsg="Return reasons data not available." />
        ) : !addresses ? (
          <ApiError errMsg="User addresses data not available." />
        ) : (
          <>
            {/* Warning note */}
            <div className="d-flex align-items-center bg-warning-subtle mb-3 p-2 rounded">
              <FontAwesomeIcon
                icon={faBullhorn}
                className="me-2 text-warning"
              />
              <p className="mb-0">
                <span className="fw-bold">Note:</span> If you want to edit the
                items too, please{" "}
                <button
                  type="button"
                  className="btn btn-link text-danger p-0 border-0"
                  onClick={() => setCancelReturnModal(true)}
                  disabled={process.isProcessing}
                >
                  cancel this return
                </button>{" "}
                and make a new one instead.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-4">
                {/* Left Column: Form Details */}
                <div className="col-lg-8">
                  <div className="d-flex flex-column gap-4">
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
                                    {capFirstLetter(reason.name)} (
                                    {reason.description?.toLowerCase()})
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
                            <div
                              id="buyerReasonHelp"
                              className="form-text ms-1"
                            >
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
                        {imgPreviews.length === 0 &&
                        formData.currImageUrls.val.length === 0 ? (
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
                                (
                                {imgPreviews.length +
                                  formData.currImageUrls.val.length}
                                /{MAX_ORDER_RETURN_IMG_UPLOAD})
                              </span>
                            </p>
                            <ul className="list-unstyled d-flex flex-wrap gap-2">
                              {imgPreviews.length > 0 &&
                                genImgPreviews(imgPreviews, "new")}
                              {formData.currImageUrls.val.length > 0 &&
                                genImgPreviews(
                                  formData.currImageUrls.val,
                                  "current"
                                )}
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
                                    formData.userAddressIdToPickup.val ===
                                    addr.id
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
                          value={formData.estimatePickupDate.slice(0, 10)}
                          onChange={handleChange}
                        >
                          {[
                            ...Array(
                              MAX_ESTIMATE_PICKUP_TIME_GAP /
                                (24 * 60 * 60 * 1000)
                            ).keys(),
                          ].map((day) => {
                            day++; // Start from 1

                            const pickupDate = new Date(
                              Date.now() + day * 24 * 60 * 60 * 1000
                            );
                            const isoDate = pickupDate
                              .toISOString()
                              .slice(0, 10);
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
                        {process.isUpdating ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              aria-hidden="true"
                            ></span>
                            <output>Updating...</output>
                          </>
                        ) : (
                          "Update"
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
          </>
        )}
      </main>

      {/* Modals */}
      <CreateAddressModal
        isFirstAddress={addresses?.total === 0}
        show={showCreateAddrModal}
        onHide={() => setShowCreateAddrModal(false)}
        onSuccess={handleSelectAddress}
      />

      <ConfirmSubmitModal
        show={cancelReturnModal}
        onHide={() => setCancelReturnModal(false)}
        onSubmit={handleCancelReturn}
        custom={{
          action: "delete",
          title: "Confirm Cancel Return Request",
          body: "Are you sure you want to cancel this return request? You will need to create a new one if you still want to return the items.",
          cancelText: "No, go back",
          submitText: "Yes, cancel return",
        }}
      />
    </>
  );
}
