import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import type { FormInput } from "../../../utils/types";
import {
  MAX_PRODUCT_IMG_UPLOAD,
  PRODUCT_IMAGE_ALLOWED_TYPES,
  PRODUCT_IMAGE_HINT_MESSAGE,
  PRODUCT_TYPES,
} from "../../../../../common/configs.common";
import useProductBrandStore from "../../../store/common/product/brandStore";
import useProductCategoryStore from "../../../store/common/product/categoryStore";
import useProductStore from "../../../store/admin/product/productStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  capFirstLetter,
  formatError,
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faQuestionCircle,
  faUpload,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { ProductCreate } from "../../../../../common/types.common";
import ApiError from "../../common/ApiError";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import useCreationWizardStore from "../../../store/admin/creationWizardStore";
import WizardStepHeader from "../WizardStepHeader";
import CreateProductSkeleton from "../skeleton/CreateProductSkeleton";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingImages: boolean;
  isCreating: boolean;
};

type FormData = {
  name: FormInput;
  type: FormInput<(typeof PRODUCT_TYPES)[number]>;
  brandId: FormInput;
  categoryId: FormInput;
  description: FormInput;
  imageUrls: FormInput<File[]>;
  stopSelling: boolean;
  basePriceCents: FormInput;
};

export default function CreateProduct() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateProduct rendered", renderCount.current);

  const navigate = useNavigate();
  const wizard = useCreationWizardStore();
  const { brands, fetchBrands } = useProductBrandStore();
  const { categories, fetchCategories } = useProductCategoryStore();
  const { createProduct } = useProductStore();

  const canCreateProduct = useHasPermission("c_product");

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingImages: false,
    isCreating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    type: { val: PRODUCT_TYPES[0] },
    brandId: { val: "" },
    categoryId: { val: "" },
    description: { val: "" },
    imageUrls: { val: [] },
    stopSelling: false,
    basePriceCents: { val: "" },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgPreviews, setImgPreviews] = useState<string[]>([]);

  const [continueToCreateModal, setContinueToCreateModal] =
    useState<boolean>(false);

  // Fetch set data on initial load: brands, categories
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        await Promise.all([
          brands ? Promise.resolve() : fetchBrands(),
          categories ? Promise.resolve() : fetchCategories(),
        ]);
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

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
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
      if (process.isProcessing) return;
      if (!canCreateProduct) {
        toast.error("You do not have permission to create products.");
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
          if (newFormData.imageUrls.val.length > MAX_PRODUCT_IMG_UPLOAD) {
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
        isCreating: true,
      }));

      if (await validateForm()) {
        try {
          const imageUrls: string[] = [];
          for (const img of formData.imageUrls.val) {
            const downloadUrl = await uploadFile(img, "product-image");
            if (!downloadUrl) throw new Error("Failed to upload image file.");
            imageUrls.push(downloadUrl);
          }

          const product: ProductCreate = {
            name: formData.name.val,
            type: formData.type.val,
            brandId: formData.brandId.val,
            categoryId: formData.categoryId.val,
            description: formData.description.val,
            imageUrls,
            stopSelling: formData.stopSelling,
            basePriceCents: Number(formData.basePriceCents.val),
          };

          const createdProduct = await createProduct(product);

          wizard.setContext({
            productId: createdProduct.id,
            productName: createdProduct.name,
          });
          toast.success("Product created successfully.");
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
    [canCreateProduct, createProduct, formData, process.isProcessing, wizard]
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    if (wizard.isActive) wizard.reset();
    navigate(-1);
  }, [navigate, process.isProcessing, wizard]);

  const handleContinueToCreate = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another request is being processed. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    const productId = wizard.context.productId;
    if (!productId) {
      toast.error("Created product data not found in context.");
      return;
    }

    if (!wizard.isActive) wizard.startFlow("product");
    wizard.nextStep("model");

    navigate(`/admin/variation-models/create/${productId}`, {
      replace: true,
    });
  }, [navigate, process.isProcessing, wizard]);

  return (
    <>
      {process.isInitializing ? (
        <CreateProductSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !brands ? (
        <ApiError errorMessage="Brands data not found." />
      ) : !categories ? (
        <ApiError errorMessage="Categories data not found." />
      ) : (
        <>
          {/* Heading */}
          <WizardStepHeader
            currStep="product"
            title="Create new Product"
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
                        placeholder="Apple Watch Series 8"
                        value={formData.name.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        autoComplete="off"
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
                        placeholder="Latest Apple Watch with advanced health features."
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
                        placeholder="9999"
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
                onClick={handleDiscard}
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

          {/* Modals */}
          <ConfirmSubmitModal
            show={continueToCreateModal}
            onHide={handleDiscard}
            onSubmit={handleContinueToCreate}
            custom={{
              action: "leave",
              title: "Continue creation process.",
              body: `Do you want to create a model for the product ${
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
