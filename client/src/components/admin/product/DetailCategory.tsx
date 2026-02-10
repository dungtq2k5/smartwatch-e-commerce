import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProductCategoryStore from "../../../store/admin/product/categoryStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type { AdminProductCategoryResponse as ProductCategoryResponse } from "../../../../../common/types.common";
import useUserStore from "../../../store/admin/userStore";
import { formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import DetailUserLink from "../DetailUserLink";
import DetailCategorySkeleton from "../skeleton/DetailCategorySkeleton";
import Title from "../Title";
import LinkBtn from "../../common/LinkBtn";

export default function DetailCategory() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailCategory render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchCategory } = useProductCategoryStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditCategory, canReadUser] = [
    useHasPermission("u_product_cat"),
    useHasPermission("r_usr"),
  ];

  const [categoryDetails, setCategoryDetails] =
    useState<ProductCategoryResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: sysUserId, categoryDetails
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Category ID is missing");

        const [fetchedCategoryDetails] = await Promise.all([
          fetchCategory(id),
          sysUserId ? Promise.resolve() : fetchSysUserId(),
        ]);

        setCategoryDetails(fetchedCategoryDetails);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsInitializing(false);
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  return (
    <>
      {isInitializing ? (
        <DetailCategorySkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !sysUserId ? (
        <ApiError errorMessage="System user ID not found." />
      ) : !categoryDetails ? (
        <ApiError errorMessage="Category details not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Title
              title={`Detail Category - ${categoryDetails.name}`}
              parentTitle="Category Management"
              parentLink="/admin/product-categories"
            />
            {canEditCategory && (
              <LinkBtn to={`./edit`} className="btn btn-primary">
                Edit this Category
              </LinkBtn>
            )}
          </div>

          <div className="row justify-content-center">
            {/* Left Column - now centered and wider if needed */}
            <div className="col-lg-10">
              {/* General Information Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Name</dt>
                    <dd className="col-sm-9">{categoryDetails.name}</dd>

                    <dt className="col-sm-3">Description</dt>
                    <dd className="col-sm-9">
                      {categoryDetails.description || (
                        <span className="text-muted">None</span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>

              {/* Additional Information Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">Additional Information</h2>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <span className="form-label fw-bold">ID</span>
                      <p className="mb-0 text-muted">{categoryDetails.id}</p>
                    </div>
                    {categoryDetails.createdBy && (
                      <div className="col-md-6 mb-3">
                        <span className="form-label fw-bold mb-1">
                          Created by
                        </span>
                        <DetailUserLink
                          userId={categoryDetails.createdBy.id}
                          title="View user details"
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          className="form-control border-0 px-0 py-0"
                          style={{ minHeight: "unset", background: "none" }}
                        >
                          <span className="text-primary text-decoration-underline">
                            {categoryDetails.createdBy.fullName}
                          </span>
                        </DetailUserLink>
                      </div>
                    )}
                    <div className="col-md-6 mb-3">
                      <span className="form-label fw-bold">Created at</span>
                      <p className="mb-0">
                        {new Date(categoryDetails.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <span className="form-label fw-bold">Updated at</span>
                      <p className="mb-0">
                        {new Date(categoryDetails.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              Go Back
            </button>
          </div>
        </>
      )}
    </>
  );
}
