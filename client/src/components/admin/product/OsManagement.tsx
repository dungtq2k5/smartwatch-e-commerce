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
  PRODUCT_OS_SORT_OPTIONS as OS_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  AdminProductOsListResponse as OsListResponse,
  AdminProductOsResponse as OsResponse,
  ProductOsSearchQuery as OsSearchQuery,
} from "../../../../../common/types.common";
import type {
  AdminProductOsDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ProductOsDisplayField as OsDisplayField,
} from "../../../utils/types";
import { Link, useSearchParams } from "react-router-dom";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useProductOsStore from "../../../store/admin/product/osStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  PRODUCT_OS_FIELD_LABEL_LEGEND as OS_FIELD_LABEL_LEGEND,
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

type SearchForm = Omit<OsSearchQuery, "limit" | "offset" | "searchTerm"> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  osIdToDelete: string | null;
  osIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminProductOsDisplayableField]: GeneralTableColDisplay<
    OsResponse,
    (typeof OS_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-Os-toast";

export default function OsManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`OsManagement render count: ${renderCount.current}`);

  const { fetchOses, deleteOs, deleteOsBulk } = useProductOsStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { productOsManagementDisplayFields: displayFields },
    resetProductOsManagementDisplayFields: resetDisplayFields,
    setProductOsManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditOs, canCreateOs, canDeleteOs, canReadUser] = [
    useHasPermission("u_product_os"),
    useHasPermission("c_product_os"),
    useHasPermission("d_product_os"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: OS_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (os) => <>{os.id}</>,
        getCsvVal: (os) => os.id,
      },
      name: {
        label: OS_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (os) => (
          <div className="d-flex align-items-center gap-2">
            {os.logoUrl && (
              <img src={os.logoUrl} alt={os.name} className="os-logo--g" />
            )}
            <Link to={os.id} title="View detail OS">
              {os.name}
            </Link>
          </div>
        ),
        getCsvVal: (os) => os.name,
      },
      description: {
        label: OS_FIELD_LABEL_LEGEND["description"] || "Description",
        tdClassName: "td-description--truncate--g",
        tdContent: (os) => <>{os.description || "N/A"}</>,
        getCsvVal: (os) => os.description || "N/A",
      },
      createdBy: {
        label: OS_FIELD_LABEL_LEGEND["createdBy"] || "Created by",
        tdContent: (os) => (
          <DetailUserLink
            userId={os.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {os.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (os) => os.createdBy.fullName,
      },
      createdAt: {
        label: OS_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (product) => (
          <>{new Date(product.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (product) => new Date(product.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: OS_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (product) => (
          <>{new Date(product.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (product) => new Date(product.updatedAt).toLocaleString(),
      },
      actions: {
        label: OS_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (product) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${product.id}/edit`}
              title="Edit OS"
              disabled={!canEditOs}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  osIdToDelete: product.id,
                }));
              }}
              title="Delete OS"
              disabled={!canDeleteOs}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canDeleteOs, canEditOs, canReadUser],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [os, setOs] = useState<OsListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedOsIds, setSelectedOsIds] = useState<string[] | "all">([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    osIdToDelete: null,
    osIdsToDelete: null,
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
          sortBy: OS_SORT_OPTIONS.includes(
            urlSortBy as (typeof OS_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof OS_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedOsIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setOs(await fetchOses(newSearchForm));
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
    if (!os) return;

    const selectedCount =
      selectedOsIds === "all" ? os.oses.total : selectedOsIds.length;

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
                setSelectedOsIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} OS(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            disabled={!canDeleteOs || process.isProcessing}
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                osIdsToDelete:
                  selectedOsIds === "all"
                    ? os.oses.oses.map((os) => os.id)
                    : selectedOsIds,
              }));
              setSelectedOsIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected OS(s)
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
  }, [selectedOsIds]);

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

  const handleSelectOs = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !os) return;

      const { checked, name } = e.target;

      const osId = name.split("select-os-")[1];
      if (osId === "all") {
        setSelectedOsIds(checked ? "all" : []);
        return;
      }

      setSelectedOsIds((prev) => {
        let updatedSelectedOsIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedOsIds = os.oses.oses
              .filter((os) => os.id !== osId)
              .map((os) => os.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedOsIds = "all";
          }
        } else {
          updatedSelectedOsIds = [...prev];

          if (checked) {
            updatedSelectedOsIds.push(osId);
          } else {
            updatedSelectedOsIds = updatedSelectedOsIds.filter(
              (id) => id !== osId,
            );
          }
        }

        return updatedSelectedOsIds.length === os.oses.total
          ? "all"
          : updatedSelectedOsIds;
      });
    },
    [process.isProcessing, os],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-os-all" hidden aria-hidden>
          Select all OS
        </label>
        <input
          type="checkbox"
          id="select-os-all"
          name="select-os-all"
          className="form-check-input"
          checked={selectedOsIds === "all"}
          onChange={handleSelectOs}
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
          <Loading loadingMsg="Searching OS..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !os ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="OS data not found." />
        </td>
      </tr>
    ) : os.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No OS in the system.
          </p>
        </td>
      </tr>
    ) : os.oses.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No OS found matching your criteria. Try adjust some filters
            or{" "}
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
        {os.oses.oses.map((os) => (
          <tr key={os.id}>
            <td>
              <label htmlFor={`select-os-${os.id}`} hidden aria-hidden>
                Select this os
              </label>
              <input
                type="checkbox"
                id={`select-os-${os.id}`}
                name={`select-os-${os.id}`}
                className="form-check-input"
                checked={
                  selectedOsIds === "all" || selectedOsIds.includes(os.id)
                }
                onChange={handleSelectOs}
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
                  {colDisplay.tdContent(os)}
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
    handleSelectOs,
    handleSort,
    process.isFetching,
    process.isProcessing,
    os,
    searchForm.sortBy,
    selectedOsIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: OsDisplayField[]): void => {
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
    if (!os || os.total === 0) {
      toast("No OS available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all os matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const osToExport = (
        await fetchOses({
          ...exportQuery,
          limit: os.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).oses;

      if (osToExport.total === 0) {
        toast("No OS found to export.", { icon: WARNING_EMOJI });
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
        os: OsResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(os),
        );
      };

      exportToCsv<OsResponse>(
        `${PROJECT_NAME.toLowerCase()}-os-export-${new Date().toISOString()}.csv`,
        headers,
        osToExport.oses,
        getVals,
      );

      toast.success(`Exported ${osToExport.oses.length} OS successfully.`);
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
    fetchOses,
    process.isProcessing,
    os,
    searchForm,
  ]);

  const handleSubmitDeleteOs = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteOs) {
      toast.error("You do not have permission to delete OS.");
      return;
    }
    if (!modal.osIdToDelete) {
      toast.error("OS ID to delete not found.");
      return;
    }

    try {
      await deleteOs(modal.osIdToDelete);
      toast.success("OS deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteOs,
    deleteOs,
    modal.osIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteOsBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteOs) {
      toast.error("You do not have permission to delete OS.");
      return;
    }
    if (!modal.osIdsToDelete || modal.osIdsToDelete.length === 0) {
      toast.error("No OS selected to delete.");
      return;
    }

    try {
      await deleteOsBulk({ osIds: modal.osIdsToDelete });
      toast.success(`${modal.osIdsToDelete.length} OS deleted successfully.`);

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteOs,
    deleteOsBulk,
    modal.osIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      osIdToDelete: null,
      osIdsToDelete: null,
    });
  }, []);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">OS management</h1>
        <div className="d-flex gap-3">
          <LinkBtn
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
            disabled={!canCreateOs}
            disabledtitle="You don't have permission to perform"
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new OS
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
                disabled={process.isProcessing || !os}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (os && os.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {os && os.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + os.oses.total
                  } of ${os.total}`
                : `0-0 of 0`}
            </p>
            {os && (
              <Pagination
                totalItems={os.total}
                itemsPerPage={os.limit}
                currentOffset={os.offset}
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
        legend={OS_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.osIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteOs}
        custom={{
          action: "delete",
          title: `Delete OS ID ${modal.osIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this OS? This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete OS",
        }}
      />

      <ConfirmSubmitModal
        show={modal.osIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteOsBulk}
        custom={{
          action: "delete",
          title: `Delete selected OS (${modal.osIdsToDelete?.length || "N/A"})`,
          body: "Are you sure you want to delete all selected OS? This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete OS",
        }}
      />
    </>
  );
}
