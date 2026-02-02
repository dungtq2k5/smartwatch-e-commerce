import { useCallback, useEffect, useRef, useState } from "react";
import type { FormInput } from "../../../utils/types";
import { useNavigate, useParams } from "react-router-dom";
import useProductCategoryStore from "../../../store/admin/product/categoryStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type {
  AdminProductCategoryResponse as AdminCategoryResponse,
  ProductCategoryUpdate,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import { DISABLED_TITLE_FOR_VIEWING, WAITING_EMOJI } from "../../../configs";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import DetailUserLink from "../DetailUserLink";
import Btn from "../../common/Btn";
import Loading from "../../common/Loading";
import Input from "../../common/Input";
import Textarea from "../../common/Textarea";
import Label from "../../common/Label";

export type FormData = {
  name: FormInput;
  description: FormInput;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isUpdating: boolean;
};

export default function EditCategory() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`EditCategory render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { fetchCategory, updateCategory } = useProductCategoryStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditCategory, canReadUser] = [
    useHasPermission("u_product_cat"),
    useHasPermission("r_usr"),
  ];

  const [category, setCategory] = useState<AdminCategoryResponse | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    description: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isUpdating: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data when first load or refresh signal: category
  useEffect(() => {
    const handleFetchSetInitial = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        if (!id) throw new Error("Category ID is missing.");

        const fetchedCategory = await fetchCategory(id);

        setCategory(fetchedCategory);

        const copiedCategory = structuredClone(fetchedCategory); // Avoid direct mutation
        setFormData({
          name: { val: copiedCategory.name },
          description: { val: copiedCategory.description || "" },
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
  }, [refreshSignal]);

  const handleChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): Promise<void> => {
      if (process.isProcessing) return;

      const { name, value: val } = e.target;

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
      if (!category) {
        toast.error("Product category data is not available.");
        return;
      }
      if (!canEditCategory) {
        toast.error(
          "You do not have permission to update product category information.",
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

        setFormData(newFormData);
        return allValid;
      };

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isUpdating: true,
      }));

      if (await validateForm()) {
        const getChangedData = async (): Promise<ProductCategoryUpdate> => {
          const changedData: ProductCategoryUpdate = {};

          if (formData.name.val !== category.name) {
            changedData.name = formData.name.val;
          }
          if (formData.description.val !== (category.description || "")) {
            changedData.description = formData.description.val || null;
          }

          return changedData;
        };

        try {
          const changedData = await getChangedData();
          if (Object.keys(changedData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          await updateCategory(category.id, changedData);
          toast.success("Product category information updated successfully.");
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
    [category, canEditCategory, formData, process.isProcessing, updateCategory],
  );

  return (
    <>
      {process.isInitializing ? (
        <Loading loadingMsg="Loading category data..." />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !category ? (
        <ApiError errorMessage="Product category data not found." />
      ) : (
        <>
          <Title
            title={`Update Category #ID ${category.id}`}
            parentTitle="Category Management"
            parentLink="/admin/product-categories"
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
                  <form onSubmit={handleSubmit} id="editCategoryForm">
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
                        placeholder={category.name}
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
                        placeholder={category.description || "None"}
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
            </div>

            {/* Right Column - Additional Info */}
            <div className="col-lg-4">
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">Additional Information</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="id" className="form-label">
                      ID
                    </label>
                    <input
                      type="text"
                      id="id"
                      className="form-control"
                      value={category.id}
                      disabled
                    />
                  </div>

                  <div className="mb-3">
                    <p className="form-label mb-2">Created by</p>
                    <DetailUserLink
                      userId={category.createdBy.id}
                      title="View user details"
                      disabled={!canReadUser}
                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                      className="form-control bg-grey--g"
                    >
                      {category.createdBy.fullName}
                    </DetailUserLink>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="createdAt" className="form-label">
                      Created at
                    </label>
                    <input
                      type="text"
                      id="createdAt"
                      className="form-control"
                      value={new Date(category.createdAt).toLocaleString()}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="updatedAt" className="form-label">
                      Updated at
                    </label>
                    <input
                      type="text"
                      id="updatedAt"
                      className="form-control"
                      value={new Date(category.updatedAt).toLocaleString()}
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
              form="editCategoryForm"
            >
              Update
            </Btn>
          </div>
        </>
      )}
    </>
  );
}
