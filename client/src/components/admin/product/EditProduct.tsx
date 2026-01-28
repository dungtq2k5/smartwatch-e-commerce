import { useNavigate, useParams } from "react-router-dom";
import {
  MAX_PRODUCT_IMG_UPLOAD,
  PRODUCT_IMAGE_ALLOWED_TYPES,
  PRODUCT_IMAGE_HINT_MESSAGE,
  PRODUCT_TYPES,
} from "../../../../../common/configs.common";
import {
  capFirstLetter,
  formatError,
  isValidProductName,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import type {
  AdminProductResponse,
  ProductUpdate,
} from "../../../../../common/types.common";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQuestionCircle,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import useProductStore from "../../../store/admin/product/productStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { FormInput } from "../../../utils/types";
import useProductBrandStore from "../../../store/common/product/brandStore";
import useProductCategoryStore from "../../../store/common/product/categoryStore";
import toast from "react-hot-toast";
import {
  createFileList,
  getImgFilesErrs,
  uploadFile,
} from "../../../utils/utils";
import ApiError from "../../common/ApiError";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import useUserStore from "../../../store/admin/userStore";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import LinkBtn from "../../common/LinkBtn";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImages: boolean;
  isUpdating: boolean;
};

type FormData = {
  name: FormInput;
  type: FormInput<(typeof PRODUCT_TYPES)[number]>;
  brandId: FormInput;
  categoryId: FormInput;
  description: FormInput;
  imageUrls: FormInput<File[]>;
  currImageUrls: FormInput<string[], undefined>;
  stopSelling: boolean;
  basePriceCents: FormInput;
};

export function EditProduct() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`EditProduct render count:`, renderCount.current);

  const { id } = useParams();
  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { brands, fetchBrands } = useProductBrandStore();
  const { categories, fetchCategories } = useProductCategoryStore();
  const { fetchProduct, updateProduct } = useProductStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditProduct, canReadUser, canReadModel, canReadVariation] = [
    useHasPermission("u_product"),
    useHasPermission("r_usr"),
    useHasPermission("r_product_model"),
    useHasPermission("r_model_variation"),
  ];

  const [product, setProduct] = useState<AdminProductResponse | null>(null);
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImages: false,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    type: { val: PRODUCT_TYPES[0] },
    brandId: { val: "" },
    categoryId: { val: "" },
    description: { val: "" },
    imageUrls: { val: [] },
    currImageUrls: { val: [] },
    stopSelling: false,
    basePriceCents: { val: "" },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  // Fetch set data on initial load: sysUserId, product, brands, categories, formData
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("Product ID is missing.");

        const [fetchedProduct, fetchedBrands, fetchedCates] = await Promise.all(
          [
            fetchProduct(id),
            brands ? Promise.resolve(brands) : fetchBrands(),
            categories ? Promise.resolve(categories) : fetchCategories(),
            sysUserId ? Promise.resolve() : fetchSysUserId(),
          ]
        );

        // Handle case product's brand/category is soft deleted -> auto select
        fetchedProduct.brandId = fetchedBrands.brands.brands.some(
          (b) => b.id === fetchedProduct.brandId
        )
          ? fetchedProduct.brandId
          : fetchedBrands.brands.brands[0]?.id || "";
        fetchedProduct.categoryId = fetchedCates.categories.categories.some(
          (c) => c.id === fetchedProduct.categoryId
        )
          ? fetchedProduct.categoryId
          : fetchedCates.categories.categories[0]?.id || "";

        setProduct(fetchedProduct);
        updateFormData(fetchedProduct);
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

  const updateFormData = useCallback((product: AdminProductResponse): void => {
    const copiedProduct = structuredClone(product);

    setFormData((prev) => ({
      ...prev,
      name: { val: copiedProduct.name },
      type: { val: copiedProduct.type },
      brandId: { val: copiedProduct.brandId },
      categoryId: { val: copiedProduct.categoryId },
      description: { val: copiedProduct.description },
      imageUrls: { val: [] },
      currImageUrls: { val: copiedProduct.imageUrls },
      stopSelling: copiedProduct.stopSelling,
      basePriceCents: { val: copiedProduct.basePriceCents.toString() },
    }));
  }, []);

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ): void => {
      if (process.isProcessing) return;

      const { name, value: val, type } = e.target;

      setFormData((prev) => {
        if (name === "stopSelling" && type === "checkbox") {
          return {
            ...prev,
            [name]: (e.target as HTMLInputElement).checked,
          };
        }

        let err = undefined;
        if (!val && ["name", "description", "basePriceCents"].includes(name)) {
          err = `${capFirstLetter(name)} is required.`;
        } else if (name === "name" && !isValidProductName(val)) {
          err = "Product name is invalid.";
        } else if (name === "basePriceCents" && Number(val) < 0) {
          err = "Base price is invalid.";
        }

        return {
          ...prev,
          [name]: { val, err },
        };
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
    if (
      files.length + currFiles.length + formData.currImageUrls.val.length >
      MAX_PRODUCT_IMG_UPLOAD
    ) {
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
      if (!product) {
        toast.error("Product data is not found. Please refresh and try again.");
        return;
      }
      if (!canEditProduct) {
        toast.error("You do not have permission to edit products.");
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (!newFormData.name.val) {
          newFormData.name.err = "Product name is required.";
          allValid = false;
        } else if (!isValidProductName(newFormData.name.val)) {
          newFormData.name.err = "Product name is invalid.";
          allValid = false;
        }
        if (
          !newFormData.description.val ||
          !removeOddSpaces(newFormData.description.val)
        ) {
          newFormData.description.err = "Description is required.";
          allValid = false;
        }
        if (!newFormData.basePriceCents.val) {
          newFormData.basePriceCents.err = "Base price is required.";
          allValid = false;
        } else if (Number(newFormData.basePriceCents.val) < 0) {
          newFormData.basePriceCents.err = "Base price is invalid.";
          allValid = false;
        }
        if (newFormData.imageUrls.val.length) {
          if (
            newFormData.imageUrls.val.length +
              newFormData.currImageUrls.val.length >
            MAX_PRODUCT_IMG_UPLOAD
          ) {
            newFormData.imageUrls.err = `You can upload up to ${MAX_PRODUCT_IMG_UPLOAD} images.`;
            allValid = false;
          } else {
            const imgFileErrs = await getImgFilesErrs(
              newFormData.imageUrls.val,
              "product-image"
            );
            if (imgFileErrs.length > 0) {
              newFormData.imageUrls.err = `Invalid files found: ${imgFileErrs.join(
                ", "
              )}`;
              allValid = false;
            }
          }
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
        const getChangedData = async (): Promise<ProductUpdate> => {
          const changedData: ProductUpdate = {};

          if (formData.name.val !== product.name) {
            changedData.name = formData.name.val;
          }
          if (formData.type.val !== product.type) {
            changedData.type = formData.type.val;
          }
          if (formData.brandId.val !== product.brandId) {
            changedData.brandId = formData.brandId.val;
          }
          if (formData.categoryId.val !== product.categoryId) {
            changedData.categoryId = formData.categoryId.val;
          }
          if (formData.description.val !== product.description) {
            changedData.description = formData.description.val;
          }
          if (formData.stopSelling !== product.stopSelling) {
            changedData.stopSelling = formData.stopSelling;
          }
          if (
            formData.basePriceCents.val !== product.basePriceCents.toString()
          ) {
            changedData.basePriceCents = Number(formData.basePriceCents.val);
          }
          if (
            formData.imageUrls.val.length > 0 ||
            formData.currImageUrls.val.length !== product.imageUrls.length
          ) {
            const uploadedImgUrls: string[] = [];

            for (const imgUrl of formData.imageUrls.val) {
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

          await updateProduct(product.id, changedData);
          const updatedProduct = await fetchProduct(product.id);

          setProduct(updatedProduct);
          updateFormData(updatedProduct);

          toast.success("Product updated successfully.");
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
      process.isProcessing,
      product,
      canEditProduct,
      formData,
      updateProduct,
      fetchProduct,
      updateFormData,
    ]
  );

  return (
    <>
      {process.isInitializing ? (
        <p>Loading...</p> // TODO loading skeleton
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !brands ? (
        <ApiError errorMessage="Product brands data is not found." />
      ) : !categories ? (
        <ApiError errorMessage="Product categories data is not found." />
      ) : !product ? (
        <ApiError errorMessage="Product data is not found." />
      ) : !sysUserId ? (
        <ApiError errorMessage="System user ID data not found." />
      ) : (
        <>
          {/* Heading */}
          <Title
            title={`Edit Product #ID ${product.id}`}
            parentTitle="Product Management"
            parentLink="/admin/products"
            className="mb-4"
          />

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* Left column */}
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
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder={product.name}
                        value={formData.name.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.name.err && (
                        <InvalidInputMsg msg={formData.name.err} />
                      )}
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        className="form-control"
                        rows={4}
                        placeholder={product.description}
                        value={formData.description.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.description.err && (
                        <InvalidInputMsg msg={formData.description.err} />
                      )}
                    </div>

                    <div className="row">
                      {/* Type */}
                      <div className="col-md-4 mb-3">
                        <label htmlFor="type" className="form-label">
                          Type
                        </label>
                        <select
                          id="type"
                          name="type"
                          className="form-select"
                          value={formData.type.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        >
                          {PRODUCT_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {capFirstLetter(type)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Brand */}
                      <div className="col-md-4 mb-3">
                        <label htmlFor="brandId" className="form-label">
                          Brand
                        </label>
                        <select
                          id="brandId"
                          name="brandId"
                          className="form-select"
                          value={formData.brandId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        >
                          {brands.brands.brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Category */}
                      <div className="col-md-4 mb-3">
                        <label htmlFor="categoryId" className="form-label">
                          Category
                        </label>
                        <select
                          id="categoryId"
                          name="categoryId"
                          className="form-select"
                          value={formData.categoryId.val}
                          onChange={handleChange}
                          disabled={process.isProcessing}
                        >
                          {categories.categories.categories.map((cate) => (
                            <option key={cate.id} value={cate.id}>
                              {cate.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Base Price */}
                    <div className="mb-3">
                      <label htmlFor="basePriceCents" className="form-label">
                        Base price (in &#65504; - cents)
                      </label>
                      <input
                        type="number"
                        id="basePriceCents"
                        name="basePriceCents"
                        className="form-control"
                        placeholder={product.basePriceCents.toString()}
                        min={0}
                        value={formData.basePriceCents.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      {formData.basePriceCents.err && (
                        <InvalidInputMsg msg={formData.basePriceCents.err} />
                      )}
                    </div>

                    {/* Stop Selling */}
                    <div className="form-check form-switch mt-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="stopSelling"
                        name="stopSelling"
                        checked={formData.stopSelling}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                      />
                      <label className="form-check-label" htmlFor="stopSelling">
                        Stop selling this product
                      </label>
                      <FontAwesomeIcon
                        icon={faQuestionCircle}
                        size="sm"
                        className="text-muted ms-2"
                        title="If enabled, this product and its models or variations won't be able for purchase."
                      />
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
                          value={product.id}
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <p className="form-label mb-2">Created by</p>
                        <DetailUserLink
                          userId={product.createdBy.id}
                          title="View user details"
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          className="form-control bg-grey--g"
                        >
                          {product.createdBy.fullName}
                        </DetailUserLink>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label htmlFor="createdAt" className="form-label">
                          Created at
                        </label>
                        <input
                          type="text"
                          id="createdAt"
                          className="form-control"
                          value={new Date(product.createdAt).toLocaleString()}
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
                          value={new Date(product.updatedAt).toLocaleString()}
                          disabled
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <p className="form-label mb-0">
                          Total related models:{" "}
                          <LinkBtn
                            to={`/admin/product-models?searchTerm=${product.id}`}
                            title="View models of this product"
                            disabled={!canReadModel}
                            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          >
                            {product.totalModels}
                          </LinkBtn>
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <p className="form-label mb-0">
                          Total related variations:{" "}
                          <LinkBtn
                            to={`/admin/model-variations?searchTerm=${product.id}`}
                            title="View variations of this product"
                            disabled={!canReadVariation}
                            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          >
                            {product.totalVariations}
                          </LinkBtn>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="col-lg-4">
                {/* Images Card */}
                <div className="card shadow-sm">
                  <div className="card-header">
                    <h2 className="fs-5 mb-0">Product Images</h2>
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
                      <label htmlFor="imageUrls" className="form-label">
                        Upload new images
                      </label>
                      <input
                        type="file"
                        id="imageUrls"
                        name="imageUrls"
                        className="form-control"
                        multiple
                        accept={PRODUCT_IMAGE_ALLOWED_TYPES.join(",")}
                        aria-describedby="imgHelp"
                        ref={fileInputRef}
                        disabled={process.isProcessing}
                      />
                      <Btn
                        type="button"
                        className="btn btn-outline-primary mt-2 w-100"
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
