import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useUserStore } from "../../../store/admin/userStore";
import { useRefreshStore } from "../../../store/admin/refreshStore";
import type {
  AdminModelVariationResponse,
  AdminProductDetailResponse,
  AdminProductModelResponse,
} from "../../../../../common/types.common";
import { useProductStore } from "../../../store/admin/product/productStore";
import {
  formatError,
  centsToUSD,
  bytesToMB,
  formatMinTime,
} from "../../../../../common/utils.common";
import ApiError from "../../common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBandAid,
  faBatteryHalf,
  faCalendarAlt,
  faCamera,
  faCheckCircle,
  faCircleQuestion,
  faCircleXmark,
  faDisplay,
  faEye,
  faHeart,
  faMicrochip,
  faRuler,
  faTriangleExclamation,
  faWifi,
} from "@fortawesome/free-solid-svg-icons";
import defaultProductImg from "../../../assets/default-product.webp";
import type { ItemPicked } from "../../../utils/types";
import { Accordion, Tab, Tabs } from "react-bootstrap";
import DetailUserLink from "../DetailUserLink";
import DetailProductSkeleton from "../skeleton/DetailProductSkeleton";

export default function DetailProduct() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailProduct render count:", renderCount.current);

  const { id } = useParams();
  const navigate = useNavigate();

  const { getSysUserId } = useUserStore();
  const { getProductDetail } = useProductStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [searchParams, setSearchParams] = useSearchParams();
  const [productDetail, setProductDetail] =
    useState<AdminProductDetailResponse | null>(null);
  const [modelPicked, setModelPicked] =
    useState<ItemPicked<AdminProductModelResponse>>(null);
  const [variationPicked, setVariationPicked] =
    useState<ItemPicked<AdminModelVariationResponse>>(null);

  const [mainImgIdx, setMainImgIdx] = useState<number>(0);

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [apiErr, setApiErr] = useState<string | null>(null);

  // Fetch and set initial data: productDetail
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setIsInitializing(true);
      setApiErr(null);

      // Reset states
      setProductDetail(null);
      setModelPicked(null);
      setVariationPicked(null);
      setMainImgIdx(0);

      try {
        if (!id) throw new Error("Product ID is missing.");

        const [productDetail] = await Promise.all([
          getProductDetail(id),
          getSysUserId(),
        ]);

        setProductDetail(productDetail);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setIsInitializing(false);
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshSignal]);

  // Handle select model or variation from URL params
  useEffect(() => {
    const handleSelectFromUrlParams = (): void => {
      if (!productDetail) return; // Wait for productDetail to be loaded

      const [urlModelId, urlVariationId] = [
        searchParams.get("modelId"),
        searchParams.get("variationId"),
      ];

      let modelIdx = 0;
      let variationIdx = 0;

      let modelPicked = productDetail.models.models[modelIdx] as
        | (typeof productDetail.models.models)[number]
        | undefined;
      let variationPicked = modelPicked
        ? modelPicked.variations.variations[variationIdx]
        : undefined;

      if (urlModelId) {
        const foundModelIdx = productDetail.models.models.findIndex(
          (model) => model.id === urlModelId
        );
        if (foundModelIdx !== -1) {
          modelIdx = foundModelIdx;
          modelPicked = productDetail.models.models[foundModelIdx];
        }
      }
      if (urlVariationId && modelPicked) {
        const foundVariationIdx = modelPicked.variations.variations.findIndex(
          (variation) => variation.id === urlVariationId
        );
        if (foundVariationIdx !== -1) {
          variationIdx = foundVariationIdx;
          variationPicked =
            modelPicked.variations.variations[foundVariationIdx];
        }
      }

      if (modelPicked) {
        setModelPicked({ idx: modelIdx, data: modelPicked });
      } else {
        setModelPicked(null);
      }
      if (variationPicked) {
        setVariationPicked({ idx: variationIdx, data: variationPicked });
      } else {
        setVariationPicked(null);
      }

      setMainImgIdx(0);

      // Update URL params to reflect actual states
      setSearchParams(
        (prev) => {
          const currModelId = prev.get("modelId");
          const currVariationId = prev.get("variationId");

          if (
            currModelId !== modelPicked?.id ||
            currVariationId !== variationPicked?.id
          ) {
            if (modelPicked) prev.set("modelId", modelPicked.id);
            else prev.delete("modelId");

            if (variationPicked) prev.set("variationId", variationPicked.id);
            else prev.delete("variationId");
          }

          return prev;
        },
        { replace: true }
      );
    };

    handleSelectFromUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetail, searchParams]);

  const genImgsSelector = useCallback((): JSX.Element[] => {
    const imgUrls = variationPicked?.data.imageUrls.length
      ? variationPicked.data.imageUrls
      : modelPicked?.data.imageUrls.length
      ? modelPicked.data.imageUrls
      : productDetail?.imageUrls.length
      ? productDetail.imageUrls
      : [defaultProductImg];

    return imgUrls.map((url, i) => (
      <button
        key={i}
        type="button"
        className="border-0 bg-transparent p-0 flex-shrink-0"
        onClick={() => setMainImgIdx(i)}
      >
        <img
          src={url}
          alt={`thumb-${i}`}
          className={`product-detail-thumb-img--g ${
            mainImgIdx === i ? "active" : ""
          }`}
        />
      </button>
    ));
  }, [
    mainImgIdx,
    modelPicked?.data.imageUrls,
    productDetail?.imageUrls,
    variationPicked?.data.imageUrls,
  ]);

  /*
    TODO:
      - Links to create model/variation.
      - Click to stock quantity to view instances.
      - Buttons to view brand/os management pages with filter.
  */

  return (
    <>
      {isInitializing ? (
        <DetailProductSkeleton />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !productDetail ? (
        <ApiError errMsg="Product data not found." />
      ) : (
        <>
          {/* Heading */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="fs-2 mb-0 d-flex gap-2">
              <Link
                to={"/admin/users"}
                className="text-decoration-none text-black"
              >
                Product Management
              </Link>
              <p className="mb-0 fw-light">/</p>
              Product #ID {productDetail.id}
            </h1>
          </div>

          {/* Sub-Info */}
          <div className="mb-3">
            <div className="d-flex align-items-center text-muted small">
              <span>
                Brand:
                {productDetail.brand.logoUrl ? (
                  <img
                    src={productDetail.brand.logoUrl}
                    alt={`${productDetail.brand.name} logo`}
                    className="brand-logo--g ms-2"
                    title={productDetail.brand.name}
                  />
                ) : (
                  <strong>{productDetail.brand.name}</strong>
                )}
              </span>
              <span className="mx-2">|</span>
              <span>
                Category: <strong>{productDetail.category.name}</strong>
              </span>
              <span className="mx-2">|</span>
              <span>
                Type: <strong>{productDetail.type}</strong>
              </span>
            </div>
            <p className="text-muted mt-2">
              Description: <strong>{productDetail.description}</strong>
            </p>
            <div className="d-flex align-items-center gap-2">
              {productDetail.stopSelling ? (
                <div className="d-flex align-items-center badge bg-danger">
                  <FontAwesomeIcon icon={faCircleXmark} className="me-1" />
                  Stop selling
                </div>
              ) : (
                <div className="d-flex align-items-center badge bg-success">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                  Actively selling
                </div>
              )}
              <span className="text-muted">|</span>
              <span className="small">
                Created: {new Date(productDetail.createdAt).toLocaleString()} by{" "}
                <DetailUserLink
                  userId={productDetail.createdBy.id}
                  displayName={productDetail.createdBy.fullName}
                />
              </span>
              <span className="text-muted">|</span>
              <span className="small">
                Last Updated:{" "}
                {new Date(productDetail.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="row g-4">
            {/* Left: Images & Selection */}
            <div className="col-lg-5">
              <div className="card">
                <div className="card-body">
                  <img
                    src={
                      variationPicked?.data.imageUrls[mainImgIdx] ||
                      modelPicked?.data.imageUrls[mainImgIdx] ||
                      productDetail.imageUrls[mainImgIdx] ||
                      defaultProductImg
                    }
                    alt="product"
                    className="admin-detail-img--g mb-3"
                  />
                  <div className="d-flex flex-row justify-content-center gap-2 overflow-auto">
                    {genImgsSelector()}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Details & Data */}
            <div className="col-lg-7">
              {/* Model Picker */}
              <div className="mb-3">
                <h2 className="h5 mb-2">
                  Models ({productDetail.models.total})
                </h2>
                {productDetail.models.total > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {productDetail.models.models.map((model, idx) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`btn btn-sm ${
                          modelPicked?.idx === idx
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }`}
                        onClick={() => {
                          if (modelPicked?.idx !== idx) {
                            setSearchParams((prev) => {
                              prev.set("modelId", model.id);
                              if (model.variations.total > 0) {
                                prev.set(
                                  "variationId",
                                  model.variations.variations[0].id
                                );
                              } else {
                                prev.delete("variationId");
                              }
                              return prev;
                            });
                            setMainImgIdx(0);
                          }
                        }}
                      >
                        {model.name}
                        {model.stopSelling && " (Stopped)"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-warning p-2">
                    <FontAwesomeIcon
                      icon={faTriangleExclamation}
                      className="me-2"
                    />
                    No models found for this product,{" "}
                    <Link to="#">create one</Link>.
                  </div>
                )}
              </div>

              {/* Variation Picker */}
              {modelPicked && (
                <div className="mb-4">
                  <h2 className="h5 mb-2">
                    Variations (
                    {
                      productDetail.models.models[modelPicked.idx].variations
                        .total
                    }
                    )
                  </h2>
                  {productDetail.models.models[modelPicked.idx].variations
                    .total > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {productDetail.models.models[
                        modelPicked.idx
                      ].variations.variations.map((variation, idx) => (
                        <button
                          key={variation.id}
                          type="button"
                          className={`btn btn-sm d-flex align-items-center gap-2 ${
                            variationPicked?.idx === idx
                              ? "btn-primary"
                              : "btn-outline-primary"
                          }`}
                          onClick={() => {
                            if (variationPicked?.idx !== idx) {
                              setSearchParams((prev) => {
                                prev.set("variationId", variation.id);
                                return prev;
                              });
                              setMainImgIdx(0);
                            }
                          }}
                        >
                          <span
                            className="product-detail-color-circle--g"
                            style={{
                              backgroundColor: variation.color.hex,
                              width: "1rem",
                              height: "1rem",
                            }}
                          ></span>
                          {variation.color.name}
                          {variation.stopSelling && " (Stopped)"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-warning p-2">
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="me-2"
                      />
                      No variations found for this models,{" "}
                      <Link to="#">create one</Link>.
                    </div>
                  )}
                </div>
              )}

              {/* Details Tabs */}
              <Tabs
                defaultActiveKey="overview"
                id="product-details-tabs"
                className="mb-3"
                fill
              >
                <Tab eventKey="overview" title="Overview">
                  {!modelPicked || !variationPicked ? (
                    <div className="alert alert-info p-2">
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="me-2"
                      />
                      Please select a model and variation to see details.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered table-nowrap">
                        <tbody>
                          <tr>
                            <th scope="row" className="w-25">
                              Model
                            </th>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {modelPicked.data.name}
                                {modelPicked.data.stopSelling ? (
                                  <span className="badge bg-danger">
                                    <FontAwesomeIcon
                                      icon={faCircleXmark}
                                      className="me-1"
                                    />
                                    Stopped Selling
                                  </span>
                                ) : (
                                  <span className="badge bg-success">
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-1"
                                    />
                                    Actively Selling
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Variation</th>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                {variationPicked.data.name}
                                {variationPicked.data.stopSelling ? (
                                  <span className="badge bg-danger">
                                    <FontAwesomeIcon
                                      icon={faCircleXmark}
                                      className="me-1"
                                    />
                                    Stopped Selling
                                  </span>
                                ) : (
                                  <span className="badge bg-success">
                                    <FontAwesomeIcon
                                      icon={faCheckCircle}
                                      className="me-1"
                                    />
                                    Actively Selling
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Stock Price</th>
                            <td>
                              {centsToUSD(modelPicked.data.stockPriceCents)}{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Selling Price</th>
                            <td>
                              {centsToUSD(modelPicked.data.priceCents)}{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Stock Add. Price</th>
                            <td>
                              {centsToUSD(
                                variationPicked.data.stockAdditionalPriceCents
                              )}{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Selling Add. Price</th>
                            <td>
                              {centsToUSD(
                                variationPicked.data.additionalPriceCents
                              )}{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Total Stock Price</th>
                            <td>
                              <span className="fw-bold text-danger">
                                {centsToUSD(
                                  modelPicked.data.stockPriceCents +
                                    variationPicked.data
                                      .stockAdditionalPriceCents
                                )}
                              </span>{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Total Selling Price</th>
                            <td>
                              <span className="fw-bold text-success">
                                {centsToUSD(
                                  modelPicked.data.priceCents +
                                    variationPicked.data.additionalPriceCents
                                )}
                              </span>{" "}
                              <span className="small text-muted">per item</span>
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Stock Quantity</th>
                            <td>{variationPicked.data.stockQuantity}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </Tab>
                <Tab eventKey="specs" title="Specifications">
                  {!modelPicked || !variationPicked ? (
                    <div className="alert alert-info">
                      Please select a model and variation to see specifications.
                    </div>
                  ) : (
                    <Accordion
                      defaultActiveKey="0"
                      style={{ maxHeight: "25em", overflowY: "auto" }}
                    >
                      {/* Display & Screen */}
                      <Accordion.Item eventKey="0">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faDisplay} className="me-2" />
                          <strong>Display & Screen</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Display Type</td>
                                <td>
                                  {modelPicked.data.screen.display.displayType}
                                </td>
                              </tr>
                              <tr>
                                <td>Screen Size</td>
                                <td>
                                  {
                                    modelPicked.data.screen.display
                                      .diagonalSizeInch
                                  }
                                  " diagonal
                                </td>
                              </tr>
                              <tr>
                                <td>Resolution</td>
                                <td>
                                  {modelPicked.data.screen.resolution.wPx}px x{" "}
                                  {modelPicked.data.screen.resolution.hPx}px
                                </td>
                              </tr>
                              <tr>
                                <td>Brightness</td>
                                <td>
                                  {modelPicked.data.screen.brightness.minNits} -{" "}
                                  {modelPicked.data.screen.brightness.maxNits}{" "}
                                  nits
                                </td>
                              </tr>
                              <tr>
                                <td>Glass Material</td>
                                <td>{modelPicked.data.screen.glassMaterial}</td>
                              </tr>
                              <tr>
                                <td>Bezel Material</td>
                                <td>{modelPicked.data.screen.bezelMaterial}</td>
                              </tr>
                              <tr>
                                <td>Shape</td>
                                <td>{modelPicked.data.screen.shape}</td>
                              </tr>
                              <tr>
                                <td>Refresh Rate</td>
                                <td>
                                  {modelPicked.data.screen.refreshRateHz}Hz
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Processor & Memory */}
                      <Accordion.Item eventKey="1">
                        <Accordion.Header>
                          <FontAwesomeIcon
                            icon={faMicrochip}
                            className="me-2"
                          />
                          <strong>Processor & Memory</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Chipset</td>
                                <td>{modelPicked.data.config.chipset}</td>
                              </tr>
                              <tr>
                                <td>RAM</td>
                                <td>
                                  {bytesToMB(
                                    modelPicked.data.config.memory.ramBytes
                                  )}
                                  MB
                                </td>
                              </tr>
                              <tr>
                                <td>ROM</td>
                                <td>
                                  {bytesToMB(
                                    modelPicked.data.config.memory.storageBytes
                                  )}
                                  MB
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Connectivity */}
                      <Accordion.Item eventKey="2">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faWifi} className="me-2" />
                          <strong>Connectivity</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Connectivities</td>
                                <td>
                                  {modelPicked.data.config.connectivities
                                    ? modelPicked.data.config.connectivities.join(
                                        ", "
                                      )
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <td>Compatible Phone OS</td>
                                <td>
                                  {modelPicked.data.config.compatiblePhoneOs?.join(
                                    ", "
                                  ) ?? "None"}
                                </td>
                              </tr>
                              <tr>
                                <td>Apps Connect</td>
                                <td>
                                  {modelPicked.data.config.appsConnect?.join(
                                    ", "
                                  ) ?? "None"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Battery */}
                      <Accordion.Item eventKey="3">
                        <Accordion.Header>
                          <FontAwesomeIcon
                            icon={faBatteryHalf}
                            className="me-2"
                          />
                          <strong>Battery</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Capacity</td>
                                <td>
                                  {modelPicked.data.battery.capacityMah}mAh
                                </td>
                              </tr>
                              <tr>
                                <td>Charging Type</td>
                                <td>{modelPicked.data.battery.chargingType}</td>
                              </tr>
                              <tr>
                                <td>Full Charge Time</td>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeFullChargeMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Battery Life (AOD On)</td>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline.aodOnMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Battery Life (AOD Off)</td>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline
                                      .aodOffMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Typical Usage</td>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline
                                      .typicalUsageMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Standby Time</td>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline
                                      .standByMin
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Dimensions & Weight */}
                      <Accordion.Item eventKey="4">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faRuler} className="me-2" />
                          <strong>Dimensions & Weight</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Diameter</td>
                                <td>
                                  {modelPicked.data.screen.diameterMm
                                    ? `${modelPicked.data.screen.diameterMm}mm`
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <td>Dimensions</td>
                                <td>
                                  {modelPicked.data.screen.dimension ? (
                                    <>
                                      {modelPicked.data.screen.dimension.wMm}mm
                                      x {modelPicked.data.screen.dimension.hMm}
                                      mm x{" "}
                                      {
                                        modelPicked.data.screen.dimension
                                          .thicknessMm
                                      }
                                      mm
                                    </>
                                  ) : (
                                    "None"
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Weight</td>
                                <td>{modelPicked.data.watchWeightMg}mg</td>
                              </tr>
                              <tr>
                                <td>Case Material</td>
                                <td>{modelPicked.data.caseMaterial}</td>
                              </tr>
                              <tr>
                                <td>Compatible Band Lug Width</td>
                                <td>
                                  {modelPicked.data.compatibleBandLugWidthMm}mm
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* OS & Software */}
                      <Accordion.Item eventKey="5">
                        <Accordion.Header>
                          <FontAwesomeIcon
                            icon={faCalendarAlt}
                            className="me-2"
                          />
                          <strong>OS & Software</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Operating System</td>
                                <td>
                                  {modelPicked.data.config.os.logoUrl ? (
                                    <img
                                      src={modelPicked.data.config.os.logoUrl}
                                      alt={`${modelPicked.data.config.os.name} logo`}
                                      className="os-logo--g"
                                      title={modelPicked.data.config.os.name}
                                    />
                                  ) : (
                                    modelPicked.data.config.os.name
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Features */}
                      <Accordion.Item eventKey="6">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faHeart} className="me-2" />
                          <strong>Features</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Speaker & Microphone</td>
                                <td>
                                  {modelPicked.data.feature.speakerAndMicrophone
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <td>Water Resistance</td>
                                <td>
                                  {modelPicked.data.feature.waterResistance ? (
                                    <>
                                      {
                                        modelPicked.data.feature.waterResistance
                                          .rating
                                      }
                                      {modelPicked.data.feature.waterResistance
                                        .description && (
                                        <>
                                          {" "}
                                          -{" "}
                                          {
                                            modelPicked.data.feature
                                              .waterResistance.description
                                          }
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    "None"
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Utilities</td>
                                <td>
                                  {modelPicked.data.feature.utilities ? (
                                    <ul>
                                      {modelPicked.data.feature.utilities
                                        .healths?.length && (
                                        <li>
                                          Healths:{" "}
                                          {modelPicked.data.feature.utilities.healths.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities.sports
                                        ?.length && (
                                        <li>
                                          Sports:{" "}
                                          {modelPicked.data.feature.utilities.sports.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities
                                        .specials?.length && (
                                        <li>
                                          Specials:{" "}
                                          {modelPicked.data.feature.utilities.specials.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities.others
                                        ?.length && (
                                        <li>
                                          Others:{" "}
                                          {modelPicked.data.feature.utilities.others.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                    </ul>
                                  ) : (
                                    "None"
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Supported Apps For Notifications</td>
                                <td>
                                  {modelPicked.data.feature.supportedAppsForNotifications?.join(
                                    ", "
                                  ) ?? "None"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Camera */}
                      <Accordion.Item eventKey="7">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faCamera} className="me-2" />
                          <strong>Camera</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Resolution</td>
                                <td>
                                  {modelPicked.data.config.camera
                                    ? `${modelPicked.data.config.camera.resolutionMp}MP`
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <td>Features</td>
                                <td>
                                  {modelPicked.data.config.camera?.features?.join(
                                    ", "
                                  ) ?? "None"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Sensors */}
                      <Accordion.Item eventKey="8">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faEye} className="me-2" />
                          <strong>Sensors</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td colSpan={2}>
                                  {modelPicked.data.config.sensors?.join(
                                    ", "
                                  ) ?? "None"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>

                      {/* Band */}
                      <Accordion.Item eventKey="9">
                        <Accordion.Header>
                          <FontAwesomeIcon icon={faBandAid} className="me-2" />
                          <strong>Band Details</strong>
                        </Accordion.Header>
                        <Accordion.Body className="p-0">
                          <table className="table table-striped table-sm product-detail-specs-table--g mb-0">
                            <tbody>
                              <tr>
                                <td>Band Width</td>
                                <td>{variationPicked.data.band.widthMm}mm</td>
                              </tr>
                              <tr>
                                <td>Lug Width</td>
                                <td>
                                  {variationPicked.data.band.lugWidthMm}mm
                                </td>
                              </tr>
                              <tr>
                                <td>Material</td>
                                <td>{variationPicked.data.band.material}</td>
                              </tr>
                              <tr>
                                <td>Colors</td>
                                <td>
                                  {variationPicked.data.band.colors.map(
                                    (color, idx) => (
                                      <span
                                        key={`${color.hex}-${color.name}-${idx}`}
                                        className="d-inline-flex align-items-center me-2"
                                      >
                                        <span
                                          className="rounded-circle me-1"
                                          style={{
                                            width: ".75em",
                                            height: ".75em",
                                            backgroundColor: color.hex,
                                            border: "1px solid #dee2e6",
                                          }}
                                        ></span>
                                        {color.name}
                                      </span>
                                    )
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td>Clasp Type</td>
                                <td>{variationPicked.data.band.claspType}</td>
                              </tr>
                              <tr>
                                <td>Adjustable Range</td>
                                <td>
                                  {
                                    variationPicked.data.band.adjustableRange
                                      .minMm
                                  }
                                  mm -{" "}
                                  {
                                    variationPicked.data.band.adjustableRange
                                      .maxMm
                                  }
                                  mm
                                </td>
                              </tr>
                              <tr>
                                <td>Style</td>
                                <td>{variationPicked.data.band.style}</td>
                              </tr>
                              <tr>
                                <td>Quick Release</td>
                                <td>
                                  {variationPicked.data.band.quickRelease
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <td>Water Resistance</td>
                                <td>
                                  {variationPicked.data.band.waterResistance
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <td>Hypoallergenic</td>
                                <td>
                                  {variationPicked.data.band.hypoallergenic
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <td>Weight</td>
                                <td>{variationPicked.data.band.weightMg}mg</td>
                              </tr>
                            </tbody>
                          </table>
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                  )}
                </Tab>
                <Tab eventKey="images" title="Images">
                  <div style={{ maxHeight: "25em", overflowY: "auto" }}>
                    {/* Product Images */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h3 className="h6 mb-0">
                          Product Images ({productDetail.imageUrls.length})
                        </h3>
                        <FontAwesomeIcon
                          icon={faCircleQuestion}
                          className="text-muted"
                          title="These images will be shown when buyers searching for products."
                        />
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {productDetail.imageUrls.map((url, i) => (
                          <img
                            key={`prod-img-${i}`}
                            src={url}
                            alt="product"
                            className="product-detail-thumb-img--g"
                          />
                        ))}
                      </div>
                    </div>
                    {/* Model Images */}
                    {modelPicked && (
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h3 className="h6 mb-0">
                            Model Images ({modelPicked.data.imageUrls.length})
                          </h3>
                          <FontAwesomeIcon
                            icon={faCircleQuestion}
                            className="text-muted"
                            title="At the moment, these images are for admin reference only."
                          />
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {modelPicked.data.imageUrls.map((url, i) => (
                            <img
                              key={`model-img-${i}`}
                              src={url}
                              alt="model"
                              className="product-detail-thumb-img--g"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Variation Images */}
                    {variationPicked && (
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h3 className="h6 mb-0">
                            Variation Images (
                            {variationPicked.data.imageUrls.length})
                          </h3>
                          <FontAwesomeIcon
                            icon={faCircleQuestion}
                            className="text-muted"
                            title="These images will be shown to buyers in product details page."
                          />
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                          {variationPicked.data.imageUrls.map((url, i) => (
                            <img
                              key={`var-img-${i}`}
                              src={url}
                              alt="variation"
                              className="product-detail-thumb-img--g"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Tab>
                <Tab eventKey="audit" title="Audit Trail">
                  {!modelPicked || !variationPicked ? (
                    <div className="alert alert-info p-2">
                      Please select a model and variation to see audit trail.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered table-nowrap">
                        <tbody>
                          <tr>
                            <th scope="row" className="w-25">
                              Model Created
                            </th>
                            <td>
                              {new Date(
                                modelPicked.data.createdAt
                              ).toLocaleString()}{" "}
                              by{" "}
                              <DetailUserLink
                                userId={modelPicked.data.createdBy.id}
                                displayName={
                                  modelPicked.data.createdBy.fullName
                                }
                              />
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Model Updated</th>
                            <td>
                              {new Date(
                                modelPicked.data.updatedAt
                              ).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Variation Created</th>
                            <td>
                              {new Date(
                                variationPicked.data.createdAt
                              ).toLocaleString()}{" "}
                              by{" "}
                              <DetailUserLink
                                userId={variationPicked.data.createdBy.id}
                                displayName={
                                  variationPicked.data.createdBy.fullName
                                }
                              />
                            </td>
                          </tr>
                          <tr>
                            <th scope="row">Variation Updated</th>
                            <td>
                              {new Date(
                                variationPicked.data.updatedAt
                              ).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </Tab>
              </Tabs>
            </div>
          </div>
        </>
      )}
    </>
  );
}
