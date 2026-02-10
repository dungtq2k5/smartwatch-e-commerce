import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGrnStore from "../../../store/admin/grn/grnStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type {
  GrnDetailsItem,
  GrnDetailsResponse,
} from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import Title from "../Title";
import ApiError from "../../common/ApiError";
import useGrnStateStore from "../../../store/admin/grn/grnStateStore";
import LinkBtn from "../../common/LinkBtn";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { DISABLED_TITLE_FOR_VIEWING } from "../../../configs";
import DetailUserLink from "../DetailUserLink";

export default function DetailGrn() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailGrn render count:", renderCount.current);

  const { id } = useParams();

  const { grnStates, fetchGrnStates, getGrnState } = useGrnStateStore();
  const { fetchGrnDetails } = useGrnStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canReadProvider, canReadUser] = [
    useHasPermission("r_provider_inventory"),
    useHasPermission("r_usr"),
  ];

  const [currGrnDetails, setCurrGrnDetails] = useState<GrnDetailsItem | null>(
    null,
  );
  const [grnDetails, setGrnDetails] = useState<GrnDetailsResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      try {
        if (!id) throw new Error("GRN ID is missing.");

        const [fetchedGrnDetails] = await Promise.all([
          fetchGrnDetails(id, "desc"),
          grnStates ? Promise.resolve() : fetchGrnStates(),
        ]);

        setCurrGrnDetails(
          fetchedGrnDetails.grns.find((grn) => grn.id === id) ?? null,
        );
        setGrnDetails(fetchedGrnDetails);
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
        <ApiError errorMessage={apiErr} />
      ) : !grnStates ? (
        <ApiError errorMessage="GRN state data not found." />
      ) : !grnDetails || !currGrnDetails ? (
        <ApiError errorMessage="Instance detail data not found." />
      ) : (
        <div className="container-fluid p-0">
          {/* Heading */}
          <Title
            title={`Detail GRN - ${currGrnDetails.name}`}
            parentTitle="GRN Management"
            parentLink="/admin/grns"
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
                    <span className="small text-uppercase fw-bold">
                      GRN Name
                    </span>
                    <div className="fs-6 fw-semibold">
                      {currGrnDetails.name}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">ID</span>
                    <div className="small font-monospace text-muted">
                      {currGrnDetails.id}
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">
                      Provider
                    </span>
                    <div>
                      <LinkBtn
                        to={`/admin/providers/${currGrnDetails.provider.id}`}
                        disabled={!canReadProvider}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                      >
                        {currGrnDetails.provider.fullName}
                      </LinkBtn>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">State</span>
                    <div>
                      <span className="badge bg-light text-dark border">
                        {getGrnState(currGrnDetails.stateId)?.name || "Unknown"}
                      </span>
                    </div>
                  </div>

                  <hr className="text-muted opacity-25" />

                  <div className="row">
                    <div className="col-6 mb-3">
                      <span className="small text-uppercase fw-bold">
                        Quantity
                      </span>
                      <div className="fs-5">{currGrnDetails.quantity}</div>
                    </div>
                    <div className="col-6 mb-3">
                      <span className="small text-uppercase fw-bold">
                        Total Price (&#65504;)
                      </span>
                      <div className="fs-5 text-primary">
                        {currGrnDetails.totalPriceCents}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="small text-uppercase fw-bold">
                      Created By
                    </span>
                    <div>
                      <DetailUserLink
                        userId={currGrnDetails.createdBy.id}
                        disabled={!canReadUser}
                        disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                      >
                        {currGrnDetails.createdBy.fullName}
                      </DetailUserLink>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-6 mb-3">
                      <span className="small text-uppercase fw-bold">
                        Created At
                      </span>
                      <div className="small">
                        {new Date(currGrnDetails.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {currGrnDetails.reversedAt && (
                      <div className="col-6 mb-3">
                        <span className="small text-uppercase fw-bold text-danger">
                          Reversed
                        </span>
                        <div className="small text-danger">
                          {new Date(currGrnDetails.reversedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {currGrnDetails.reversedByGrnId && (
                    <div className="alert alert-danger d-flex align-items-center mb-3 p-2">
                      <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                      <div className="small">
                        <strong>Reversed by GRN:</strong>{" "}
                        {grnDetails.grns.find(
                          (g) => g.id === currGrnDetails.reversedByGrnId,
                        )?.name || currGrnDetails.reversedByGrnId}
                      </div>
                    </div>
                  )}

                  {currGrnDetails.notes && (
                    <div className="mb-3">
                      <span className="small text-uppercase fw-bold">
                        Notes
                      </span>
                      <div className="p-2 bg-light rounded text-muted small fst-italic">
                        "{currGrnDetails.notes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: GRN History Flow */}
            <div className="col-12 col-xl-8 col-md-7">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h2 className="fs-5 card-title mb-0">History Flow</h2>
                  <span className="badge bg-primary rounded-pill">
                    {grnDetails.total} Records
                  </span>
                </div>
                <div className="card-body">
                  <div className="order-history-timeline newest-first mt-2">
                    {grnDetails.grns.map((grn) => {
                      const isActive = grn.id === id;

                      return (
                        <div key={grn.id} className="timeline-item pb-4">
                          {/* Header */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                              <span
                                className={`fw-bold ${
                                  isActive ? "text-primary" : ""
                                }`}
                              >
                                {grn.name}
                              </span>
                              {isActive && (
                                <span className="badge bg-primary bg-opacity-75">
                                  Viewing
                                </span>
                              )}
                            </div>
                            <small className="text-muted">
                              {new Date(grn.createdAt).toLocaleString()}
                            </small>
                          </div>

                          {/* Content */}
                          <div
                            className={`card border p-3 rounded-3 shadow-none position-relative ${
                              isActive
                                ? "border-primary bg-primary bg-opacity-10"
                                : "bg-white grn-history-item-card-link--g"
                            }`}
                          >
                            <div className="row g-2">
                              <div className="col-md-6 col-lg-3">
                                <div className="small text-muted">Provider</div>
                                <div className="fw-medium text-truncate">
                                  {grn.provider.fullName}
                                </div>
                              </div>
                              <div className="col-6 col-md-3 col-lg-2">
                                <div className="small text-muted">Quantity</div>
                                <div className="fw-medium">{grn.quantity}</div>
                              </div>
                              <div className="col-6 col-md-3 col-lg-4">
                                <div className="small text-muted">Total</div>
                                <div className="fw-medium text-success">
                                  {grn.totalPriceCents} &#65504;
                                </div>
                              </div>
                              <div className="col-md-12 col-lg-3">
                                <div className="small text-muted">State</div>
                                <div className="badge bg-secondary text-white fw-normal">
                                  {getGrnState(grn.stateId)?.name || "Unknown"}
                                </div>
                              </div>
                            </div>

                            {grn.notes && (
                              <div className="mt-2 text-muted small border-top pt-2">
                                Note: {grn.notes}
                              </div>
                            )}

                            {grn.reversedByGrnId && (
                              <div className="mt-2 text-danger small fw-bold">
                                <i className="bi bi-arrow-return-left me-1"></i>
                                Reversed from:{" "}
                                {grnDetails.grns.find(
                                  (g) => g.id === grn.reversedByGrnId,
                                )?.name || `GRN ID #${grn.reversedByGrnId}`}
                              </div>
                            )}

                            {!isActive && (
                              <Link
                                to={`/admin/grns/${grn.id}`}
                                className="stretched-link"
                                aria-label={`View details of ${grn.name}`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
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
