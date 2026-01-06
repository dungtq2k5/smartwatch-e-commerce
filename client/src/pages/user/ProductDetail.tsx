import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ModelVariationResponse,
  ProductDetailResponse,
  ProductListResponse,
  ProductModelResponse,
  UserCartCreate,
} from "../../../../common/types.common";
import { centsToUSD, formatError } from "../../../../common/utils.common";
import { useProductStore } from "../../store/user/product/productStore";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import ApiError from "../../components/common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBoxOpen,
  faCartArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import ProductDetailSpecsModal from "../../components/user/modal/ProductDetailSpecsModal";
import ProductDetailSkeleton from "../../components/user/skeleton/ProductDetailSkeleton";
import type { BuyNowItem, ItemPicked } from "../../utils/types";
import toast from "react-hot-toast";
import useUserCartStore from "../../store/user/cartStore";
import ProductCardSkeleton from "../../components/user/skeleton/ProductCardSkeleton";
import ProductCard from "../../components/user/product/ProductCard";
import defaultProductImg from "../../assets/default-product.webp";
import HorizontalDivider from "../../components/user/HorizontalDivider";
import { MAX_PRODUCTS_SUGGEST_DISPLAY, WAITING_EMOJI } from "../../configs";
import Btn from "../../components/common/Btn";

type process = {
  isProcessing: boolean;
  isFetchingProductDetail: boolean;
  isFetchingProductsSuggest: boolean;
  isCreatingCart: boolean;
};

type ApiErr = {
  productDetail: string | null;
  productsSuggest: string | null;
};

type Product = {
  productDetail: ProductDetailResponse | null;
  productsSuggest: ProductListResponse | null;
};

export default function ProductDetail() {
  // DEV temp for testing
  const count = useRef(0);
  count.current += 1;
  console.log(`ProductDetail rendered ${count.current} times`);

  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProducts, fetchProductDetail } = useProductStore();
  const { createCart } = useUserCartStore();

  const [process, setProcess] = useState<process>({
    isProcessing: true,
    isFetchingProductDetail: true,
    isFetchingProductsSuggest: true,
    isCreatingCart: false,
  });
  const [apiErr, setApiErr] = useState<ApiErr>({
    productDetail: null,
    productsSuggest: null,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product>({
    productDetail: null,
    productsSuggest: null,
  });
  const [modelPicked, setModelPicked] =
    useState<ItemPicked<ProductModelResponse>>(null);
  const [variationPicked, setVariationPicked] =
    useState<ItemPicked<ModelVariationResponse>>(null);

  const [mainImgIdx, setMainImgIdx] = useState<number>(0);

  const [modalSpecs, setModalSpecs] = useState<boolean>(false);

  // Fetch initial when first loaded or params.id changes: product detail, products suggest, reset states
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      // Fetch product detail
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetchingProductDetail: true,
      }));
      setApiErr((prev) => ({
        ...prev,
        productDetail: null,
      }));

      // Reset data states
      setProducts((prev) => ({
        ...prev,
        productDetail: null,
      }));
      setModelPicked(null);
      setVariationPicked(null);
      setMainImgIdx(0);
      setModalSpecs(false);

      let productDetail: ProductDetailResponse | null = null;

      try {
        if (!id) {
          throw new Error("Product ID is required");
        }

        productDetail = await fetchProductDetail(id, {
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
      } catch (error) {
        setApiErr((prev) => ({
          ...prev,
          productDetail: formatError(error),
        }));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetchingProductDetail: false,
        }));
      }

      // Fetch products suggest based on brand
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetchingProductsSuggest: true,
      }));
      setApiErr((prev) => ({
        ...prev,
        productsSuggest: null,
      }));

      try {
        if (productDetail) {
          const productsSuggest = await fetchProducts({
            brandIds: [productDetail.brand.id],
            limit: MAX_PRODUCTS_SUGGEST_DISPLAY.toString(),
            stopSelling: "false",
          });

          setProducts((prev) => ({
            ...prev,
            productsSuggest,
          }));
        }
      } catch (error) {
        setApiErr((prev) => ({
          ...prev,
          productsSuggest: formatError(error),
        }));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetchingProductsSuggest: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle select model or variation from URL search params
  useEffect(() => {
    const handleSelectFromUrlParams = (): void => {
      if (!products.productDetail) return; // Wait until product detail is loaded

      const [urlModelId, urlVariationId] = [
        searchParams.get("modelId"),
        searchParams.get("variationId"),
      ];

      let modelIdx = 0;
      let variationIdx = 0;
      let modelPicked = products.productDetail.models.models[modelIdx];
      let variationPicked = modelPicked.variations.variations[variationIdx];

      if (urlModelId) {
        const foundModel = products.productDetail.models.models.findIndex(
          (model) => model.id === urlModelId
        );
        if (foundModel !== -1) {
          modelIdx = foundModel;
          modelPicked = products.productDetail.models.models[modelIdx];
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
        data: modelPicked,
      });
      setVariationPicked({
        idx: variationIdx,
        data: variationPicked,
      });

      // Update URL search params to reflect the current states
      setSearchParams(
        (prev) => {
          const currModelId = prev.get("modelId");
          const currVariationId = prev.get("variationId");

          if (
            currModelId !== modelPicked.id ||
            currVariationId !== variationPicked.id
          ) {
            prev.set("modelId", modelPicked.id);
            prev.set("variationId", variationPicked.id);
          }

          return prev;
        },
        { replace: true }
      );
    };

    handleSelectFromUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.productDetail, searchParams]);

  const handleAddToCart = useCallback(async () => {
    if (!variationPicked) {
      toast.error("Please select a product variation.");
      return;
    }
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    const data: UserCartCreate = {
      variationId: variationPicked.data.id,
      quantity: 1,
    };

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isCreatingCart: true,
    }));

    try {
      await createCart(data);
      toast.success("Product added to cart successfully!");
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isCreatingCart: false,
      }));
    }
  }, [createCart, process.isProcessing, variationPicked]);

  const handleBuyNow = useCallback(async () => {
    if (!variationPicked || !modelPicked || !products.productDetail) {
      toast.error("Product data is not available for checkout.");
      return;
    }

    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    const product = products.productDetail;

    const buyNowItem: BuyNowItem = {
      variation: {
        ...variationPicked.data,
        productModel: {
          ...modelPicked.data,
          product: {
            id: product.id,
            name: product.name,
            type: product.type,
            brand: product.brand,
            category: product.category,
          },
        },
      },
      totalCents:
        variationPicked.data.additionalPriceCents + modelPicked.data.priceCents,
      quantity: 1,
    };

    navigate("/checkout", { state: { buyNowItem } }); // Save to Browser history state
  }, [
    modelPicked,
    navigate,
    process.isProcessing,
    products.productDetail,
    variationPicked,
  ]);

  return (
    <main className="container--g py-4">
      {process.isFetchingProductDetail ? (
        <ProductDetailSkeleton />
      ) : apiErr.productDetail ? (
        <ApiError errMsg={apiErr.productDetail} />
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
                    {variationPicked.data.imageUrls.map((url, i) => (
                      <button
                        key={i + 1}
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
                      variationPicked.data.imageUrls[mainImgIdx] ||
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
                <div className="product-detail-brand-category--g d-flex align-items-center gap-2 mb-2">
                  <span className="fw-medium d-inline-flex align-items-center">
                    {products.productDetail.brand.logoUrl && (
                      <img
                        src={products.productDetail.brand.logoUrl}
                        alt={`${products.productDetail.brand.name} logo`}
                        className="brand-logo--g me-2"
                        loading="lazy"
                      />
                    )}
                    {products.productDetail.brand.name}
                  </span>
                  <span>&middot;</span>
                  <span>{products.productDetail.category.name}</span>
                </div>
                <div className="product-detail-price--g mb-2">
                  {centsToUSD(
                    modelPicked.data.priceCents +
                      variationPicked.data.additionalPriceCents
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
                            setSearchParams((prev) => {
                              prev.set("modelId", model.id);
                              prev.set(
                                "variationId",
                                model.variations.variations[0].id
                              );
                              return prev;
                            });
                            setMainImgIdx(0);
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
                          className={`product-detail-variation-btn--g d-flex align-items-center gap-2 ${
                            isActive ? "active" : ""
                          }`}
                          aria-pressed={isActive}
                          onClick={() => {
                            if (variationPicked.idx !== idx) {
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
                    onClick={() => setModalSpecs(true)}
                  >
                    View Specifications
                  </button>
                </div>
                {/* Purchase Actions */}
                {variationPicked.data.stockQuantity > 0 ? (
                  <div className="d-grid gap-3">
                    <Btn
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleAddToCart}
                      disabled={process.isProcessing}
                      loading={process.isCreatingCart}
                      icon={<FontAwesomeIcon icon={faCartArrowDown} />}
                    >
                      Add to Cart
                    </Btn>
                    <button
                      type="button"
                      className="btn-premium--g"
                      onClick={handleBuyNow}
                    >
                      <FontAwesomeIcon icon={faBolt} className="me-2" />
                      Buy now
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
            {process.isFetchingProductsSuggest ? (
              <div className="row g-2">
                {Array.from({ length: MAX_PRODUCTS_SUGGEST_DISPLAY }).map(
                  (_, i) => (
                    <div className="col-md-6 col-lg-3" key={i + 1}>
                      <ProductCardSkeleton />
                    </div>
                  )
                )}
              </div>
            ) : apiErr.productsSuggest ? (
              <ApiError errMsg={apiErr.productsSuggest} />
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
            show={modalSpecs}
            onHide={() => setModalSpecs(false)}
          />
        </>
      )}
    </main>
  );
}
