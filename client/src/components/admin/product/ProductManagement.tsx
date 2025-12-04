import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PRODUCT_SEARCH_SORT_OPTIONS,
  PRODUCT_TYPES,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import defaultProductImg from "../../../assets/default-product.webp";
import {
  centsToUSD,
  formatError,
  isValidBooleanString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import type {
  AdminProductListResponse,
  AdminProductResponse,
  ProductSearchQuery,
} from "../../../../../common/types.common";
import { useProductBrandStore } from "../../../store/common/product/brandStore";
import { useProductCategoryStore } from "../../../store/common/product/categoryStore";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  PRODUCT_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import Pagination from "../../common/Pagination";
import { useUserStore } from "../../../store/admin/userStore";
import type {
  AdminProductDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ProductDisplayField,
} from "../../../utils/types";
import { useRefreshStore } from "../../../store/admin/refreshStore";
import { useConfigStore } from "../../../store/admin/configStore";
import { useHasPermission } from "../../../hooks/admin/useHasPermission";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import { useProductStore } from "../../../store/admin/product/productStore";
import toast from "react-hot-toast";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import TableHeadSortBtn from "../TableHeadSortBtn";
import { exportToCsv } from "../../../utils/utils";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import DetailUserLink from "../DetailUserLink";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  ProductSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  productIdToDelete: string | null;
  productIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminProductDisplayableField]: GeneralTableColDisplay<
    AdminProductResponse,
    (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-products-toast";

export default function ProductManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ProductManagement render count:", renderCount.current);

  const { sysUserId, getSysUserId } = useUserStore();
  const { fetchProducts, deleteProduct, deleteProductBulk } = useProductStore();
  const { brands, fetchBrands, getBrandSync } = useProductBrandStore();
  const { categories, fetchCategories, getCategorySync } =
    useProductCategoryStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { productManagementDisplayFields: displayFields },
    resetProductManagementDisplayFields,
    setProductManagementDisplayFields,
  } = useConfigStore();

  const [canEditProduct, canDeleteProduct] = [
    useHasPermission("u_product"),
    useHasPermission("d_product"),
  ]; // canReadProduct is handled by ApiError

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: PRODUCT_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (product) => <>{product.id}</>,
        getCsvVal: (product) => product.id,
      },
      name: {
        label: PRODUCT_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (product) => (
          <div className="d-flex align-items-center">
            <img
              src={product.imageUrls[0] || defaultProductImg}
              alt={product.name}
              className="admin-product-img--g me-2"
            />
            <Link to={product.id} title="View detail product">
              {product.name}
            </Link>
          </div>
        ),
        getCsvVal: (product) => product.name,
      },
      type: {
        label: PRODUCT_FIELD_LABEL_LEGEND["type"] || "Type",
        tdClassName: "text-capitalize",
        tdContent: (product) => <>{product.type}</>,
        getCsvVal: (product) => product.type,
      },
      categoryId: {
        label: PRODUCT_FIELD_LABEL_LEGEND["categoryId"] || "Category",
        tdContent: (product) => (
          <>{getCategorySync(product.categoryId)?.name || "Unknown category"}</>
        ),
        getCsvVal: (product) =>
          getCategorySync(product.categoryId)?.name || "Unknown category",
      },
      brandId: {
        label: PRODUCT_FIELD_LABEL_LEGEND["brandId"] || "Brand",
        tdContent: (product) => {
          const brand = getBrandSync(product.brandId);
          return brand ? (
            brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="brand-logo--g"
                title={brand.name}
              />
            ) : (
              <>{brand.name}</>
            )
          ) : (
            <>Unknown brand</>
          );
        },
        getCsvVal: (product) =>
          getBrandSync(product.brandId)?.name || "Unknown brand",
      },
      description: {
        label: PRODUCT_FIELD_LABEL_LEGEND["description"] || "Description",
        tdClassName: "td-description--truncate--g",
        tdContent: (product) => <>{product.description}</>,
        getCsvVal: (product) => product.description,
      },
      basePriceCents: {
        label: PRODUCT_FIELD_LABEL_LEGEND["basePriceCents"] || "Base price",
        isSortable: true,
        sortKey: { asc: "basePriceCents_asc", desc: "basePriceCents_desc" },
        tdContent: (product) => <>{centsToUSD(product.basePriceCents)}</>,
        getCsvVal: (product) => centsToUSD(product.basePriceCents),
      },
      totalModels: {
        label: PRODUCT_FIELD_LABEL_LEGEND["totalModels"] || "Related models",
        tdClassName: "text-center",
        tdContent: (product) => (
          <Link
            to={`product-models?searchTerm=${product.id}`}
            title="View models of this product"
          >
            {product.totalModels}
          </Link>
        ),
        getCsvVal: (product) => product.totalModels,
      },
      totalVariations: {
        label:
          PRODUCT_FIELD_LABEL_LEGEND["totalVariations"] || "Related variations",
        tdClassName: "text-center",
        tdContent: (product) => <>{product.totalVariations}</>,
        getCsvVal: (product) => product.totalVariations,
      },
      stopSelling: {
        label: PRODUCT_FIELD_LABEL_LEGEND["stopSelling"] || "Stop selling",
        tdContent: (product) => <>{product.stopSelling ? "Yes" : "No"}</>,
        getCsvVal: (product) => (product.stopSelling ? "Yes" : "No"),
      },
      createdBy: {
        label: PRODUCT_FIELD_LABEL_LEGEND["createdBy"] || "Created by",
        tdContent: (product) => (
          <DetailUserLink
            userId={product.createdBy.id}
            displayName={product.createdBy.fullName}
          />
        ),
        getCsvVal: (product) => product.createdBy.fullName,
      },
      createdAt: {
        label: PRODUCT_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (product) => (
          <>{new Date(product.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (product) => new Date(product.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: PRODUCT_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (product) => (
          <>{new Date(product.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (product) => new Date(product.updatedAt).toLocaleString(),
      },
      actions: {
        label: PRODUCT_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (product) => (
          <div className="d-flex gap-2">
            {canEditProduct && (
              <EditBtnLink linkTo={`${product.id}/edit`} title="edit product" />
            )}
            {canDeleteProduct && (
              <DeleteBtn
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    productIdToDelete: product.id,
                  }));
                }}
                title="delete product"
              />
            )}
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canDeleteProduct, canEditProduct, getBrandSync, getCategorySync]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [products, setProducts] = useState<AdminProductListResponse | null>(
    null
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedProductIds, setSelectedProductIds] = useState<
    string[] | "all"
  >([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    productIdToDelete: null,
    productIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial when first load or search params change or refreshSignal
  useEffect(() => {
    const handleFetchSetInitialData = async () => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        // Pre-fetch brands and categories for filter selects, getSync functions
        await Promise.all([
          !sysUserId ? getSysUserId() : Promise.resolve(),
          !brands ? fetchBrands() : Promise.resolve(),
          !categories ? fetchCategories() : Promise.resolve(),
        ]);

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlCategoryId,
          urlBrandId,
          urlPriceCentsMin,
          urlPriceCentsMax,
          urlStopSelling,
          urlType,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("categoryId"),
          searchParams.get("brandId"),
          searchParams.get("priceCentsMin"),
          searchParams.get("priceCentsMax"),
          searchParams.get("stopSelling"),
          searchParams.get("type"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || "0",
          searchTerm: urlSearchTerm || "",
          categoryIds: urlCategoryId ? [urlCategoryId] : undefined,
          brandIds: urlBrandId ? [urlBrandId] : undefined,
          priceCentsMin:
            urlPriceCentsMin && isValidNumString(urlPriceCentsMin)
              ? urlPriceCentsMin
              : undefined,
          priceCentsMax:
            urlPriceCentsMax && isValidNumString(urlPriceCentsMax)
              ? urlPriceCentsMax
              : undefined,
          stopSelling:
            urlStopSelling && isValidBooleanString(urlStopSelling)
              ? urlStopSelling
              : undefined,
          type: PRODUCT_TYPES.includes(
            urlType as (typeof PRODUCT_TYPES)[number]
          )
            ? (urlType as (typeof PRODUCT_TYPES)[number])
            : undefined,
          sortBy: PRODUCT_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number]
          )
            ? (urlSortBy as (typeof PRODUCT_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedProductIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setProducts(await fetchProducts(newSearchForm));
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetching: false,
        }));
      }
    };

    handleFetchSetInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, refreshSignal]);

  // Handle show/hide the selection action toast
  useEffect(() => {
    if (!products) return;

    const selectedCount =
      selectedProductIds === "all"
        ? products.products.total
        : selectedProductIds.length;

    // If nothing selected -> dismiss
    if (selectedCount === 0) {
      toast.dismiss(selectionToastId || undefined);
      setSelectionToastId(null);
      return;
    }

    // Show or update toast (using the same id will update existing toast)
    toast.custom(
      (t) => (
        <div
          className={`rh-toast-selected gap-4 ${
            t.visible ? "rt-enter" : "rt-leave"
          }`}
        >
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn-close"
              title="Clear selection"
              aria-label="Close"
              onClick={() => {
                setSelectedProductIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} product(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                productIdsToDelete:
                  selectedProductIds === "all"
                    ? products.products.products.map((p) => p.id)
                    : selectedProductIds,
              }));
              setSelectedProductIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected products
          </button>
        </div>
      ),
      {
        id: SELECTION_TOAST_ID,
        duration: Infinity,
        position: "top-center",
      }
    );

    setSelectionToastId(SELECTION_TOAST_ID);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      if (process.isProcessing) return;

      const { name, value } = e.target;

      if (name === "limit") {
        setSearchParams((prev) => {
          prev.set("limit", value);
          prev.set("offset", "0");
          return prev;
        });
      }

      setSearchForm((prev) => ({
        ...prev,
        [name]: ["type", "brandIds", "categoryIds", "stopSelling"].includes(
          name
        )
          ? value
            ? [value]
            : undefined
          : value,
      }));
    },
    [process.isProcessing, setSearchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const {
        limit,
        searchTerm,
        categoryIds,
        brandIds,
        priceCentsMin,
        priceCentsMax,
        stopSelling,
        type,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (categoryIds?.length) prev.set("categoryId", categoryIds[0]);
        else prev.delete("categoryId");

        if (brandIds?.length) prev.set("brandId", brandIds[0]);
        else prev.delete("brandId");

        if (priceCentsMin) prev.set("priceCentsMin", priceCentsMin);
        else prev.delete("priceCentsMin");

        if (priceCentsMax) prev.set("priceCentsMax", priceCentsMax);
        else prev.delete("priceCentsMax");

        if (stopSelling) prev.set("stopSelling", stopSelling);
        else prev.delete("stopSelling");

        if (type) prev.set("type", type);
        else prev.delete("type");

        return prev;
      });
    },
    [process.isProcessing, searchForm, setSearchParams]
  );

  const handleClearFilters = useCallback((): void => {
    if (process.isProcessing) return;

    // Case when url hasn't changed but user wants to clear filters -> reset form state
    setSearchForm(DEFAULT_SEARCH_FORM);

    // setSearchParams((prev) => {
    //   prev.delete("searchTerm");
    //   prev.delete("categoryId");
    //   prev.delete("brandId");
    //   prev.delete("priceCentsMin");
    //   prev.delete("priceCentsMax");
    //   prev.delete("stopSelling");
    //   prev.delete("type");

    //   prev.set("limit", DEFAULT_SEARCH_FORM.limit);
    //   prev.set("offset", "0");

    //   return prev;
    // });
    setSearchParams({
      limit: DEFAULT_SEARCH_FORM.limit,
      offset: "0",
    });
  }, [process.isProcessing, setSearchParams]);

  const handleSort = useCallback(
    (sortBy: SearchForm["sortBy"]): void => {
      if (process.isProcessing) return;

      setSearchParams((prev) => ({ ...prev, sortBy }));
    },
    [process.isProcessing, setSearchParams]
  );

  const handleOffsetChange = useCallback(
    (newOffset: number): void => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: "smooth" });
      }

      setSearchParams((prev) => {
        prev.set("offset", newOffset.toString());
        return prev;
      });
    },
    [process.isProcessing, setSearchParams]
  );

  const handleSelectProduct = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !products) return;

      const { checked, name } = e.target;

      const productId = name.split("select-product-")[1];
      if (productId === "all") {
        setSelectedProductIds(checked ? "all" : []);
        return;
      }

      setSelectedProductIds((prev) => {
        let updatedSelectedProductIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedProductIds = products.products.products
              .filter((p) => p.id !== productId)
              .map((p) => p.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedProductIds = "all";
          }
        } else {
          updatedSelectedProductIds = [...prev];

          if (checked) {
            updatedSelectedProductIds.push(productId);
          } else {
            updatedSelectedProductIds = updatedSelectedProductIds.filter(
              (id) => id !== productId
            );
          }
        }

        return updatedSelectedProductIds.length === products.products.total
          ? "all"
          : updatedSelectedProductIds;
      });
    },
    [process.isProcessing, products]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-product-all" hidden aria-hidden>
          Select all products
        </label>
        <input
          type="checkbox"
          id="select-product-all"
          name="select-product-all"
          className="form-check-input"
          checked={selectedProductIds === "all"}
          onChange={handleSelectProduct}
          disabled={process.isProcessing}
        />
      </th>,
      ...displayFields.map((field) => {
        if (!field.visible) {
          return <Fragment key={`th-${field.name}`} />;
        }

        const colDisplay = TABLE_COL_DISPLAY[field.name];
        const isAsc = searchForm.sortBy === colDisplay.sortKey?.asc;
        const isDesc = searchForm.sortBy === colDisplay.sortKey?.desc;

        return (
          <th key={`th-${field.name}`} className={colDisplay.thClassName}>
            {colDisplay.isSortable ? (
              <TableHeadSortBtn
                label={colDisplay.label}
                isAsc={isAsc}
                isDesc={isDesc}
                onClick={() => {
                  handleSort(
                    isAsc ? colDisplay.sortKey.desc : colDisplay.sortKey.asc
                  );
                }}
              />
            ) : (
              colDisplay.label
            )}
          </th>
        );
      }),
    ];

    // Generate rows based on displayFields
    const colSpan = tableHeaders.length;
    const tableRows: JSX.Element = process.isFetching ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <Loading loadingMsg="Searching products..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg={apiErr} />
        </td>
      </tr>
    ) : !products ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg="Products data not found." />
        </td>
      </tr>
    ) : products.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No products found matching your criteria. Try adjust some
            filters or{" "}
            <button
              type="button"
              className="btn btn-link p-0 mb-1"
              onClick={handleClearFilters}
            >
              reset filters
            </button>
          </p>
        </td>
      </tr>
    ) : (
      <>
        {products.products.products.map((product) => (
          <tr key={product.id}>
            <td>
              <label
                htmlFor={`select-product-${product.id}`}
                hidden
                aria-hidden
              >
                Select this product
              </label>
              <input
                type="checkbox"
                id={`select-product-${product.id}`}
                name={`select-product-${product.id}`}
                className="form-check-input"
                checked={
                  selectedProductIds === "all" ||
                  selectedProductIds.includes(product.id)
                }
                onChange={handleSelectProduct}
                disabled={process.isProcessing}
              />
            </td>
            {displayFields.map((field, idx) => {
              if (!field.visible) {
                return <Fragment key={`td-${field.name}-${idx}`} />;
              }

              const colDisplay = TABLE_COL_DISPLAY[field.name];
              return (
                <td
                  key={`td-${idx}-${field.name}`}
                  className={colDisplay.tdClassName}
                >
                  {colDisplay.tdContent(product)}
                </td>
              );
            })}
          </tr>
        ))}
      </>
    );

    return (
      <table className="table table-hover table-nowrap mb-0" ref={tableRef}>
        <thead className="table-light">
          <tr>{tableHeaders.map((th) => th)}</tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    );
  }, [
    TABLE_COL_DISPLAY,
    apiErr,
    displayFields,
    handleClearFilters,
    handleSelectProduct,
    handleSort,
    process.isFetching,
    process.isProcessing,
    products,
    searchForm.sortBy,
    selectedProductIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: ProductDisplayField[]): void => {
      setProductManagementDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setProductManagementDisplayFields]
  );

  const handleResetConfigDisplay = useCallback((): void => {
    resetProductManagementDisplayFields();
    toast.success("Config display has been reset to default.");
  }, [resetProductManagementDisplayFields]);

  const handleExportList = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!products || products.total === 0) {
      toast("No products available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all products matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const productsToExport = (
        await fetchProducts({
          ...exportQuery,
          limit: products.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).products;

      if (productsToExport.total === 0) {
        toast("No products found to export.", { icon: WARNING_EMOJI });
        return;
      }

      // Use the current exportable + visible fields and their order for the CSV
      const exportableFields = displayFields.filter(
        (field) => field.exportable && field.visible
      );
      const headers = exportableFields.map(
        (field) => TABLE_COL_DISPLAY[field.name].label
      );
      const getVals = (
        product: AdminProductResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(product)
        );
      };

      exportToCsv<AdminProductResponse>(
        `${PROJECT_NAME.toLowerCase()}-products-export-${new Date().toISOString()}.csv`,
        headers,
        productsToExport.products,
        getVals
      );

      toast.success(
        `Exported ${productsToExport.products.length} products successfully.`
      );
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isExportingList: false,
      }));
    }
  }, [
    TABLE_COL_DISPLAY,
    displayFields,
    fetchProducts,
    process.isProcessing,
    products,
    searchForm,
  ]);

  const handleSubmitDeleteProduct = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteProduct) {
      toast.error("You do not have permission to delete products.");
      return;
    }
    if (!modal.productIdToDelete) {
      toast.error("Product ID to delete not found.");
      return;
    }

    try {
      await deleteProduct(modal.productIdToDelete);
      toast.success("Product deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteProduct,
    deleteProduct,
    modal.productIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteProductBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteProduct) {
      toast.error("You do not have permission to delete products.");
      return;
    }
    if (!modal.productIdsToDelete || modal.productIdsToDelete.length === 0) {
      toast.error("No products selected to delete.");
      return;
    }

    try {
      await deleteProductBulk({ productIds: modal.productIdsToDelete });
      toast.success(
        `${modal.productIdsToDelete.length} products deleted successfully.`
      );

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteProduct,
    deleteProductBulk,
    modal.productIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      productIdToDelete: null,
      productIdsToDelete: null,
    });
  }, []);

  /*
    TODO: Click to total variations to go to related models/variations management page with pre-applied filter.
  */

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Product management</h1>
        <div className="d-flex gap-3">
          <Link
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new product
          </Link>
          <button
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            onClick={() =>
              setModal((prev) => ({ ...prev, configDisplay: true }))
            }
          >
            <FontAwesomeIcon icon={faSliders} size="sm" className="me-2" />
            Config display
          </button>
          <button
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            title="Export current list to CSV file"
            onClick={handleExportList}
            disabled={process.isProcessing}
          >
            {process.isExportingList ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Exporting...</output>
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faFileExport}
                  size="sm"
                  className="me-2"
                />
                Export this list
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="card shadow-sm">
        {/* Filters */}
        <div className="card-header bg-white p-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="row g-3">
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search products
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, ID..."
                    value={searchForm.searchTerm}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                  />
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="type" className="input-group-text">
                    Type
                  </label>
                  <select
                    name="type"
                    id="type"
                    className="form-select text-capitalize"
                    value={searchForm.type || ""}
                    onChange={handleSearchChange}
                  >
                    <option value="">All</option>
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="categoryIds" className="input-group-text">
                    Category
                  </label>
                  <select
                    name="categoryIds"
                    id="categoryIds"
                    className="form-select"
                    value={searchForm.categoryIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    {!categories ? (
                      <>
                        {process.isFetching ? (
                          <option disabled>Loading...</option>
                        ) : (
                          <option disabled>Categories data not found.</option>
                        )}
                      </>
                    ) : categories.total === 0 ? (
                      <option disabled>No categories found.</option>
                    ) : (
                      <>
                        <option value="">All</option>
                        {categories.categories.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="brandIds" className="input-group-text">
                    Brand
                  </label>
                  <select
                    name="brandIds"
                    id="brandIds"
                    className="form-select"
                    value={searchForm.brandIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    {!brands ? (
                      <>
                        {process.isFetching ? (
                          <option disabled>Loading...</option>
                        ) : (
                          <option disabled>Brands data not found.</option>
                        )}
                      </>
                    ) : brands.total === 0 ? (
                      <option disabled>No brands found.</option>
                    ) : (
                      <>
                        <option value="">All</option>
                        {brands.brands.brands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="stopSelling" className="input-group-text">
                    Stop selling
                  </label>
                  <select
                    name="stopSelling"
                    id="stopSelling"
                    className="form-select"
                    value={searchForm.stopSelling || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label htmlFor="priceCentsMin" className="input-group-text">
                    Price (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="priceCentsMin"
                    name="priceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.priceCentsMin}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="priceCentsMax"
                    name="priceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={0}
                    value={searchForm.priceCentsMax}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
              <div className="col-12 col-lg-auto ms-lg-auto d-flex justify-content-end gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={process.isProcessing}
                >
                  Apply filters
                </button>
                <button
                  type="reset"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                  disabled={process.isProcessing}
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Table and pagination */}
        <div className="card-body p-0">
          {/* Table */}
          <div className="table-responsive">{genTable()}</div>

          {/* Pagination */}
          <div className="card-footer d-flex justify-content-end align-items-center gap-4 border-0">
            <div className="d-flex align-items-center gap-2">
              <p className="mb-0 text-muted">Rows per page:</p>
              <select
                name="limit"
                id="limit"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={searchForm.limit}
                onChange={handleSearchChange}
                disabled={process.isProcessing || !products}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (products && products.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {products && products.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    products.products.total
                  } of ${products.total}`
                : `0-0 of 0`}
            </p>
            {products && (
              <Pagination
                totalItems={products.total}
                itemsPerPage={products.limit}
                currentOffset={products.offset}
                onOffsetChange={handleOffsetChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfigDisplayModal
        show={modal.configDisplay}
        fields={displayFields}
        legend={PRODUCT_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.productIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteProduct}
        custom={{
          action: "delete",
          title: `Delete product ID ${modal.productIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this product? All the related data (models, variants, etc.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete product",
        }}
      />

      <ConfirmSubmitModal
        show={modal.productIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteProductBulk}
        custom={{
          action: "delete",
          title: `Delete selected products (${
            modal.productIdsToDelete?.length || "N/A"
          })`,
          body: "Are you sure you want to delete all selected products? All the related data (models, variants, etc.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete products",
        }}
      />
    </>
  );
}
