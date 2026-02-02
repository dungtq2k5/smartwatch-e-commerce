import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useProductCategoryStore from "../../../store/admin/product/categoryStore";
import type { FormData } from "./EditCategory";
import toast from "react-hot-toast";
import { WAITING_EMOJI } from "../../../configs";
import {
  capFirstLetter,
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import type { ProductCategoryCreate } from "../../../../../common/types.common";
import Title from "../Title";
import Btn from "../../common/Btn";
import Input from "../../common/Input";
import Textarea from "../../common/Textarea";
import Label from "../../common/Label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

type Process = {
  isProcessing: boolean;
  isCreating: boolean;
};

export default function CreateCategory() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("CreateCategory rendered", renderCount.current);

  const navigate = useNavigate();

  const { createCategory } = useProductCategoryStore();

  const canCreateCategory = useHasPermission("c_product_cat");

  const [formData, setFormData] = useState<FormData>({
    name: { val: "" },
    description: { val: "" },
  });

  const [process, setProcess] = useState<Process>({
    isProcessing: false,
    isCreating: false,
  });

  const handleChange = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): Promise<void> => {
      if (process.isProcessing) return;

      const { name, value: val } = e.target;

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
      if (!canCreateCategory) {
        toast.error("You do not have permission to create product categories.");
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
        try {
          const category: ProductCategoryCreate = {
            name: formData.name.val,
            description: formData.description.val || null,
          };

          const createdCategory = await createCategory(category);
          navigate(`/admin/product-categories/${createdCategory.id}`);
          toast.success("Product category created successfully.");
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
      canCreateCategory,
      createCategory,
      formData,
      navigate,
      process.isProcessing,
    ],
  );

  const handleDiscard = useCallback((): void => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    navigate("/admin/product-categories");
  }, [navigate, process.isProcessing]);

  return (
    <>
      <Title
        title="Create new Category"
        parentTitle="Category Management"
        parentLink="/admin/product-categories"
        className="mb-4"
      />

      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-12">
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
                        placeholder="e.g. Smart Watch"
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
                        placeholder="e.g. Smart watches are wearable computing devices..."
                        rows={4}
                        value={formData.description.val}
                        onChange={handleChange}
                        disabled={process.isProcessing}
                        error={formData.description.err}
                      />
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
                    Create Category
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
