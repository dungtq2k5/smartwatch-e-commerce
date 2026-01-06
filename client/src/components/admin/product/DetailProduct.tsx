import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useUserStore from "../../../store/admin/userStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import type {
  AdminModelVariationResponse,
  AdminProductDetailResponse,
  AdminProductModelResponse,
} from "../../../../../common/types.common";
import useProductStore from "../../../store/admin/product/productStore";
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
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
} from "../../../configs";
import Title from "../Title";
import LinkBtn from "../../common/LinkBtn";

export default function DetailProduct() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("DetailProduct render count:", renderCount.current);

  const { id } = useParams();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchProductDetail } = useProductStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const [canReadUser, canCreateModel, canCreateVariation, canReadInstance] = [
    useHasPermission("r_usr"),
    useHasPermission("c_product_model"),
    useHasPermission("c_model_variation"),
    useHasPermission("r_variation_instance"),
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const [productDetail, setProductDetail] =
    useState<AdminProductDetailResponse | null>(null);
  const [modelPicked, setModelPicked] =
    useState<ItemPicked<AdminProductModelResponse>>(null);
  const [variationPicked, setVariationPicked] =
    useState<ItemPicked<Omit<AdminModelVariationResponse, "productId">>>(null);

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
          fetchProductDetail(id),
          sysUserId ? Promise.resolve() : fetchSysUserId(),
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
        key={url}
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

  // TODO Buttons to view brand/os management pages with filter.

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
          <Title
            title={`Detail product #ID ${productDetail.id}`}
            parentTitle="Product Management"
            parentLink="/admin/products"
            className="mb-4"
          />

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
                  disabled={!canReadUser}
                  disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                >
                  {productDetail.createdBy.fullName}
                </DetailUserLink>
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
                    <LinkBtn
                      to={`/admin/product-models/create/${productDetail.id}`}
                      disabled={!canCreateModel}
                      disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
                    >
                      create one
                    </LinkBtn>
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
                      <LinkBtn
                        to={`/admin/model-variations/create/${modelPicked.data.id}`}
                        disabled={!canCreateVariation}
                        disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
                      >
                        create one
                      </LinkBtn>
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
                            <td>
                              <LinkBtn
                                to={`/admin/variation-instances?searchTerm=${variationPicked.data.id}`}
                                title="View instances for this variation"
                                disabled={!canReadInstance}
                                disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                              >
                                {variationPicked.data.stockQuantity}
                              </LinkBtn>
                            </td>
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
                                <th>Display Type</th>
                                <td>
                                  {modelPicked.data.screen.display.displayType}
                                </td>
                              </tr>
                              <tr>
                                <th>Screen Size</th>
                                <td>
                                  {
                                    modelPicked.data.screen.display
                                      .diagonalSizeInch
                                  }
                                  " diagonal
                                </td>
                              </tr>
                              <tr>
                                <th>Resolution</th>
                                <td>
                                  {modelPicked.data.screen.resolution.wPx}px x{" "}
                                  {modelPicked.data.screen.resolution.hPx}px
                                </td>
                              </tr>
                              <tr>
                                <th>Brightness</th>
                                <td>
                                  {modelPicked.data.screen.brightness.minNits} -{" "}
                                  {modelPicked.data.screen.brightness.maxNits}{" "}
                                  nits
                                </td>
                              </tr>
                              <tr>
                                <th>Glass Material</th>
                                <td>{modelPicked.data.screen.glassMaterial}</td>
                              </tr>
                              <tr>
                                <th>Bezel Material</th>
                                <td>{modelPicked.data.screen.bezelMaterial}</td>
                              </tr>
                              <tr>
                                <th>Shape</th>
                                <td>{modelPicked.data.screen.shape}</td>
                              </tr>
                              <tr>
                                <th>Refresh Rate</th>
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
                                <th>Chipset</th>
                                <td>{modelPicked.data.config.chipset}</td>
                              </tr>
                              <tr>
                                <th>RAM</th>
                                <td>
                                  {bytesToMB(
                                    modelPicked.data.config.memory.ramBytes
                                  )}
                                  MB
                                </td>
                              </tr>
                              <tr>
                                <th>ROM</th>
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
                                <th>Connectivities</th>
                                <td>
                                  {modelPicked.data.config.connectivities
                                    .length > 0
                                    ? modelPicked.data.config.connectivities.join(
                                        ", "
                                      )
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <th>Compatible Phone OS</th>
                                <td>
                                  {modelPicked.data.config.compatiblePhoneOs
                                    .length > 0
                                    ? modelPicked.data.config.compatiblePhoneOs.join(
                                        ", "
                                      )
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <th>Apps Connect</th>
                                <td>
                                  {modelPicked.data.config.appsConnect.length
                                    ? modelPicked.data.config.appsConnect.join(
                                        ", "
                                      )
                                    : "None"}
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
                                <th>Capacity</th>
                                <td>
                                  {modelPicked.data.battery.capacityMah}mAh
                                </td>
                              </tr>
                              <tr>
                                <th>Charging Type</th>
                                <td>{modelPicked.data.battery.chargingType}</td>
                              </tr>
                              <tr>
                                <th>Full Charge Time</th>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeFullChargeMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th>Battery Life (AOD On)</th>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline.aodOnMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th>Battery Life (AOD Off)</th>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline
                                      .aodOffMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th>Typical Usage</th>
                                <td>
                                  {formatMinTime(
                                    modelPicked.data.battery.timeOnline
                                      .typicalUsageMin
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <th>Standby Time</th>
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
                                <th>Diameter</th>
                                <td>
                                  {modelPicked.data.screen.diameterMm
                                    ? `${modelPicked.data.screen.diameterMm}mm`
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <th>Dimensions</th>
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
                                <th>Weight</th>
                                <td>{modelPicked.data.watchWeightMg}mg</td>
                              </tr>
                              <tr>
                                <th>Case Material</th>
                                <td>{modelPicked.data.caseMaterial}</td>
                              </tr>
                              <tr>
                                <th>Compatible Band Lug Width</th>
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
                                <th>Operating System</th>
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
                                <th>Speaker & Microphone</th>
                                <td>
                                  {modelPicked.data.feature.speakerAndMicrophone
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <th>Water Resistance</th>
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
                                <th>Utilities</th>
                                <td>
                                  {modelPicked.data.feature.utilities ? (
                                    <ul>
                                      {modelPicked.data.feature.utilities
                                        .healths.length > 0 && (
                                        <li>
                                          Healths:{" "}
                                          {modelPicked.data.feature.utilities.healths.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities.sports
                                        .length > 0 && (
                                        <li>
                                          Sports:{" "}
                                          {modelPicked.data.feature.utilities.sports.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities
                                        .specials.length > 0 && (
                                        <li>
                                          Specials:{" "}
                                          {modelPicked.data.feature.utilities.specials.join(
                                            ", "
                                          )}
                                        </li>
                                      )}
                                      {modelPicked.data.feature.utilities.others
                                        .length > 0 && (
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
                                <th>Supported Apps For Notifications</th>
                                <td>
                                  {modelPicked.data.feature
                                    .supportedAppsForNotifications.length > 0
                                    ? modelPicked.data.feature.supportedAppsForNotifications.join(
                                        ", "
                                      )
                                    : "None"}
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
                                <th>Resolution</th>
                                <td>
                                  {modelPicked.data.config.camera
                                    ? `${modelPicked.data.config.camera.resolutionMp}MP`
                                    : "None"}
                                </td>
                              </tr>
                              <tr>
                                <th>Features</th>
                                <td>
                                  {modelPicked.data.config.camera &&
                                  modelPicked.data.config.camera.features
                                    .length > 0
                                    ? modelPicked.data.config.camera.features.join(
                                        ", "
                                      )
                                    : "None"}
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
                                <th colSpan={2}>
                                  {modelPicked.data.config.sensors.length
                                    ? modelPicked.data.config.sensors.join(", ")
                                    : "None"}
                                </th>
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
                                <th>Band Width</th>
                                <td>{variationPicked.data.band.widthMm}mm</td>
                              </tr>
                              <tr>
                                <th>Lug Width</th>
                                <td>
                                  {variationPicked.data.band.lugWidthMm}mm
                                </td>
                              </tr>
                              <tr>
                                <th>Material</th>
                                <td>{variationPicked.data.band.material}</td>
                              </tr>
                              <tr>
                                <th>Colors</th>
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
                                <th>Clasp Type</th>
                                <td>{variationPicked.data.band.claspType}</td>
                              </tr>
                              <tr>
                                <th>Adjustable Range</th>
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
                                <th>Style</th>
                                <td>{variationPicked.data.band.style}</td>
                              </tr>
                              <tr>
                                <th>Quick Release</th>
                                <td>
                                  {variationPicked.data.band.quickRelease
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <th>Water Resistance</th>
                                <td>
                                  {variationPicked.data.band.waterResistance
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <th>Hypoallergenic</th>
                                <td>
                                  {variationPicked.data.band.hypoallergenic
                                    ? "Yes"
                                    : "No"}
                                </td>
                              </tr>
                              <tr>
                                <th>Weight</th>
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
                            key={`prod-img-${i + 1}`}
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
                              key={`model-img-${i + 1}`}
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
                              key={`var-img-${i + 1}`}
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
                                disabled={!canReadUser}
                                disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                              >
                                {modelPicked.data.createdBy.fullName}
                              </DetailUserLink>
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
                                disabled={!canReadUser}
                                disabledtitle={DISABLED_TITLE_FOR_VIEWING}
                              >
                                {variationPicked.data.createdBy.fullName}
                              </DetailUserLink>
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
