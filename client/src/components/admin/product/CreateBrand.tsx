import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useProductBrandStore from "../../../store/admin/product/brandStore";
import type { FormData } from "./EditBrand";
import defaultLogo from "../../../assets/default-product.webp";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import {
  capFirstLetter,
  formatError,
  readFileAsDataUrl,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { getImgFileErrs, uploadFile } from "../../../utils/utils";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { ProductBrandCreate } from "../../../../../common/types.common";
import Title from "../Title";
import InvalidInputMsg from "../../common/InvalidInputMsg";
import {
  PRODUCT_LOGO_ALLOWED_TYPES,
  PRODUCT_LOGO_HINT_MESSAGE,
} from "../../../../../common/configs.common";
import Btn from "../../common/Btn";
import Input from "../../common/Input";
import Textarea from "../../common/Textarea";
import Label from "../../common/Label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type Process = {
  isProcessing: boolean;
  isUploadingLogo: boolean;
  isCreating: boolean;
};

export default function CreateBrand() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateBrand rendered", renderCount.current);

  const navigate = useNavigate();

  const { createBrand } = useProductBrandStore();

  const canCreateBrand = useHasPermission("c_product_brand");

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    logoUrl: { val: null },
    description: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: false,
    isUploadingLogo: false,
    isCreating: false,
  });

  const changeLogoRef = useRef<HTMLInputElement>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(defaultLogo);

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
      if (!val && name === "name") {
        err = "Name is required.";
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
      if (!canCreateBrand) {
        toast.error("You do not have permission to create product brands.");
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
        try {
          let logoUrl: string | null = null;
          if (formData.logoUrl.val instanceof File) {
            const downloadUrl = await uploadFile(
              formData.logoUrl.val,
              "product-logo",
            );
            if (!downloadUrl) throw new Error("Failed to upload logo file.");
            logoUrl = downloadUrl;
          }

          const brand: ProductBrandCreate = {
            name: formData.name.val,
            description: formData.description.val || null,
            logoUrl,
          };

          const createdBrand = await createBrand(brand);
          navigate(`/admin/product-brands/${createdBrand.id}`);
          toast.success("Product brand created successfully.");
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
    [canCreateBrand, createBrand, formData, navigate, process.isProcessing],
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/admin/product-brands");
  }, [navigate, process.isProcessing]);

  return (
    <>
      <Title
        title="Create new Brand"
        parentTitle="Brand Management"
        parentLink="/admin/product-brands"
        className="mb-4"
      />

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-8">
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
                    placeholder="e.g. Apple"
                    value={formData.name.val}
                    onChange={handleChange}
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
                    placeholder="e.g. Apple Inc. is an American multinational technology company..."
                    rows={4}
                    value={formData.description.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
                    error={formData.description.err}
                  />
                </div>
              </div>

              {/* Logo - Right Column */}
              <div className="col-md-4">
                <div className="text-center">
                  <p className="fs-5 mb-3">Logo</p>
                  <img
                    src={logoPreviewUrl}
                    alt="Logo Preview"
                    className="rounded border shadow-sm object-fit-contain bg-white"
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
                    />
                  </div>

                  <div id="logoUrlHelp" className="form-text">
                    {PRODUCT_LOGO_HINT_MESSAGE}
                  </div>

                  {formData.logoUrl.val && (
                    <button
                      type="button"
                      className="btn btn-link text-danger p-0 me-2"
                      onClick={handleRemoveLogo}
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

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
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
                Create Brand
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
