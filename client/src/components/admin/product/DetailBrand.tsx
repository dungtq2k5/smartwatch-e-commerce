import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useProductBrandStore from "../../../store/admin/product/brandStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type { AdminProductBrandResponse as ProductBrandResponse } from "../../../../../common/types.common";
import useUserStore from "../../../store/admin/userStore";
import { formatError } from "../../../../../common/utils.common";
import defaultLogo from "../../../assets/default-product.webp";
import ApiError from "../../common/ApiError";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import DetailUserLink from "../DetailUserLink";
import DetailBrandSkeleton from "../skeleton/DetailBrandSkeleton";
import Title from "../Title";
import LinkBtn from "../../common/LinkBtn";

export default function DetailBrand() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`DetailBrand render count: ${renderCount.current}`);

  const { id } = useParams();
  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchBrand } = useProductBrandStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canEditBrand, canReadUser] = [
    useHasPermission("u_product_brand"),
    useHasPermission("r_usr"),
  ];

  const [brandDetails, setBrandDetails] = useState<ProductBrandResponse | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: sysUserId, brandDetails
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Brand ID is missing");

        const [fetchedBrandDetails] = await Promise.all([
          fetchBrand(id),
          sysUserId ? Promise.resolve() : fetchSysUserId(),
        ]);

        setBrandDetails(fetchedBrandDetails);
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
        <DetailBrandSkeleton />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : !sysUserId ? (
        <ApiError errorMessage="System user ID not found." />
      ) : !brandDetails ? (
        <ApiError errorMessage="Brand details not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <Title
              title={`Detail Brand - ${brandDetails.name}`}
              parentTitle="Brand Management"
              parentLink="/admin/product-brands"
            />
            {canEditBrand && (
              <LinkBtn to={`./edit`} className="btn btn-primary">
                Edit this Brand
              </LinkBtn>
            )}
          </div>

          <div className="row">
            {/* Left Column */}
            <div className="col-lg-8">
              {/* General Information Card */}
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Name</dt>
                    <dd className="col-sm-9">{brandDetails.name}</dd>

                    <dt className="col-sm-3">Description</dt>
                    <dd className="col-sm-9">
                      {brandDetails.description || (
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
                      <p className="mb-0 text-muted">{brandDetails.id}</p>
                    </div>
                    {brandDetails.createdBy && (
                      <div className="col-md-6 mb-3">
                        <span className="form-label fw-bold mb-1">
                          Created by
                        </span>
                        <DetailUserLink
                          userId={brandDetails.createdBy.id}
                          title="View user details"
                          disabled={!canReadUser}
                          disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                          className="form-control border-0 px-0 py-0"
                          style={{ minHeight: "unset", background: "none" }}
                        >
                          <span className="text-primary text-decoration-underline">
                            {brandDetails.createdBy.fullName}
                          </span>
                        </DetailUserLink>
                      </div>
                    )}
                    <div className="col-md-6 mb-3">
                      <span className="form-label fw-bold">Created at</span>
                      <p className="mb-0">
                        {new Date(brandDetails.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <span className="form-label fw-bold">Updated at</span>
                      <p className="mb-0">
                        {new Date(brandDetails.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Logo */}
            <div className="col-lg-4">
              <div className="card shadow-sm mb-4">
                <div className="card-header">
                  <h2 className="fs-5 mb-0">Brand Logo</h2>
                </div>
                <div className="card-body">
                  <div className="text-center">
                    <img
                      src={brandDetails.logoUrl || defaultLogo}
                      alt={brandDetails.name}
                      className="rounded border shadow-sm object-fit-contain bg-white"
                      style={{ width: "150px", height: "150px" }}
                      loading="lazy"
                    />
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
