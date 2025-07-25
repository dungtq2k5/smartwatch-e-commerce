import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useProductStore } from "../store/product/productStore";
import type {
  ProductListResponse,
  ProductSearchQuery,
} from "../../../common/types.common";
import {
  MAX_POPULAR_PRODUCTS_DISPLAY,
  MAX_PRODUCTS_PER_PAGE,
} from "../configs";
import { formatError } from "../utils/utils";
import ApiError from "../components/ApiError";
import defaultProductImg from "../assets/default-product.webp";
import { useProductCategoryStore } from "../store/product/categoryStore";
import { useProductBrandStore } from "../store/product/brandStore";
import { centsToUSD } from "../../../common/utils.common";
import HorizontalDivider from "../components/HorizontalDivider";
import ProductCardSkeleton from "../components/skeleton/ProductCardSkeleton";
import FilterSidebarSkeleton from "../components/skeleton/FilterSidebarSkeleton";

type FetchingState = {
  searchProducts: boolean;
  mostPopularProducts: boolean;
  productMaxPrice: boolean;
};

type ApiErrorState = {
  searchProducts?: string;
  mostPopularProducts?: string;
  productMaxPrice?: string;
};

type ProductsState = {
  mostPopularProducts?: ProductListResponse;
  searchProducts?: ProductListResponse;
  productMaxPrice?: number;
};

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
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("Home render count:", renderCount.current);

  const { fetchProducts } = useProductStore();
  const {
    categories,
    isFetching: isCateFetching,
    fetchErr: fetchCateErr,
    fetchCategories,
  } = useProductCategoryStore();
  const {
    brands,
    isFetching: isBrandFetching,
    fetchErr: fetchBrandErr,
    fetchBrands,
  } = useProductBrandStore();

  const [isFetching, setIsFetching] = useState<FetchingState>({
    searchProducts: true,
    mostPopularProducts: true,
    productMaxPrice: true,
  });
  const [apiError, setApiError] = useState<ApiErrorState>({});
  const [products, setProducts] = useState<ProductsState>({});

  const [searchForm, setSearchForm] = useState<SearchForm>({
    offset: "0",
    limit: MAX_PRODUCTS_PER_PAGE.toString(),
    searchTerm: "",
  });

  const handleFetchProducts = useCallback(
    async (query: SearchForm): Promise<void> => {
      setApiError((prev) => ({ ...prev, searchProducts: undefined }));
      setIsFetching((prev) => ({ ...prev, searchProducts: true }));

      try {
        const searchProducts = await fetchProducts(query);

        setProducts((prev) => ({
          ...prev,
          searchProducts,
        }));
      } catch (error) {
        setApiError((prev) => ({
          ...prev,
          searchProducts: formatError(error),
        }));
      } finally {
        setIsFetching((prev) => ({ ...prev, searchProducts: false }));
      }
    },
    [fetchProducts]
  );

  const allSmartwatchesSectionRef = useRef<HTMLDivElement>(null);

  // Fetch initial when first loaded: popular products, brands, categories, and set max price
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      // Fetch popular products
      setApiError((prev) => ({ ...prev, mostPopularProducts: undefined }));
      setIsFetching((prev) => ({ ...prev, mostPopularProducts: true }));

      try {
        const mostPopularProducts = await fetchProducts({
          limit: MAX_POPULAR_PRODUCTS_DISPLAY.toString(),
        });

        setProducts((prev) => ({
          ...prev,
          mostPopularProducts,
        }));
      } catch (error) {
        setApiError((prev) => ({
          ...prev,
          mostPopularProducts: formatError(error),
        }));
      } finally {
        setIsFetching((prev) => ({ ...prev, mostPopularProducts: false }));
      }

      // Fetch brands
      fetchBrands();

      // Fetch categories
      fetchCategories();

      // Fetch max price
      setApiError((prev) => ({ ...prev, productMaxPrice: undefined }));
      setIsFetching((prev) => ({ ...prev, productMaxPrice: true }));

      try {
        const productMaxPrice = await fetchProducts({
          limit: "1",
          sortBy: "basePriceCents_desc",
        });

        if (productMaxPrice.products.total) {
          const maxPrice =
            productMaxPrice.products.products[0].basePriceCents + 100_00; // Add 100.00 cents to ensure the range includes the max price

          setProducts((prev) => ({
            ...prev,
            productMaxPrice: maxPrice,
          }));
        }
      } catch (error) {
        setApiError((prev) => ({
          ...prev,
          productMaxPrice: formatError(error),
        }));
      } finally {
        setIsFetching((prev) => ({ ...prev, productMaxPrice: false }));
      }
    };

    handleFetchInitialData();
  }, [fetchBrands, fetchCategories, fetchProducts]);

  // Fetch products when first loaded or pagination changes
  useEffect(() => {
    handleFetchProducts(searchForm);

    if (allSmartwatchesSectionRef.current && products.mostPopularProducts) { // Avoid first loaded
      allSmartwatchesSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchForm.offset, searchForm.limit]);

  const renderPagination = useCallback((): JSX.Element => {
    if (!products.searchProducts) return <></>;

    const totalPages = Math.ceil(
      products.searchProducts.total / MAX_PRODUCTS_PER_PAGE
    );
    if (totalPages <= 1) return <></>;

    const offset = parseInt(searchForm.offset, 10);
    const limit = parseInt(searchForm.limit, 10);

    return (
      <nav>
        <ul className="pagination">
          <li className={`page-item ${offset === 0 ? "disabled" : ""}`}>
            <button
              className="page-link"
              aria-label="Previous"
              onClick={() => {
                setSearchForm((prev) => ({
                  ...prev,
                  offset: String(Math.max(offset - limit, 0)),
                }));
              }}
            >
              <span aria-hidden="true">&laquo;</span>
            </button>
          </li>

          {Array.from({ length: totalPages }, (_, i) => {
            const page = i + 1;
            const isCurrent = offset / limit === i;
            return (
              <li
                key={page}
                className={`page-item ${isCurrent ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() =>
                    setSearchForm((prev) => ({
                      ...prev,
                      offset: String(i * limit),
                    }))
                  }
                >
                  {page}
                </button>
              </li>
            );
          })}

          <li
            className={`page-item ${
              offset + limit >= products.searchProducts.total ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              aria-label="Next"
              onClick={() => {
                setSearchForm((prev) => ({
                  ...prev,
                  offset: String(offset + limit),
                }));
              }}
            >
              <span aria-hidden="true">&raquo;</span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }, [products.searchProducts, searchForm.limit, searchForm.offset]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      const { name, value } = e.target;
      setSearchForm((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      // Reset offset to 0 when searching
      const newSearchForm = {
        ...searchForm,
        offset: "0",
      };
      setSearchForm(newSearchForm);

      await handleFetchProducts(newSearchForm);
    },
    [handleFetchProducts, searchForm]
  );

  const handleSort = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      const sortBy = e.target.value;

      const newSearchForm = {
        ...searchForm,
        sortBy: sortBy ? (sortBy as ProductSearchQuery["sortBy"]) : undefined,
      };
      setSearchForm(newSearchForm);

      await handleFetchProducts(newSearchForm);
    },
    [handleFetchProducts, searchForm]
  );

  const handleClearFilters = useCallback(async (): Promise<void> => {
    const newSearchForm = {
      offset: "0",
      limit: MAX_PRODUCTS_PER_PAGE.toString(),
      searchTerm: "",
    };
    setSearchForm(newSearchForm);

    await handleFetchProducts(newSearchForm);
  }, [handleFetchProducts]);

  return (
    <main className="container--g">
      {/* Hero section - display most popular products (max 5) */}
      <section className="container text-center mb-5 p-0">
        <h1 className="h3 fw-bold text-uppercase mb-4">
          Most Popular Smartwatches
        </h1>
        {isFetching.mostPopularProducts ? (
          <div className="row g-4">
            {Array.from({ length: MAX_POPULAR_PRODUCTS_DISPLAY }).map(
              (_, i) => (
                <div className="col-lg-3 col-md-6" key={i++}>
                  <ProductCardSkeleton />
                </div>
              )
            )}
          </div>
        ) : apiError.mostPopularProducts ? (
          <ApiError errMsg={apiError.mostPopularProducts} />
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
                    src={product.imageUrls[0] ?? defaultProductImg}
                    className="img-fluid mb-3 product-img--g"
                    alt={product.name}
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
            {isBrandFetching || isCateFetching || isFetching.productMaxPrice ? (
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
                    <label htmlFor="brandId" className="form-label">
                      Brand
                    </label>
                    <select
                      id="brandId"
                      name="brandId"
                      className="form-select"
                      value={searchForm.brandId || ""}
                      onChange={handleSearchChange}
                    >
                      {fetchBrandErr ? (
                        <option value="" disabled>
                          {fetchBrandErr}
                        </option>
                      ) : !brands ? (
                        <option value="" disabled>
                          No brands available
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
                    <label htmlFor="categoryId" className="form-label">
                      Category
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="form-select"
                      value={searchForm.categoryId || ""}
                      onChange={handleSearchChange}
                    >
                      {fetchCateErr ? (
                        <option value="" disabled>
                          {fetchCateErr}
                        </option>
                      ) : !categories ? (
                        <option value="" disabled>
                          No categories available
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
                    {apiError.productMaxPrice ? (
                      <p className="mb-0 text-muted">
                        {apiError.productMaxPrice}
                      </p>
                    ) : !products.productMaxPrice ? (
                      <p className="mb-0 text-muted">No price data available</p>
                    ) : (
                      <>
                        <label htmlFor="priceCentsMax" className="form-label">
                          Price Range:{" "}
                          <span id="priceValue">
                            $0 -{" "}
                            {centsToUSD(
                              parseInt(products.productMaxPrice.toString())
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
                        />
                      </>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={isFetching.searchProducts}
                  >
                    {isFetching.searchProducts ? (
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
                    onChange={handleSort}
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
              {isFetching.searchProducts ? (
                <div className="row g-2">
                  {Array.from({ length: MAX_PRODUCTS_PER_PAGE }).map((_, i) => (
                    <div className="col-md-6 col-lg-4" key={i++}>
                      <ProductCardSkeleton />
                    </div>
                  ))}
                </div>
              ) : apiError.searchProducts ? (
                <ApiError errMsg={apiError.searchProducts} />
              ) : !products.searchProducts ? (
                <ApiError errMsg="Filtered products data is not available." />
              ) : !products.searchProducts.products.total ? (
                <p className="mb-0 text-muted text-center">
                  No products found matching your criteria.
                </p>
              ) : (
                <div className="row g-2">
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
            {renderPagination()}
          </div>
        </div>
      </section>
    </main>
  );
}
