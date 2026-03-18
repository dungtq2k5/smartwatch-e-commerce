import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import {
  PRODUCT_BRAND_SORT_OPTIONS as BRAND_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  AdminProductBrandListResponse as BrandListResponse,
  AdminProductBrandResponse as BrandResponse,
  ProductBrandSearchQuery as BrandSearchQuery,
} from "../../../../../common/types.common";
import type {
  AdminProductBrandDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ProductBrandDisplayField as BrandDisplayField,
} from "../../../utils/types";
import { Link, useSearchParams } from "react-router-dom";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useProductBrandStore from "../../../store/admin/product/brandStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  PRODUCT_BRAND_FIELD_LABEL_LEGEND as BRAND_FIELD_LABEL_LEGEND,
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import DetailUserLink from "../DetailUserLink";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { exportToCsv } from "../../../utils/utils";
import LinkBtn from "../../common/LinkBtn";
import Btn from "../../common/Btn";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import Pagination from "../../common/Pagination";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<BrandSearchQuery, "limit" | "offset" | "searchTerm"> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  brandIdToDelete: string | null;
  brandIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminProductBrandDisplayableField]: GeneralTableColDisplay<
    BrandResponse,
    (typeof BRAND_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-brands-toast";

export default function BrandManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`BrandManagement render count: ${renderCount.current}`);

  const { fetchBrands, deleteBrand, deleteBrandBulk } = useProductBrandStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { productBrandManagementDisplayFields: displayFields },
    resetProductBrandManagementDisplayFields: resetDisplayFields,
    setProductBrandManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditBrand, canCreateBrand, canDeleteBrand, canReadUser] = [
    useHasPermission("u_product_brand"),
    useHasPermission("c_product_brand"),
    useHasPermission("d_product_brand"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: BRAND_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (brand) => <>{brand.id}</>,
        getCsvVal: (brand) => brand.id,
      },
      name: {
        label: BRAND_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (brand) => (
          <div className="d-flex align-items-center gap-2">
            {brand.logoUrl && (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="brand-logo--g"
              />
            )}
            <Link to={brand.id} title="View detail brand">
              {brand.name}
            </Link>
          </div>
        ),
        getCsvVal: (brand) => brand.name,
      },
      description: {
        label: BRAND_FIELD_LABEL_LEGEND["description"] || "Description",
        tdClassName: "td-description--truncate--g",
        tdContent: (brand) => <>{brand.description || "N/A"}</>,
        getCsvVal: (brand) => brand.description || "N/A",
      },
      createdBy: {
        label: BRAND_FIELD_LABEL_LEGEND["createdBy"] || "Created by",
        tdContent: (brand) => (
          <DetailUserLink
            userId={brand.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {brand.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (brand) => brand.createdBy.fullName,
      },
      createdAt: {
        label: BRAND_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (brand) => (
          <>{new Date(brand.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (brand) => new Date(brand.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: BRAND_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (brand) => (
          <>{new Date(brand.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (brand) => new Date(brand.updatedAt).toLocaleString(),
      },
      actions: {
        label: BRAND_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (brand) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${brand.id}/edit`}
              title="Edit brand"
              disabled={!canEditBrand}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  brandIdToDelete: brand.id,
                }));
              }}
              title="Delete brand"
              disabled={!canDeleteBrand}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canDeleteBrand, canEditBrand, canReadUser],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [brands, setBrands] = useState<BrandListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedBrandIds, setSelectedBrandIds] = useState<string[] | "all">(
    [],
  );
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    brandIdToDelete: null,
    brandIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial when first load or search params change or refreshSignal
  useEffect(() => {
    const handleFetchSetInitialData = async () => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        const [urlLimit, urlOffset, urlSearchTerm, urlSortBy] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          sortBy: BRAND_SORT_OPTIONS.includes(
            urlSortBy as (typeof BRAND_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof BRAND_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedBrandIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setBrands(await fetchBrands(newSearchForm));
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
    if (!brands) return;

    const selectedCount =
      selectedBrandIds === "all"
        ? brands.brands.total
        : selectedBrandIds.length;

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
                setSelectedBrandIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} brand(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            disabled={!canDeleteBrand || process.isProcessing}
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                brandIdsToDelete:
                  selectedBrandIds === "all"
                    ? brands.brands.brands.map((b) => b.id)
                    : selectedBrandIds,
              }));
              setSelectedBrandIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected brands
          </button>
        </div>
      ),
      {
        id: SELECTION_TOAST_ID,
        duration: Infinity,
        position: "top-center",
      },
    );

    setSelectionToastId(SELECTION_TOAST_ID);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandIds]);

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
        [name]: value,
      }));
    },
    [process.isProcessing, setSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const { limit, searchTerm } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        return prev;
      });
    },
    [process.isProcessing, searchForm, setSearchParams],
  );

  const handleClearFilters = useCallback((): void => {
    if (process.isProcessing) return;

    // Case when url hasn't changed but user wants to clear filters -> reset form state
    setSearchForm((prev) => ({
      ...DEFAULT_SEARCH_FORM,
      limit: prev.limit,
    }));

    setSearchParams({
      limit: searchForm.limit,
      offset: "0",
    });
  }, [process.isProcessing, searchForm.limit, setSearchParams]);

  const handleSort = useCallback(
    (sortBy: SearchForm["sortBy"]): void => {
      if (process.isProcessing) return;

      setSearchParams((prev) => ({ ...prev, sortBy }));
    },
    [process.isProcessing, setSearchParams],
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
    [process.isProcessing, setSearchParams],
  );

  const handleSelectBrand = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !brands) return;

      const { checked, name } = e.target;

      const brandId = name.split("select-brand-")[1];
      if (brandId === "all") {
        setSelectedBrandIds(checked ? "all" : []);
        return;
      }

      setSelectedBrandIds((prev) => {
        let updatedSelectedBrandIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedBrandIds = brands.brands.brands
              .filter((b) => b.id !== brandId)
              .map((b) => b.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedBrandIds = "all";
          }
        } else {
          updatedSelectedBrandIds = [...prev];

          if (checked) {
            updatedSelectedBrandIds.push(brandId);
          } else {
            updatedSelectedBrandIds = updatedSelectedBrandIds.filter(
              (id) => id !== brandId,
            );
          }
        }

        return updatedSelectedBrandIds.length === brands.brands.total
          ? "all"
          : updatedSelectedBrandIds;
      });
    },
    [process.isProcessing, brands],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-brand-all" hidden aria-hidden>
          Select all brands
        </label>
        <input
          type="checkbox"
          id="select-brand-all"
          name="select-brand-all"
          className="form-check-input"
          checked={selectedBrandIds === "all"}
          onChange={handleSelectBrand}
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
                    isAsc ? colDisplay.sortKey.desc : colDisplay.sortKey.asc,
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
          <Loading loadingMsg="Searching brands..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !brands ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Brands data not found." />
        </td>
      </tr>
    ) : brands.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No brands in the system.
          </p>
        </td>
      </tr>
    ) : brands.brands.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No brands found matching your criteria. Try adjust some
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
        {brands.brands.brands.map((brand) => (
          <tr key={brand.id}>
            <td>
              <label htmlFor={`select-brand-${brand.id}`} hidden aria-hidden>
                Select this brand
              </label>
              <input
                type="checkbox"
                id={`select-brand-${brand.id}`}
                name={`select-brand-${brand.id}`}
                className="form-check-input"
                checked={
                  selectedBrandIds === "all" ||
                  selectedBrandIds.includes(brand.id)
                }
                onChange={handleSelectBrand}
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
                  {colDisplay.tdContent(brand)}
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
    handleSelectBrand,
    handleSort,
    process.isFetching,
    process.isProcessing,
    brands,
    searchForm.sortBy,
    selectedBrandIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: BrandDisplayField[]): void => {
      setDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setDisplayFields],
  );

  const handleResetConfigDisplay = useCallback((): void => {
    resetDisplayFields();
    toast.success("Config display has been reset to default.");
  }, [resetDisplayFields]);

  const handleExportList = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!brands || brands.total === 0) {
      toast("No brands available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all brands matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const brandsToExport = (
        await fetchBrands({
          ...exportQuery,
          limit: brands.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).brands;

      if (brandsToExport.total === 0) {
        toast("No brands found to export.", { icon: WARNING_EMOJI });
        return;
      }

      // Use the current exportable + visible fields and their order for the CSV
      const exportableFields = displayFields.filter(
        (field) => field.exportable && field.visible,
      );
      const headers = exportableFields.map(
        (field) => TABLE_COL_DISPLAY[field.name].label,
      );
      const getVals = (
        brand: BrandResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(brand),
        );
      };

      exportToCsv<BrandResponse>(
        `${PROJECT_NAME.toLowerCase()}-brands-export-${new Date().toISOString()}.csv`,
        headers,
        brandsToExport.brands,
        getVals,
      );

      toast.success(
        `Exported ${brandsToExport.brands.length} brands successfully.`,
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
    fetchBrands,
    process.isProcessing,
    brands,
    searchForm,
  ]);

  const handleSubmitDeleteBrand = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteBrand) {
      toast.error("You do not have permission to delete brands.");
      return;
    }
    if (!modal.brandIdToDelete) {
      toast.error("Brand ID to delete not found.");
      return;
    }

    try {
      await deleteBrand(modal.brandIdToDelete);
      toast.success("Brand deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteBrand,
    deleteBrand,
    modal.brandIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteBrandBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteBrand) {
      toast.error("You do not have permission to delete brands.");
      return;
    }
    if (!modal.brandIdsToDelete || modal.brandIdsToDelete.length === 0) {
      toast.error("No brands selected to delete.");
      return;
    }

    try {
      await deleteBrandBulk({ brandIds: modal.brandIdsToDelete });
      toast.success(
        `${modal.brandIdsToDelete.length} brands deleted successfully.`,
      );

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteBrand,
    deleteBrandBulk,
    modal.brandIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      brandIdToDelete: null,
      brandIdsToDelete: null,
    });
  }, []);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Brand management</h1>
        <div className="d-flex gap-3">
          <LinkBtn
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
            disabled={!canCreateBrand}
            disabledtitle="You don't have permission to perform"
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new brand
          </LinkBtn>
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
          <Btn
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            title="Export current list to CSV file"
            onClick={handleExportList}
            disabled={process.isProcessing}
            loading={process.isExportingList}
            icon={<FontAwesomeIcon icon={faFileExport} size="sm" />}
          >
            Export this list
          </Btn>
        </div>
      </div>

      {/* Main content */}
      <div className="card shadow-sm">
        {/* Filters */}
        <div className="card-header bg-white p-3">
          <form onSubmit={handleSearchSubmit}>
            <div className="row g-2 justify-content-between">
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search users
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
              <div className="col-lg-3 col-md-12 d-flex justify-content-end gap-2">
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
                disabled={process.isProcessing || !brands}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (brands && brands.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {brands && brands.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + brands.brands.total
                  } of ${brands.total}`
                : `0-0 of 0`}
            </p>
            {brands && (
              <Pagination
                totalItems={brands.total}
                itemsPerPage={brands.limit}
                currentOffset={brands.offset}
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
        legend={BRAND_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.brandIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteBrand}
        custom={{
          action: "delete",
          title: `Delete brand ID ${modal.brandIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this brand? This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete brand",
        }}
      />

      <ConfirmSubmitModal
        show={modal.brandIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteBrandBulk}
        custom={{
          action: "delete",
          title: `Delete selected brands (${
            modal.brandIdsToDelete?.length || "N/A"
          })`,
          body: "Are you sure you want to delete all selected brands? This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete brands",
        }}
      />
    </>
  );
}
