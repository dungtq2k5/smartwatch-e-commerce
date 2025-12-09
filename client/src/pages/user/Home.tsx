import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/user/product/ProductCard";
import { useProductStore } from "../../store/user/product/productStore";
import type {
  ProductListResponse,
  ProductSearchQuery,
} from "../../../../common/types.common";
import {
  MAX_POPULAR_PRODUCTS_DISPLAY,
  MAX_PRODUCTS_PER_PAGE,
  WAITING_EMOJI,
} from "../../configs";
import ApiError from "../../components/common/ApiError";
import defaultProductImg from "../../assets/default-product.webp";
import useProductCategoryStore from "../../store/common/product/categoryStore";
import useProductBrandStore from "../../store/common/product/brandStore";
import { centsToUSD, formatError } from "../../../../common/utils.common";
import HorizontalDivider from "../../components/user/HorizontalDivider";
import ProductCardSkeleton from "../../components/user/skeleton/ProductCardSkeleton";
import FilterSidebarSkeleton from "../../components/user/skeleton/FilterSidebarSkeleton";
import Pagination from "../../components/common/Pagination";
import toast from "react-hot-toast";
import {
  PRODUCT_SEARCH_SORT_OPTIONS,
  PRODUCT_TYPES,
} from "../../../../common/configs.common";

type process = {
  isProcessing: boolean;
  isInitializing: boolean;
  isSearchingProducts: boolean;
};

type ApiErr = {
  initErr: string | null;
  searchErr: string | null;
};

type Product = Partial<{
  mostPopularProducts: ProductListResponse;
  searchProducts: ProductListResponse;
  productMaxPrice: number;
}>;

type SearchForm = Omit<
  ProductSearchQuery,
  "offset" | "limit" | "searchTerm" | "stopSelling"
> & {
  searchTerm: string;
  offset: string;
  limit: string;
};

export default function Home() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Home render count:", renderCount.current);

  const { fetchProducts } = useProductStore();
  const { categories, fetchCategories } = useProductCategoryStore();
  const { brands, fetchBrands } = useProductBrandStore();

  const [process, setProcess] = useState<process>({
    isProcessing: true,
    isInitializing: true,
    isSearchingProducts: true,
  });
  const [apiErr, setApiErr] = useState<ApiErr>({
    initErr: null,
    searchErr: null,
  });
  const [products, setProducts] = useState<Product>({});

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchForm, setSearchForm] = useState<SearchForm>({
    offset: "0",
    limit: MAX_PRODUCTS_PER_PAGE.toString(),
    searchTerm: "",
  });

  const allSmartwatchesSectionRef = useRef<HTMLDivElement | null>(null);

  // Fetch set initial when first loaded: popular products, brands, categories, and set max price
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr((prev) => ({ ...prev, initErr: null }));

      try {
        const [mostPopularProducts, productMaxPrice] = await Promise.all([
          fetchProducts({
            limit: MAX_POPULAR_PRODUCTS_DISPLAY.toString(),
            stopSelling: "false", // Always query products that are not stopped selling
          }),
          fetchProducts({
            limit: "1",
            sortBy: "basePriceCents_desc",
            stopSelling: "false", // Always query products that are not stopped selling
          }),
          brands ? Promise.resolve() : fetchBrands(),
          categories ? Promise.resolve() : fetchCategories(),
        ]);

        if (productMaxPrice.products.total === 0) {
          throw new Error("No products available to determine max price.");
        }

        setProducts((prev) => ({
          ...prev,
          mostPopularProducts,
          productMaxPrice: productMaxPrice.products.products[0].basePriceCents,
        }));
      } catch (error) {
        setApiErr((prev) => ({ ...prev, initErr: formatError(error) }));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isInitializing: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch set search products when first loaded or search params change
  useEffect(() => {
    const handleFetchSetSearchProducts = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isSearchingProducts: true,
      }));
      setApiErr((prev) => ({ ...prev, searchErr: null }));

      try {
        const [
          urlType,
          urlBrandId,
          urlCategoryId,
          urlPriceCentsMin,
          urlPriceCentsMax,
          urlSortBy,
          urlSearchTerm,
          urlOffset,
          urlLimit,
        ] = [
          searchParams.get("type"),
          searchParams.get("brandId"), // Since filter by single brand only in UI -> just get the first one
          searchParams.get("categoryId"), // Since filter by single category only in UI -> just get the first one
          searchParams.get("priceCentsMin"),
          searchParams.get("priceCentsMax"),
          searchParams.get("sortBy"),
          searchParams.get("searchTerm"),
          searchParams.get("offset"),
          searchParams.get("limit"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          type:
            urlType &&
            PRODUCT_TYPES.includes(urlType as (typeof PRODUCT_TYPES)[number])
              ? (urlType as ProductSearchQuery["type"])
              : undefined,
          brandIds: urlBrandId ? [urlBrandId] : undefined,
          categoryIds: urlCategoryId ? [urlCategoryId] : undefined,
          priceCentsMin: urlPriceCentsMin || undefined,
          priceCentsMax: urlPriceCentsMax || undefined,
          sortBy:
            urlSortBy &&
            PRODUCT_SEARCH_SORT_OPTIONS.includes(
              urlSortBy as (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number]
            )
              ? (urlSortBy as ProductSearchQuery["sortBy"])
              : undefined,
          searchTerm: urlSearchTerm || "", // If blank -> will be removed in fetchProducts
          offset: urlOffset || "0",
          limit: urlLimit || MAX_PRODUCTS_PER_PAGE.toString(),
        };
        setSearchForm(newSearchForm);

        const searchProducts = await fetchProducts({
          ...newSearchForm,
          stopSelling: "false", // Always query products that are not stopped selling
        } as ProductSearchQuery);

        setProducts((prev) => ({
          ...prev,
          searchProducts,
        }));
      } catch (error) {
        setApiErr((prev) => ({ ...prev, searchErr: formatError(error) }));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isSearchingProducts: false,
        }));
      }
    };

    handleFetchSetSearchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      if (process.isProcessing) return;

      const { name, value } = e.target;
      setSearchForm((prev) => ({
        ...prev,
        [name]: ["brandIds", "categoryIds"].includes(name)
          ? value
            ? [value]
            : undefined
          : value,
      }));
    },
    [process.isProcessing]
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      const {
        type,
        brandIds,
        categoryIds,
        priceCentsMin,
        priceCentsMax,
        searchTerm,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("offset", "0"); // Reset offset to 0 when searching
        prev.set("limit", MAX_PRODUCTS_PER_PAGE.toString());

        if (type) prev.set("type", type);
        else prev.delete("type");

        if (brandIds?.length) prev.set("brandId", brandIds[0]);
        else prev.delete("brandId");

        if (categoryIds?.length) prev.set("categoryId", categoryIds[0]);
        else prev.delete("categoryId");

        if (priceCentsMin) prev.set("priceCentsMin", priceCentsMin);
        else prev.delete("priceCentsMin");

        if (priceCentsMax) prev.set("priceCentsMax", priceCentsMax);
        else prev.delete("priceCentsMax");

        if (searchTerm) prev.set("searchTerm", searchTerm);
        else prev.delete("searchTerm");

        return prev;
      });
    },
    [process.isProcessing, searchForm, setSearchParams]
  );

  const handleSort = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      const sortBy = (e.target.value as ProductSearchQuery["sortBy"]) || "";

      setSearchParams((prev) => {
        prev.set("limit", MAX_PRODUCTS_PER_PAGE.toString());
        if (sortBy) prev.set("sortBy", sortBy);
        else prev.delete("sortBy");
        return prev;
      });
    },
    [process.isProcessing, setSearchParams]
  );

  const handleClearFilters = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setSearchParams({});
  }, [process.isProcessing, setSearchParams]);

  const handleOffsetChange = useCallback(
    (newOffset: number): void => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      if (allSmartwatchesSectionRef.current) {
        allSmartwatchesSectionRef.current.scrollIntoView({
          behavior: "smooth",
        });
      }

      setSearchParams((prev) => {
        prev.set("offset", newOffset.toString());
        prev.set("limit", MAX_PRODUCTS_PER_PAGE.toString());
        return prev;
      });
    },
    [process.isProcessing, setSearchParams]
  );

  return (
    <main className="container--g">
      {/* Hero section - display most popular products (max 5) */}
      <section className="container text-center mb-5 p-0">
        <h1 className="h3 fw-bold text-uppercase mb-4">
          Most Popular Smartwatches
        </h1>
        {process.isInitializing ? (
          <div className="row g-4">
            {Array.from({ length: MAX_POPULAR_PRODUCTS_DISPLAY }).map(
              (_, i) => (
                <div className="col-lg-3 col-md-6" key={i++}>
                  <ProductCardSkeleton />
                </div>
              )
            )}
          </div>
        ) : apiErr.initErr ? (
          <ApiError errMsg={apiErr.initErr} />
        ) : !products.mostPopularProducts ? (
          <ApiError errMsg="Popular products data is not available." />
        ) : !products.mostPopularProducts.products.total ? (
          <p className="mb-0 text-muted">No popular products found.</p>
        ) : (
          <div className="row g-4">
            {products.mostPopularProducts.products.products.map((product) => (
              <div className="col-lg-3 col-md-6" key={product.id}>
                <Link
                  to={`/products/${product.id}`}
                  className="text-decoration-none text-dark"
                >
                  <img
                    src={product.imageUrls[0] || defaultProductImg}
                    className="img-fluid mb-3 product-img--g"
                    alt={product.name}
                    loading="lazy"
                  />
                  <p className="h6 fw-bold">{product.name}</p>
                  <p className="small text-muted product-description--g">
                    {product.description}
                  </p>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Products section */}
      <section className="container p-0" ref={allSmartwatchesSectionRef}>
        <h2 className="text-center fw-bold text-uppercase mb-4">
          All Smartwatches
        </h2>
        <div className="row">
          {/* Filter sidebar */}
          <aside className="col-lg-3">
            {process.isInitializing ? (
              <FilterSidebarSkeleton />
            ) : (
              <div className="border rounded-3 shadow-sm p-4">
                <h3 className="h5 mb-4">Filters</h3>
                <form onSubmit={handleSearch}>
                  {/* Search input */}
                  <div className="mb-3">
                    <label htmlFor="searchTerm" className="form-label">
                      Search
                    </label>
                    <div className="input-group">
                      <input
                        type="text"
                        id="searchTerm"
                        name="searchTerm"
                        className="form-control"
                        placeholder="Search..."
                        value={searchForm.searchTerm}
                        onChange={handleSearchChange}
                      />
                    </div>
                  </div>
                  {/* Filter by brands */}
                  <div className="mb-3">
                    <label htmlFor="brandIds" className="form-label">
                      Brand
                    </label>
                    <select
                      id="brandIds"
                      name="brandIds"
                      className="form-select"
                      value={searchForm.brandIds?.[0] || ""}
                      onChange={handleSearchChange}
                    >
                      {!brands ? (
                        <option value="" disabled>
                          Brands data not found
                        </option>
                      ) : !brands.brands.total ? (
                        <option value="" disabled>
                          No brands available
                        </option>
                      ) : (
                        <>
                          <option value="">All Brands</option>
                          {brands.brands.brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  {/* Filter by categories */}
                  <div className="mb-3">
                    <label htmlFor="categoryIds" className="form-label">
                      Category
                    </label>
                    <select
                      id="categoryIds"
                      name="categoryIds"
                      className="form-select"
                      value={searchForm.categoryIds?.[0] || ""}
                      onChange={handleSearchChange}
                    >
                      {!categories ? (
                        <option value="" disabled>
                          Categories data not found
                        </option>
                      ) : !categories.categories.total ? (
                        <option value="" disabled>
                          No categories available
                        </option>
                      ) : (
                        <>
                          <option value="">All Categories</option>
                          {categories.categories.categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>
                  {/* Filter by price range */}
                  <div className="mb-3">
                    {!products.productMaxPrice ? (
                      <p className="mb-0 text-muted">No price data available</p>
                    ) : (
                      <>
                        <label htmlFor="priceCentsMax" className="form-label">
                          Price Range:{" "}
                          <span id="priceValue">
                            $0 -{" "}
                            {centsToUSD(
                              Number.parseInt(
                                (
                                  searchForm.priceCentsMax ??
                                  products.productMaxPrice
                                ).toString()
                              )
                            )}
                          </span>
                        </label>
                        <input
                          type="range"
                          className="form-range"
                          id="priceCentsMax"
                          name="priceCentsMax"
                          min="0"
                          max={products.productMaxPrice}
                          step="1000"
                          value={
                            searchForm.priceCentsMax ?? products.productMaxPrice
                          }
                          onChange={handleSearchChange}
                          disabled={process.isProcessing}
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={process.isProcessing}
                  >
                    {process.isSearchingProducts ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          aria-hidden="true"
                        ></span>
                        <output>Applying Filters...</output>
                      </>
                    ) : (
                      "Apply Filters"
                    )}
                  </button>
                  <div className="my-3">
                    <HorizontalDivider />
                  </div>
                  <button
                    type="reset"
                    className="btn btn-danger w-100"
                    onClick={handleClearFilters}
                    disabled={process.isProcessing}
                  >
                    Clear All Filters
                  </button>
                </form>
              </div>
            )}
          </aside>

          {/* Product display */}
          <div className="col-lg-9 d-flex flex-column align-items-center gap-3">
            <div className="border rounded-3 shadow-sm p-4 w-100 h-100">
              {/* Sort by */}
              <div className="d-flex justify-content-end mb-3">
                <div className="d-flex align-items-center">
                  <label htmlFor="sortBy" className="form-label me-2 mb-0">
                    Sort by
                  </label>
                  <select
                    id="sortBy"
                    name="sortBy"
                    className="form-select w-auto"
                    value={searchForm.sortBy || ""}
                    onChange={handleSort}
                    disabled={process.isProcessing}
                  >
                    <option value="">Default</option>
                    <option value="basePriceCents_asc">
                      Price: Low to High
                    </option>
                    <option value="basePriceCents_desc">
                      Price: High to Low
                    </option>
                  </select>
                </div>
              </div>
              {/* Product list */}
              {process.isSearchingProducts ? (
                <div className="row g-3">
                  {Array.from({ length: MAX_PRODUCTS_PER_PAGE }).map((_, i) => (
                    <div className="col-md-6 col-lg-4" key={i++}>
                      <ProductCardSkeleton />
                    </div>
                  ))}
                </div>
              ) : apiErr.searchErr ? (
                <ApiError errMsg={apiErr.searchErr} />
              ) : !products.searchProducts ? (
                <ApiError errMsg="Filtered products data is not available." />
              ) : !products.searchProducts.products.total ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <p className="mb-0 text-muted">
                    Uh oh! We couldn't find any listings. Try turning off some
                    filters or{" "}
                    <button
                      type="button"
                      className="btn btn-link p-0 mb-1"
                      onClick={handleClearFilters}
                    >
                      reset filters
                    </button>
                  </p>
                </div>
              ) : (
                <div className="row g-3">
                  {products.searchProducts.products.products.map((product) => (
                    <div className="col-md-6 col-lg-4" key={product.id}>
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
            {/* Pagination */}
            {!!products.searchProducts?.total && (
              <Pagination
                totalItems={products.searchProducts.total}
                itemsPerPage={MAX_PRODUCTS_PER_PAGE}
                currentOffset={Number.parseInt(searchForm.offset, 10)}
                onOffsetChange={handleOffsetChange}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
