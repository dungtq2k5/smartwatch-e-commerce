import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { ProductListResponse } from "../../../common/types.common";
import ProductCard from "../components/product/ProductCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_PRODUCTS_PER_PAGE } from "../configs";
import ProductCardSkeleton from "../components/skeleton/ProductCardSkeleton";
import ApiError from "../components/ApiError";
import { useProductStore } from "../store/product/productStore";
import Pagination from "../components/Pagination";
import { formatError, removeOddSpaces } from "../../../common/utils.common";

type SearchForm = {
  offset: number;
  limit: number;
  searchTerm: string;
};

type ProductsState = {
  searchProducts?: ProductListResponse;
  apiError: string | null;
  isFetching: boolean;
};

export default function SearchProduct() {
  // DEV temp for testing
  const count = useRef(0);
  count.current++;
  console.log("SearchProduct render count:", count.current);

  const location = useLocation();

  const { fetchProducts } = useProductStore();

  const [searchForm, setSearchForm] = useState<SearchForm>({
    offset: 0,
    limit: MAX_PRODUCTS_PER_PAGE,
    searchTerm: "",
  });
  const [products, setProducts] = useState<ProductsState>({
    searchProducts: undefined,
    apiError: null,
    isFetching: true,
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const handleFetchProducts = useCallback(
    async (query: SearchForm): Promise<void> => {
      console.log("Fetching products with query:", query);
      setProducts((prev) => ({
        ...prev,
        isFetching: true,
        apiError: null,
      }));

      try {
        const products = await fetchProducts({
          ...query,
          offset: query.offset.toString(),
          limit: query.limit.toString(),
          stopSelling: "false", // Always query products that are not stopped selling
        });

        setProducts((prev) => ({
          ...prev,
          searchProducts: products,
        }));
      } catch (error) {
        setProducts((prev) => ({
          ...prev,
          apiError: formatError(error),
        }));
      } finally {
        setProducts((prev) => ({
          ...prev,
          isFetching: false,
        }));
      }
    },
    [fetchProducts]
  );

  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname === "/search") {
      const urlSearchTerm = searchParams.get("searchTerm");
      if (urlSearchTerm) {
        const newSearchForm = {
          ...searchForm,
          offset: 0,
          searchTerm: urlSearchTerm,
        };
        setSearchForm(newSearchForm);
        handleFetchProducts(newSearchForm);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Handle debounced search when searchTerm changes
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!removeOddSpaces(searchForm.searchTerm)) {
        handleClearSearch();
        return;
      }

      setSearchParams((prev) => {
        prev.set("searchTerm", searchForm.searchTerm);
        return prev;
      });
    }, 500);

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchForm.searchTerm]);

  const handleClearSearch = useCallback((): void => {
    setSearchForm((prev) => ({
      ...prev,
      searchTerm: "",
      offset: 0,
    }));
    setProducts({
      searchProducts: undefined,
      apiError: null,
      isFetching: false,
    });
  }, []);

  const handleOffsetChange = useCallback(
    (newOffset: number): void => {
      const newSearchForm = {
        ...searchForm,
        offset: newOffset,
      };
      setSearchForm(newSearchForm);
      handleFetchProducts(newSearchForm);

      if (mainContainerRef.current) {
        mainContainerRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [handleFetchProducts, searchForm]
  );

  return (
    <main className="container--g" ref={mainContainerRef}>
      {/* Big search bar */}
      <form
        className="input-group input-group-lg mb-4 shadow-sm rounded-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <label htmlFor="searchTerm" hidden aria-hidden>
          Search
        </label>
        <input
          type="text"
          id="searchTerm"
          name="searchTerm"
          className="form-control"
          placeholder="Search for products..."
          value={searchForm.searchTerm}
          onChange={(e) =>
            setSearchForm((prev) => ({ ...prev, searchTerm: e.target.value }))
          }
        />
        <button
          className="btn btn-primary"
          type="reset"
          onClick={handleClearSearch}
          disabled={
            products.isFetching || !removeOddSpaces(searchForm.searchTerm)
          }
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </form>

      {/* Search results */}
      <div className="d-flex flex-column align-items-center gap-3">
        {/* Products list */}
        {products.isFetching ? (
          <div className="row g-2 w-100">
            {Array.from({ length: MAX_PRODUCTS_PER_PAGE }).map((_, i) => (
              <div className="col-md-6 col-lg-3" key={i++}>
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : products.apiError ? (
          <ApiError errMsg={products.apiError} />
        ) : !products.searchProducts ? (
          <p className="text-muted">
            No products available, please type something.
          </p>
        ) : !products.searchProducts.total ? (
          <p className="text-muted">No products found.</p>
        ) : (
          <>
            <div className="border rounded-3 shadow-sm p-4 w-100 h-100">
              <p className="mb-4 text-end">
                <strong>{products.searchProducts.total}</strong> results found
              </p>
              {/* Products list */}
              <div className="row g-2">
                {products.searchProducts.products.products.map((product) => (
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
            </div>

            {/* Pagination */}
            {!!products.searchProducts?.total && (
              <Pagination
                totalItems={products.searchProducts.total}
                itemsPerPage={MAX_PRODUCTS_PER_PAGE}
                currentOffset={searchForm.offset}
                onOffsetChange={handleOffsetChange}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
