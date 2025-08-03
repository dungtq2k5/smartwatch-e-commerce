import { useEffect, useRef, useState } from "react";
import type {
  ModelVariationResponse,
  ProductDetailResponse,
  ProductModelResponse,
} from "../../../common/types.common";
import {
  centsToUSD,
  bytesToMB,
  convertUtcToLocalISOString,
} from "../../../common/utils.common";
import { useProductStore } from "../store/product/productStore";
import { useParams } from "react-router-dom";
import { formatError } from "../utils/utils";
import ApiError from "../components/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faCartPlus,
  faCircle,
} from "@fortawesome/free-solid-svg-icons";
import Loading from "../components/Loading";

// TODO skeleton for product detail page
type ProductDetail = {
  productDetail: ProductDetailResponse | undefined;
  isFetching: boolean;
  fetchErr?: string;
};

type Picked = {
  idx: number;
};

type ModelPicked =
  | (Picked & {
      model: ProductModelResponse;
    })
  | undefined;

type VariationPicked =
  | (Picked & {
      variation: ModelVariationResponse;
    })
  | undefined;

export default function ProductDetail() {
  const count = useRef(0);
  count.current += 1;
  console.log(`ProductDetail rendered ${count.current} times`);

  const { fetchProductDetail } = useProductStore();
  const params = useParams();

  const [productDetail, setProductDetail] = useState<ProductDetail>({
    productDetail: undefined,
    isFetching: true,
    fetchErr: undefined,
  });
  const [modelPicked, setModelPicked] = useState<ModelPicked>(undefined);
  const [variationPicked, setVariationPicked] =
    useState<VariationPicked>(undefined);
  const [mainImgIdx, setMainImgIdx] = useState<number>(0);

  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      setProductDetail((prev) => ({
        ...prev,
        isFetching: true,
        fetchErr: undefined,
      }));

      try {
        if (!params.id) {
          throw new Error("Product ID is required");
        }

        const productDetail = await fetchProductDetail(params.id, {
          modelStopSelling: "false",
          variationStopSelling: "false",
        });

        productDetail.models.models = productDetail.models.models.filter(
          (model) => model.variations.total
        );
        productDetail.models.total = productDetail.models.models.length;
        if (!productDetail.models.total) {
          throw new Error("No models available for this product");
        }

        setProductDetail({
          productDetail,
          isFetching: false,
          fetchErr: undefined,
        });

        const modelPicked = productDetail.models.models[0];
        setModelPicked({
          idx: 0,
          model: modelPicked,
        });
        setVariationPicked({
          idx: 0,
          variation: modelPicked.variations.variations[0],
        });
      } catch (error) {
        setProductDetail((prev) => ({
          ...prev,
          isFetching: false,
          fetchErr: formatError(error),
        }));
      }
    };

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    setMainImgIdx(0);
  }, [params.id]);

  return (
    <main className="container--g py-4">
      {productDetail.isFetching ? (
        <Loading />
      ) : productDetail.fetchErr ? (
        <ApiError errMsg={productDetail.fetchErr} />
      ) : !productDetail.productDetail || !modelPicked || !variationPicked ? (
        <ApiError errMsg="Product data is not available." />
      ) : (
        <>
          {/* Main product section */}
          <div className="row g-4 align-items-start mb-4 product-detail">
            {/* Left: Images */}
            <div className="col-lg-6">
              <div className="d-flex flex-row align-items-start">
                {/* Vertical image selector */}
                <div className="product-detail__image-selector d-flex flex-column align-items-center me-3">
                  {productDetail.productDetail.imageUrls.map((url, i) => (
                    <button
                      key={i++}
                      type="button"
                      className={`product-detail__image-thumb btn p-0 mb-2${
                        mainImgIdx === i
                          ? " product-detail__image-thumb--active"
                          : ""
                      }`}
                      tabIndex={0}
                      aria-label={`Show image ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt={`product-thumb-${i}`}
                        className="product-detail__image-thumb-img"
                      />
                    </button>
                  ))}
                </div>
                {/* Main image */}
                <div className="flex-grow-1 text-center">
                  <img
                    src={productDetail.productDetail.imageUrls[mainImgIdx]}
                    alt="product"
                    className="img-fluid rounded product-detail__main-img mb-2"
                  />
                </div>
              </div>
            </div>
            {/* Right: Info & Actions */}
            <div className="col-lg-6">
              <div>
                <h1 className="fs-1 fw-bold mb-0 product-detail__title">
                  {productDetail.productDetail.name}
                </h1>
                <div className="mb-2 text-muted">
                  {productDetail.productDetail.brand.name} &middot;{" "}
                  {productDetail.productDetail.category.name}
                </div>
                <div className="h3 fw-bold text-primary mb-3">
                  {centsToUSD(
                    productDetail.productDetail.basePriceCents +
                      modelPicked.model.priceCents +
                      variationPicked.variation.additionalPriceCents
                  )} USD
                </div>
                {/* Model/Size Picker */}
                <div className="mb-3">
                  <div className="form-label fw-semibold mb-1">Watch Size</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {productDetail.productDetail.models.models.map(
                      (model, idx) => (
                        <button
                          key={model.id}
                          className={`btn btn-outline-primary btn-sm product-detail__size-btn${
                            modelPicked.idx === idx
                              ? " product-detail__size-btn--active"
                              : ""
                          }`}
                          type="button"
                        >
                          {model.watchSizeMm}mm
                        </button>
                      )
                    )}
                  </div>
                </div>
                {/* Color Picker */}
                <div className="mb-3">
                  <div className="form-label fw-semibold mb-1">Color</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {productDetail.productDetail.models.models[
                      modelPicked.idx
                    ].variations.variations.map((variation, idx) => {
                      const isActive = variationPicked.idx === idx;
                      return (
                        <button
                          key={variation.id}
                          type="button"
                          className={`btn btn-sm product-detail__color-btn${
                            isActive ? " product-detail__color-btn--active" : ""
                          }`}
                          aria-pressed={isActive}
                        >
                          <FontAwesomeIcon icon={faCircle} className="me-1" />
                          {variation.colorHex}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Purchase Actions */}
                <div className="d-flex gap-2 mt-4">
                  <button className="btn btn-primary flex-grow-1">
                    <FontAwesomeIcon icon={faCartPlus} className="me-2" />
                    Add to cart
                  </button>
                  <button className="btn btn-success flex-grow-1">
                    <FontAwesomeIcon icon={faBolt} className="me-2" />
                    Buy now
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Description & Specs */}
          <div className="row mb-4">
            <div className="col-12">
              {/* Description */}
              <div className="product-detail__desc border-bottom mb-4 pb-3">
                <h5 className="fw-bold mb-2">Description</h5>
                <div className="mb-0 text-secondary" style={{ minHeight: 48 }}>
                  {productDetail.productDetail.description}
                </div>
              </div>
              {/* Specs */}
              <div className="row">
                {/* Product Specs */}
                <div className="col-md-6 border-end">
                  <h5 className="fw-bold mb-3">Product specifications</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Model: {modelPicked.model.name}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Watch size: {modelPicked.model.watchSizeMm}mm
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Display: {modelPicked.model.display.displayType}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Resolution: {modelPicked.model.resolution.wPx} x{" "}
                      {modelPicked.model.resolution.hPx}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Memory: {bytesToMB(modelPicked.model.memory.ramBytes)} x{" "}
                      {bytesToMB(modelPicked.model.memory.romBytes)}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      OS:{" "}
                      {modelPicked.model.os.logoUrl ? (
                        <img
                          src={modelPicked.model.os.logoUrl}
                          alt={modelPicked.model.os.name}
                          title={modelPicked.model.os.name}
                          className="avatar--sm--g ms-2"
                        />
                      ) : (
                        modelPicked.model.os.name
                      )}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Chipset: {modelPicked.model.chipset}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Connectivities:{" "}
                      {modelPicked.model.connectivities.join(", ")}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Battery capacity: {modelPicked.model.batteryLifeMah}mah
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Water resistance:{" "}
                      {modelPicked.model.waterResistance || "no"}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Sensors: {modelPicked.model.sensors.join(", ")}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Case material: {modelPicked.model.caseMaterial}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Watch weight: {modelPicked.model.weightMg}mg
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Compatible band lug width:{" "}
                      {modelPicked.model.compatibleBandLugWidthMm}mm
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Release at:{" "}
                      {convertUtcToLocalISOString(
                        modelPicked.model.releaseDate
                      )}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Watch color: {variationPicked.variation.colorHex}
                    </li>
                  </ul>
                </div>
                {/* Band Specs */}
                <div className="col-md-6">
                  <h5 className="fw-bold mb-3">Band specifications</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Lug width: {variationPicked.variation.band.lugWidthMm}mm
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Material: {variationPicked.variation.band.material}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Color(s):{" "}
                      {variationPicked.variation.band.colorsHex.join(", ")}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Clasp type: {variationPicked.variation.band.claspType}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Adjustable range:{" "}
                      {variationPicked.variation.band.adjustableRange.minMm}mm -{" "}
                      {variationPicked.variation.band.adjustableRange.maxMm}mm
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Style: {variationPicked.variation.band.style}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Quick release mechanism:{" "}
                      {variationPicked.variation.band.quickRelease
                        ? "yes"
                        : "no"}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Water resistance:{" "}
                      {variationPicked.variation.band.waterResistance
                        ? "yes"
                        : "no"}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Hypoallergenic:{" "}
                      {variationPicked.variation.band.hypoallergenic
                        ? "yes"
                        : "no"}
                    </li>
                    <li className="list-group-item border-0 ps-0 pe-0">
                      Weight: {variationPicked.variation.band.weightMg}mg
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
