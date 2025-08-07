import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProductDetailResponse,
  ProductListResponse,
  UserCartCreate,
} from "../../../common/types.common";
import { centsToUSD } from "../../../common/utils.common";
import { useProductStore } from "../store/product/productStore";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { formatError } from "../utils/utils";
import ApiError from "../components/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBoxOpen,
  faCartArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import ProductDetailSpecsModal from "../components/modal/ProductDetailSpecsModal";
import ProductDetailSkeleton from "../components/skeleton/ProductDetailSkeleton";
import type { ModelPicked, VariationPicked } from "../utils/types";
import toast from "react-hot-toast";
import { useUserCartStore } from "../store/cartStore";
import ProductCardSkeleton from "../components/skeleton/ProductCardSkeleton";
import ProductCard from "../components/product/ProductCard";
import defaultProductImg from "../assets/default-product.webp";
import HorizontalDivider from "../components/HorizontalDivider";
import { MAX_PRODUCTS_SUGGEST_DISPLAY } from "../configs";

type FetchingState = {
  productDetail: boolean;
  productsSuggest: boolean;
};

type ApiErrorState = {
  productDetail?: string;
  productsSuggest?: string;
};

type ProductsState = {
  productDetail?: ProductDetailResponse;
  productsSuggest?: ProductListResponse;
};

export default function ProductDetail() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log(`ProductDetail rendered ${count.current} times`);

  const { fetchProducts, fetchProductDetail } = useProductStore();
  const { isLoading: isCreatingCart, createCart } = useUserCartStore();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [isFetching, setIsFetching] = useState<FetchingState>({
    productDetail: true,
    productsSuggest: true,
  });
  const [apiError, setApiError] = useState<ApiErrorState>({});
  const [products, setProducts] = useState<ProductsState>({});
  const [modelPicked, setModelPicked] = useState<ModelPicked>(undefined);
  const [variationPicked, setVariationPicked] =
    useState<VariationPicked>(undefined);

  const [mainImgIdx, setMainImgIdx] = useState<number>(0);

  const [modalSpecsState, setModalSpecsState] = useState<boolean>(false);

  // Fetch initial when first loaded or params.id changes: product detail, products suggest, reset states
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      // If modelId and variationId are in URL, select them
      const urlParams = new URLSearchParams(location.search);
      const urlModelId = urlParams.get("modelId");
      const urlVariationId = urlParams.get("variationId");
      // Remove search params from URL if they exist to avoid confusion
      if (urlModelId || urlVariationId) {
        navigate(location.pathname, { replace: true });
      }

      setIsFetching((prev) => ({
        ...prev,
        productDetail: true,
        productsSuggest: true,
      }));
      setApiError((prev) => ({
        ...prev,
        productDetail: undefined,
        productsSuggest: undefined,
      }));

      let productDetail: ProductDetailResponse | undefined;

      // Fetch product detail
      try {
        if (!params.id) {
          throw new Error("Product ID is required");
        }

        productDetail = await fetchProductDetail(params.id, {
          modelStopSelling: "false",
          variationStopSelling: "false",
        });

        // Make sure product detail has models and variations
        productDetail.models.models = productDetail.models.models.filter(
          (model) => model.variations.total
        );
        productDetail.models.total = productDetail.models.models.length;
        if (!productDetail.models.total) {
          throw new Error("No models available for this product");
        }

        setProducts((prev) => ({
          ...prev,
          productDetail,
        }));

        let modelIdx = 0;
        let variationIdx = 0;
        let modelPicked = productDetail.models.models[modelIdx];
        let variationPicked = modelPicked.variations.variations[variationIdx];

        if (urlModelId) {
          const foundModel = productDetail.models.models.findIndex(
            (model) => model.id === urlModelId
          );
          if (foundModel !== -1) {
            modelIdx = foundModel;
            modelPicked = productDetail.models.models[modelIdx];
          }
        }
        if (urlVariationId) {
          const foundVariation = modelPicked.variations.variations.findIndex(
            (variation) => variation.id === urlVariationId
          );
          if (foundVariation !== -1) {
            variationIdx = foundVariation;
            variationPicked = modelPicked.variations.variations[variationIdx];
          }
        }

        setModelPicked({
          idx: modelIdx,
          model: modelPicked,
        });
        setVariationPicked({
          idx: variationIdx,
          variation: variationPicked,
        });
      } catch (error) {
        setApiError((prev) => ({
          ...prev,
          productDetail: formatError(error),
        }));
      } finally {
        setIsFetching((prev) => ({
          ...prev,
          productDetail: false,
        }));
      }

      // Fetch products suggest based on brand
      try {
        if (productDetail) {
          const productsSuggest = await fetchProducts({
            brandId: productDetail.brand.id,
            limit: MAX_PRODUCTS_SUGGEST_DISPLAY.toString(),
            stopSelling: "false",
          });

          setProducts((prev) => ({
            ...prev,
            productsSuggest,
          }));
        }
      } catch (error) {
        setApiError((prev) => ({
          ...prev,
          productsSuggest: formatError(error),
        }));
      } finally {
        setIsFetching((prev) => ({
          ...prev,
          productsSuggest: false,
        }));
      }
    };

    // Reset data states
    setModelPicked(undefined);
    setVariationPicked(undefined);
    setMainImgIdx(0);
    setModalSpecsState(false);

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleAddToCart = useCallback(async () => {
    if (!variationPicked) return;

    const data: UserCartCreate = {
      variationId: variationPicked.variation.id,
      quantity: 1,
    };

    try {
      await createCart(data);
      toast.success("Product added to cart successfully!");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [createCart, variationPicked]);

  return (
    <main className="container--g py-4">
      {isFetching.productDetail ? (
        <ProductDetailSkeleton />
      ) : apiError.productDetail ? (
        <ApiError errMsg={apiError.productDetail} />
      ) : !products.productDetail || !modelPicked || !variationPicked ? (
        <ApiError errMsg="Product data is not available." />
      ) : (
        <>
          {/* Main product section */}
          <div className="row g-4">
            {/* Left: Images */}
            <div className="col-lg-6">
              <div className="row g-3">
                {/* Vertical image selector */}
                <div className="col-12 col-md-2 order-2 order-md-1">
                  <div className="d-flex flex-row flex-md-column gap-2">
                    {variationPicked.variation.imageUrls.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        tabIndex={0}
                        className="border-0 bg-transparent p-0"
                        aria-label={`Show image ${i + 1}`}
                        onClick={() => setMainImgIdx(i)}
                      >
                        <img
                          src={url}
                          alt={`product-thumb-${i}`}
                          className={`product-detail-thumb-img--g ${
                            mainImgIdx === i ? "active" : ""
                          }`}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                {/* Main image */}
                <div className="col-12 col-md-10 order-1 order-md-2">
                  <img
                    src={
                      variationPicked.variation.imageUrls[mainImgIdx] ||
                      defaultProductImg
                    }
                    alt="product"
                    className="product-detail-main-img--g shadow--g"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
            {/* Right: Info & Actions */}
            <div className="col-lg-6">
              <div className="h-100 d-flex flex-column">
                <h1 className="h1 fw-bold mb-0">
                  {products.productDetail.name}
                </h1>
                <div className="product-detail-brand-category--g mb-2">
                  <span className="fw-medium d-inline-flex align-items-center">
                    {products.productDetail.brand.logoUrl && (
                      <img
                        src={products.productDetail.brand.logoUrl}
                        alt={`${products.productDetail.brand.name} logo`}
                        style={{
                          width: "20px",
                          height: "20px",
                          marginRight: "8px",
                        }}
                        loading="lazy"
                      />
                    )}
                    {products.productDetail.brand.name}
                  </span>{" "}
                  &middot; <span>{products.productDetail.category.name}</span>
                </div>
                <div className="product-detail-price--g mb-2">
                  {centsToUSD(
                    products.productDetail.basePriceCents +
                      modelPicked.model.priceCents +
                      variationPicked.variation.additionalPriceCents
                  )}
                </div>
                <div className="text-muted mb-4">
                  {products.productDetail.description}
                </div>
                {/* Model/Size Picker */}
                <div className="mb-3">
                  <p className="fs-6 fw-semibold mb-3">Model/Variant</p>
                  <div className="d-flex flex-wrap gap-2">
                    {products.productDetail.models.models.map((model, idx) => (
                      <button
                        key={model.id}
                        type="button"
                        className={`product-detail-model-btn--g ${
                          modelPicked.idx === idx ? "active" : ""
                        }`}
                        onClick={() => {
                          if (modelPicked.idx !== idx) {
                            setModelPicked({ idx, model });
                            setVariationPicked({
                              idx: 0,
                              variation: model.variations.variations[0],
                            });
                          }
                        }}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Color Picker */}
                <div className="mb-4">
                  <p className="fs-6 fw-semibold mb-3">Color</p>
                  <div className="d-flex flex-wrap gap-2">
                    {products.productDetail.models.models[
                      modelPicked.idx
                    ].variations.variations.map((variation, idx) => {
                      const isActive = variationPicked.idx === idx;
                      return (
                        <button
                          key={variation.id}
                          type="button"
                          className={`product-detail-variation-btn--g d-flex align-items-center ${
                            isActive ? "active" : ""
                          }`}
                          aria-pressed={isActive}
                          onClick={() => {
                            if (variationPicked.idx !== idx) {
                              setVariationPicked({ idx, variation });
                            }
                          }}
                        >
                          <span
                            className="product-detail-color-circle--g"
                            style={{ backgroundColor: variation.color.hex }}
                          ></span>
                          {variation.color.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Product Specs Button */}
                <div className="mb-4 text-end">
                  <button
                    type="button"
                    className="btn btn-link p-0"
                    onClick={() => setModalSpecsState(true)}
                  >
                    View Specifications
                  </button>
                </div>
                {/* Purchase Actions */}
                {variationPicked.variation.stockQuantity > 0 ? (
                  <div className="d-grid gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleAddToCart}
                      disabled={isCreatingCart}
                    >
                      {isCreatingCart ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            aria-hidden="true"
                          ></span>
                          <output>Adding to Cart...</output>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon
                            icon={faCartArrowDown}
                            className="me-2"
                          />
                          Add to Cart
                        </>
                      )}
                    </button>
                    <button type="button" className="btn-premium--g">
                      <FontAwesomeIcon icon={faBolt} className="me-2" />
                      Buy now {/* TODO later... */}
                    </button>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2 py-2 px-3 rounded border border-danger">
                    <FontAwesomeIcon icon={faBoxOpen} className="text-danger" />
                    <span className="fs-5 text-danger fw-semibold">
                      Sorry, this color is out of stock!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Products suggest */}
          <div className="mt-5">
            <h2 className="h3 fw-semibold">You may also like</h2>
            <div className="my-3">
              <HorizontalDivider />
            </div>
            {isFetching.productsSuggest ? (
              <div className="row g-2">
                {Array.from({ length: MAX_PRODUCTS_SUGGEST_DISPLAY }).map(
                  (_, i) => (
                    <div className="col-md-6 col-lg-3" key={i}>
                      <ProductCardSkeleton />
                    </div>
                  )
                )}
              </div>
            ) : apiError.productsSuggest ? (
              <ApiError errMsg={apiError.productsSuggest} />
            ) : !products.productsSuggest?.products.total ? (
              <p className="mb-0 text-muted text-center">
                No products suggest available.
              </p>
            ) : (
              <div className="row g-2">
                {products.productsSuggest.products.products
                  .slice(0, 4)
                  .map((product) => (
                    <div className="col-md-6 col-lg-3" key={product.id}>
                      <Link
                        to={`/products/${product.id}`}
                        className="text-decoration-none text-dark"
                      >
                        <ProductCard product={product} />
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </div>
          {/* Specs modal */}
          <ProductDetailSpecsModal
            productDetail={products.productDetail}
            modelPicked={modelPicked}
            variationPicked={variationPicked}
            show={modalSpecsState}
            onHide={() => setModalSpecsState(false)}
          />
        </>
      )}
    </main>
  );
}
