import { useCallback, useEffect, useRef, useState } from "react";
import type { FormFileInput, FormInput } from "../../../utils/types";
import { useNavigate, useParams } from "react-router-dom";
import useProductBrandStore from "../../../store/admin/product/brandStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  AdminProductBrandResponse as AdminBrandResponse,
  ProductBrandUpdate,
} from "../../../../../common/types.common";
import defaultLogo from "../../../assets/default-product.webp";
import {
  capFirstLetter,
  formatError,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import { getImgFileErrs, uploadFile } from "../../../utils/utils";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import {
  PRODUCT_LOGO_ALLOWED_TYPES,
  PRODUCT_LOGO_HINT_MESSAGE,
} from "../../../../../common/configs.common";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import Btn from "../../common/Btn";
import Input from "../../common/Input";
import Textarea from "../../common/Textarea";
import Label from "../../common/Label";
import EditBrandSkeleton from "../skeleton/EditBrandSkeleton";

export type FormData = {
  name: FormInput;
  logoUrl: FormFileInput;
  description: FormInput;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUploadingLogo: boolean;
  isUpdating: boolean;
};

export default function EditBrand() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`EditBrand render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchBrand, updateBrand } = useProductBrandStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditBrand, canReadUser] = [
    useHasPermission("u_product_brand"),
    useHasPermission("r_usr"),
  ];

  const [brand, setBrand] = useState<AdminBrandResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    logoUrl: { val: null },
    description: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUploadingLogo: false,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const changeLogoRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(defaultLogo);

  // Fetch and set initial data when first load or refresh signal: brand
  useEffect(() => {
    const handleFetchSetInitial = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("Brand ID is missing.");

        const fetchedBrand = await fetchBrand(id);

        setBrand(fetchedBrand);

        const copiedBrand = structuredClone(fetchedBrand); // Avoid direct mutation
        setFormData({
          name: { val: copiedBrand.name },
          logoUrl: { val: copiedBrand.logoUrl },
          description: { val: copiedBrand.description || "" },
        });
        setLogoPreviewUrl(copiedBrand.logoUrl || defaultLogo);
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
  }, [id, refreshSignal]);

  const handleRemoveLogo = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    changeLogoRef.current!.value = "";
    setFormData((prev) => ({
      ...prev,
      logoUrl: { val: null },
    }));
    setLogoPreviewUrl(defaultLogo);
  }, [process.isProcessing]);

  const handleChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): Promise<void> => {
      if (process.isProcessing) return;

      const { name, value: val } = e.target;

      // logoUrl
      if (name === "logoUrl") {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUploadingLogo: true,
          }));
          const file = files[0];

          // Change logoPreviewUrl
          setLogoPreviewUrl((await readFileAsDataUrl(file)) as string);

          const imgFileErrs = await getImgFileErrs(files[0], "product-logo");
          setFormData((prev) => ({
            ...prev,
            logoUrl: {
              val: imgFileErrs.length ? prev.logoUrl.val : file,
              err: imgFileErrs.length
                ? `Logo file is invalid: ${imgFileErrs.join(", ")}`
                : undefined,
            },
          }));

          setProcess((prev) => ({
            ...prev,
            isProcessing: false,
            isUploadingLogo: false,
          }));
        }
        return;
      }

      // Other inputs
      let err = undefined;
      if (!val) {
        if (name === "name") err = "Name is required.";
      } else if (
        ["name", "description"].includes(name) &&
        !removeOddSpaces(val)
      ) {
        err = `${capFirstLetter(name)} is invalid.`;
      }
      setFormData((prev) => ({
        ...prev,
        [name]: { val, err },
      }));
    },
    [process.isProcessing],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!brand) {
        toast.error("Product brand data is not available.");
        return;
      }
      if (!canEditBrand) {
        toast.error(
          "You do not have permission to update product brand information.",
        );
        return;
      }

      const validateForm = async (): Promise<boolean> => {
        let allValid = true;
        const newFormData: FormData = { ...formData };

        if (!formData.name.val) {
          newFormData.name.err = "Name is required.";
          allValid = false;
        } else if (!removeOddSpaces(formData.name.val)) {
          newFormData.name.err = "Name is invalid.";
          allValid = false;
        }
        if (
          formData.description.val &&
          !removeOddSpaces(formData.description.val)
        ) {
          newFormData.description.err = "Description is invalid.";
          allValid = false;
        }
        if (newFormData.logoUrl.val instanceof File) {
          const imgFileErrs = await getImgFileErrs(
            newFormData.logoUrl.val,
            "product-logo",
          );
          if (imgFileErrs.length) {
            newFormData.logoUrl.err = `Logo file is invalid: ${imgFileErrs.join(
              ", ",
            )}`;
            allValid = false;
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
        const getChangedData = async (): Promise<ProductBrandUpdate> => {
          const changedData: ProductBrandUpdate = {};

          if (formData.name.val !== brand.name) {
            changedData.name = formData.name.val;
          }
          if (formData.description.val !== (brand.description || "")) {
            changedData.description = formData.description.val || null;
          }
          if (formData.logoUrl.val instanceof File) {
            const downloadUrl = await uploadFile(
              formData.logoUrl.val,
              "product-logo",
            );
            if (!downloadUrl)
              throw new Error("Failed to upload logoUrl image.");
            changedData.logoUrl = downloadUrl;
          } else if (formData.logoUrl.val === null && brand.logoUrl) {
            changedData.logoUrl = null; // Remove logoUrl
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          const updatedBrand = await updateBrand(brand.id, changedData);
          setBrand((prev) => (prev ? { ...prev, ...updatedBrand } : prev));
          toast.success("Product brand information updated successfully.");
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
    [brand, canEditBrand, formData, process.isProcessing, updateBrand],
  );

  return (
    <>
      {process.isInitializing ? (
        <EditBrandSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !brand ? (
        <ApiError errorMessage="Product brand data not found." />
      ) : (
        <>
          <Title
            title={`Update Brand #ID ${brand.id}`}
            parentTitle="Brand Management"
            parentLink="/admin/product-brands"
            className="mb-4"
          />

          <div className="row">
            <div className="col-lg-8">
              {/* General Info Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <form onSubmit={handleSubmit} id="editBrandForm">
                    {/* Name */}
                    <div className="mb-3">
                      <Label htmlFor="name" className="form-label" required>
                        Name
                      </Label>
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control"
                        placeholder={brand.name}
                        value={formData.name.val}
                        onChange={handleChange}
                        autoComplete="name"
                        disabled={process.isProcessing}
                        required
                        error={formData.name.err}
                      />
                    </div>

                    {/* Description */}
                    <div className="mb-3">
                      <Label htmlFor="description" className="form-label">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        className="form-control"
                        placeholder={brand.description || "None"}
                        rows={4}
                        value={formData.description.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        error={formData.description.err}
                      />
                    </div>
                  </form>
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
                        value={brand.id}
                        disabled
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <p className="form-label mb-2">Created by</p>
                      <DetailUserLink
                        userId={brand.createdBy.id}
                        title="View user details"
                        disabled={!canReadUser}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                        className="form-control bg-grey--g"
                      >
                        {brand.createdBy.fullName}
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
                        value={new Date(brand.createdAt).toLocaleString()}
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
                        value={new Date(brand.updatedAt).toLocaleString()}
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Logo & Actions */}
            <div className="col-lg-4">
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">Brand Logo</h2>
                </div>
                <div className="card-body">
                  <div className="text-center">
                    <img
                      src={logoPreviewUrl}
                      alt="Logo Preview"
                      className="rounded border shadow-sm object-fit-contain bg-white mb-3"
                      style={{ width: "150px", height: "150px" }}
                      loading="lazy"
                    />

                    <div hidden aria-hidden>
                      <input
                        type="file"
                        id="logoUrl"
                        name="logoUrl"
                        accept={PRODUCT_LOGO_ALLOWED_TYPES.join(", ")}
                        ref={changeLogoRef}
                        onChange={handleChange}
                        aria-describedby="logoUrlHelp"
                        form="editBrandForm"
                      />
                    </div>

                    <div id="logoUrlHelp" className="form-text mb-2">
                      {PRODUCT_LOGO_HINT_MESSAGE}
                    </div>

                    {formData.logoUrl.val && (
                      <button
                        type="button"
                        className="btn btn-link text-danger p-0 me-2"
                        onClick={handleRemoveLogo}
                        disabled={process.isProcessing}
                      >
                        remove
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => changeLogoRef.current?.click()}
                      disabled={process.isProcessing}
                    >
                      {formData.logoUrl.val ? "change" : "upload"}
                    </button>
                    {formData.logoUrl.err && (
                      <InvalidInputMsg msg={formData.logoUrl.err} />
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
              form="editBrandForm"
            >
              Update Brand
            </Btn>
          </div>
        </>
      )}
    </>
  );
}
