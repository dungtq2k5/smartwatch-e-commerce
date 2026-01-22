import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useInstanceStore from "../../../store/admin/product/instanceStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type { AdminVariationInstanceDetailsResponse } from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import Title from "../Title";
import useInstanceConditionStore from "../../../store/admin/product/instanceConditionStore";
import useInventoryMovementTypeStore from "../../../store/admin/grn/inventoryMovementTypeStore";
import DetailUserLink from "../DetailUserLink";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import LinkBtn from "../../common/LinkBtn";
import useHasPermission from "../../../hooks/admin/useHasPermission";

export default function DetailInstance() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailInstance render count:", renderCount.current);

  const { id } = useParams();

  const { instanceConditions, fetchInstanceConditions, getInstanceCondition } =
    useInstanceConditionStore();
  const { movementTypes, fetchMovementTypes, getMovementType } =
    useInventoryMovementTypeStore();
  const { fetchInstanceDetails } = useInstanceStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canReadUser, canReadGrn, canReadProvider] = [
    useHasPermission("r_usr"),
    useHasPermission("r_grn"),
    useHasPermission("r_provider_inventory"),
  ];

  const [instanceDetail, setInstanceDetail] =
    useState<AdminVariationInstanceDetailsResponse | null>(null);

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: productDetail
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("Product ID is missing.");

        const [fetchedInstance] = await Promise.all([
          fetchInstanceDetails(id, "desc"),
          instanceConditions ? Promise.resolve() : fetchInstanceConditions(),
          movementTypes ? Promise.resolve() : fetchMovementTypes(),
        ]);

        setInstanceDetail(fetchedInstance);
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
        <p>Loading...</p> // TODO skeleton loading
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !instanceConditions ? (
        <ApiError errMsg="Instance condition data not found." />
      ) : !movementTypes ? (
        <ApiError errMsg="Inventory movement type data not found." />
      ) : !instanceDetail ? (
        <ApiError errMsg="Instance detail data not found." />
      ) : (
        <div className="container-fluid p-0">
          {/* Heading */}
          <Title
            title={`Detail instance #ID ${instanceDetail.id}`}
            parentTitle="Instance Management"
            parentLink="/admin/variation-instances"
            className="mb-4"
          />

          <div className="row g-4">
            {/* Left Column: General Info */}
            <div className="col-12 col-xl-4 col-md-5">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3">
                  <h2 className="fs-5 card-title mb-0">General Information</h2>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">SKU</span>
                    <div className="fs-6 font-monospace text-break">
                      {instanceDetail.sku}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">
                      Serial Number
                    </span>
                    <div className="text-break">
                      {instanceDetail.supplierSerialNumber}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">IMEI</span>
                    <div className="text-break">
                      {instanceDetail.supplierImeiNumber || (
                        <span className="text-muted fst-italic">N/A</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">
                      Condition
                    </span>
                    <div>
                      <span className="badge bg-light text-dark border">
                        {getInstanceCondition(instanceDetail.conditionId)
                          ?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">Status</span>
                    <div>
                      {instanceDetail.isActive ? (
                        <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill">
                          Active
                        </span>
                      ) : (
                        <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="row">
                    <div className="col-6 mb-3">
                      <span className="small text-uppercase fw-bold">
                        Created
                      </span>
                      <div className="small">
                        {new Date(instanceDetail.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="col-6 mb-3">
                      <span className="small text-uppercase fw-bold">
                        Updated
                      </span>
                      <div className="small">
                        {new Date(instanceDetail.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {instanceDetail.inactiveAt && (
                    <div className="mb-3">
                      <span className="small text-uppercase fw-bold">
                        Inactive At
                      </span>
                      <div className="small">
                        {new Date(instanceDetail.inactiveAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Inventory History Timeline */}
            <div className="col-12 col-xl-8 col-md-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">Inventory History</h2>
                  <span className="badge bg-primary rounded-pill">
                    {instanceDetail.inventoryMovements.total} Movements
                  </span>
                </div>
                <div className="card-body">
                  <div className="order-history-timeline newest-first mt-2">
                    {instanceDetail.inventoryMovements.total === 0 ? (
                      <div className="text-center text-muted py-5">
                        No inventory movements recorded.
                      </div>
                    ) : (
                      <>
                        {instanceDetail.inventoryMovements.movements.map(
                          (movement) => (
                            <div
                              key={movement.id}
                              className="timeline-item pb-4"
                            >
                              {/* Header of the timeline item */}
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                  <span
                                    className={`fw-bold me-2 ${
                                      movement.quantity > 0
                                        ? "text-success"
                                        : "text-danger"
                                    }`}
                                  >
                                    {movement.quantity > 0 ? "IN" : "OUT"} (
                                    {movement.quantity > 0 ? "+" : ""}
                                    {movement.quantity})
                                  </span>
                                  <span
                                    className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10"
                                    title={movement.inventoryMovementTypeId}
                                  >
                                    Type{" "}
                                    {getMovementType(
                                      movement.inventoryMovementTypeId,
                                    )?.name || "Unknown"}
                                  </span>
                                </div>
                                <small className="text-muted">
                                  {new Date(
                                    movement.movementDate,
                                  ).toLocaleString()}
                                </small>
                              </div>

                              {/* Content box */}
                              <div className="card bg-white border p-3 rounded-3 shadow-none">
                                <div className="d-flex flex-wrap align-items-center gap-3 small text-muted">
                                  <div className="d-flex align-items-center">
                                    <i className="bi bi-person-circle me-1"></i>
                                    <span className="fw-medium text-dark me-1">
                                      By:
                                    </span>
                                    <DetailUserLink
                                      userId={movement.createdBy.id}
                                      disabled={!canReadUser}
                                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                                    >
                                      {movement.createdBy.fullName}
                                    </DetailUserLink>
                                  </div>
                                  {movement.grn && (
                                    <div className="d-flex align-items-center text-primary bg-primary bg-opacity-10 px-2 py-1 rounded">
                                      <span className="fw-bold me-1">GRN:</span>
                                      <LinkBtn
                                        to={`/admin/grns/${movement.grn.id}`}
                                        disabled={!canReadGrn}
                                        disabledtitle={
                                          DISABLED_TITLE_FOR_VIEWING
                                        }
                                      >
                                        {movement.grn.name}
                                      </LinkBtn>
                                    </div>
                                  )}
                                </div>

                                {movement.grn && (
                                  <div className="small text-muted mt-2 ps-3 border-start">
                                    <span className="me-1">Provider:</span>
                                    <LinkBtn
                                      to={`/admin/providers/${movement.grn.provider.id}`}
                                      disabled={!canReadProvider}
                                      disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                                    >
                                      {movement.grn.provider.fullName}
                                    </LinkBtn>
                                  </div>
                                )}

                                {movement.notes && (
                                  <div className="mt-2 text-muted small fst-italic">
                                    Note: "{movement.notes}"
                                  </div>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
