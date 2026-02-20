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
  PROJECT_NAME,
  PROVIDER_SEARCH_SORT_OPTIONS,
} from "../../../../../common/configs.common";
import type {
  ProviderResponse,
  ProviderListResponse,
  ProviderSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  PROVIDER_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminProviderDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ProviderDisplayField,
} from "../../../utils/types";
import useProviderStore from "../../../store/admin/grn/providerStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { Link, useSearchParams } from "react-router-dom";
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
import { exportToCsv } from "../../../utils/utils";
import LinkBtn from "../../common/LinkBtn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Btn from "../../common/Btn";
import Pagination from "../../common/Pagination";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  ProviderSearchQuery,
  "searchTerm" | "limit" | "offset"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  providerIdToDelete: string | null;
  providerIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminProviderDisplayableField]: GeneralTableColDisplay<
    ProviderResponse,
    (typeof PROVIDER_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-providers-toast";

export default function ProviderManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`ProviderManagement render count: ${renderCount.current}`);

  const { fetchProviders, deleteProvider, deleteProviderBulk } =
    useProviderStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { providerManagementDisplayFields: displayFields },
    resetProviderManagementDisplayFields: resetDisplayFields,
    setProviderManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditProvider, canDeleteProvider, canCreateProvider, canReadUser] = [
    useHasPermission("u_provider_inventory"),
    useHasPermission("d_provider_inventory"),
    useHasPermission("c_provider_inventory"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: PROVIDER_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (provider) => <>{provider.id}</>,
        getCsvVal: (provider) => provider.id,
      },
      fullName: {
        label: PROVIDER_FIELD_LABEL_LEGEND["fullName"] || "Full name",
        isSortable: true,
        sortKey: { asc: "fullName_asc", desc: "fullName_desc" },
        tdContent: (provider) => (
          <Link to={provider.id} title="View detail provider">
            {provider.fullName}
          </Link>
        ),
        getCsvVal: (provider) => provider.fullName,
      },
      email: {
        label: PROVIDER_FIELD_LABEL_LEGEND["email"] || "Email",
        tdContent: (provider) => <>{provider.email || "N/A"}</>,
        getCsvVal: (provider) => provider.email || "N/A",
      },
      phoneNumber: {
        label: PROVIDER_FIELD_LABEL_LEGEND["phoneNumber"] || "Phone number",
        tdContent: (provider) => <>{provider.phoneNumber || "N/A"}</>,
        getCsvVal: (provider) => provider.phoneNumber || "N/A",
      },
      createdBy: {
        label: PROVIDER_FIELD_LABEL_LEGEND["createdBy"] || "Created by",
        tdContent: (provider) => (
          <DetailUserLink
            userId={provider.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {provider.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (provider) => provider.createdBy.fullName,
      },
      createdAt: {
        label: PROVIDER_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        tdContent: (provider) => (
          <>{new Date(provider.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (provider) => new Date(provider.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: PROVIDER_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        tdContent: (provider) => (
          <>{new Date(provider.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (provider) => new Date(provider.updatedAt).toLocaleString(),
      },
      actions: {
        label: PROVIDER_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (provider) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${provider.id}/edit`}
              title="Edit provider"
              disabled={!canEditProvider}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              title="Delete provider"
              onClick={() =>
                setModal((prev) => ({
                  ...prev,
                  providerIdToDelete: provider.id,
                }))
              }
              disabled={!canDeleteProvider}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canDeleteProvider, canEditProvider, canReadUser],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [providers, setProviders] = useState<ProviderListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedProviderIds, setSelectedProviderIds] = useState<
    string[] | "all"
  >([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    providerIdToDelete: null,
    providerIdsToDelete: null,
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
          sortBy: PROVIDER_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof PROVIDER_SEARCH_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof PROVIDER_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedProviderIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setProviders(await fetchProviders(newSearchForm));
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
    if (!providers) return;

    const selectedCount =
      selectedProviderIds === "all"
        ? providers.providers.total
        : selectedProviderIds.length;

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
                setSelectedProviderIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} provider(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                providerIdsToDelete:
                  selectedProviderIds === "all"
                    ? providers.providers.providers.map((u) => u.id)
                    : selectedProviderIds,
              }));
              setSelectedProviderIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected providers
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
  }, [selectedProviderIds]);

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
        return;
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

      const { limit, searchTerm, sortBy } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (sortBy) prev.set("sortBy", sortBy);
        else prev.delete("sortBy");

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

  const handleSelectProvider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !providers) return;

      const { checked, name } = e.target;

      const providerId = name.split("select-provider-")[1];
      if (providerId === "all") {
        setSelectedProviderIds(checked ? "all" : []);
        return;
      }

      setSelectedProviderIds((prev) => {
        let updatedSelectedProvidersIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedProvidersIds = providers.providers.providers
              .filter((provider) => provider.id !== providerId)
              .map((provider) => provider.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedProvidersIds = "all";
          }
        } else {
          updatedSelectedProvidersIds = [...prev];

          if (checked) {
            updatedSelectedProvidersIds.push(providerId);
          } else {
            updatedSelectedProvidersIds = updatedSelectedProvidersIds.filter(
              (id) => id !== providerId,
            );
          }
        }

        return updatedSelectedProvidersIds.length === providers.providers.total
          ? "all"
          : updatedSelectedProvidersIds;
      });
    },
    [process.isProcessing, providers],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-provider-all" hidden aria-hidden>
          Select all providers
        </label>
        <input
          type="checkbox"
          id="select-provider-all"
          name="select-provider-all"
          className="form-check-input"
          checked={selectedProviderIds === "all"}
          onChange={handleSelectProvider}
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
          <Loading loadingMsg="Searching providers..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !providers ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Providers data not found." />
        </td>
      </tr>
    ) : providers.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No providers found matching your criteria. Try adjust some
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
        {providers.providers.providers.map((provider) => (
          <tr key={provider.id}>
            <td>
              <label
                htmlFor={`select-provider-${provider.id}`}
                hidden
                aria-hidden
              >
                Select this provider
              </label>
              <input
                type="checkbox"
                id={`select-provider-${provider.id}`}
                name={`select-provider-${provider.id}`}
                className="form-check-input"
                checked={
                  selectedProviderIds === "all" ||
                  selectedProviderIds.includes(provider.id)
                }
                onChange={handleSelectProvider}
                disabled={process.isProcessing}
              />
            </td>
            {displayFields.map((field, idx) => {
              if (!field.visible) {
                return <Fragment key={`td-${idx}-${field.name}`} />;
              }

              const colDisplay = TABLE_COL_DISPLAY[field.name];
              return (
                <td
                  key={`td-${idx}-${field.name}`}
                  className={colDisplay.tdClassName}
                >
                  {colDisplay.tdContent(provider)}
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
    handleSelectProvider,
    handleSort,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedProviderIds,
    providers,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: ProviderDisplayField[]): void => {
      setDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setDisplayFields],
  );

  const handleResetConfigDisplay = useCallback((): void => {
    resetDisplayFields();
    toast.success("Config display has been reset to default.");
  }, [resetDisplayFields]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      providerIdToDelete: null,
      providerIdsToDelete: null,
    });
  }, []);

  const handleExportList = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!providers || providers.total === 0) {
      toast("No providers available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all providers matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const providersToExport = (
        await fetchProviders({
          ...exportQuery,
          limit: providers.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).providers;

      if (providersToExport.total === 0) {
        toast("No providers found to export.", { icon: WARNING_EMOJI });
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
        provider: ProviderResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(provider),
        );
      };

      exportToCsv<ProviderResponse>(
        `${PROJECT_NAME.toLowerCase()}-providers-exports-${new Date().toISOString()}.csv`,
        headers,
        providersToExport.providers,
        getVals,
      );

      toast.success(
        `Exported ${providersToExport.providers.length} providers successfully.`,
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
    process.isProcessing,
    providers,
    searchForm,
    fetchProviders,
    displayFields,
    TABLE_COL_DISPLAY,
  ]);

  const handleSubmitDeleteProvider = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteProvider) {
      toast.error("You do not have permission to delete providers.");
      return;
    }
    if (!modal.providerIdToDelete) {
      toast.error("Provider ID to delete not found.");
      return;
    }

    try {
      await deleteProvider(modal.providerIdToDelete);
      toast.success("Provider deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger the effect
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteProvider,
    deleteProvider,
    modal.providerIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteProviderBulk =
    useCallback(async (): Promise<void> => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!canDeleteProvider) {
        toast.error("You do not have permission to delete providers.");
        return;
      }
      if (
        !modal.providerIdsToDelete ||
        modal.providerIdsToDelete.length === 0
      ) {
        toast.error("No selected providers to delete.");
        return;
      }

      try {
        await deleteProviderBulk({ providerIds: modal.providerIdsToDelete });
        toast.success(
          `${modal.providerIdsToDelete.length} providers deleted successfully.`,
        );

        // Refresh list by re-triggering the useEffect
        // Create a new URLSearchParams object from the previous one to trigger the effect
        setSearchParams((prev) => new URLSearchParams(prev));
      } catch (error) {
        toast.error(formatError(error));
      }
    }, [
      canDeleteProvider,
      deleteProviderBulk,
      modal.providerIdsToDelete,
      process.isProcessing,
      setSearchParams,
    ]);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Provider management</h1>
        <div className="d-flex gap-3">
          <LinkBtn
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
            disabled={!canCreateProvider}
            disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new provider
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
                    Search providers
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, email, ID..."
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
                disabled={process.isProcessing || !providers}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (providers && providers.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {providers && providers.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    providers.providers.total
                  } of ${providers.total}`
                : `0-0 of 0`}
            </p>
            {providers && (
              <Pagination
                totalItems={providers.total}
                itemsPerPage={providers.limit}
                currentOffset={providers.offset}
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
        legend={PROVIDER_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.providerIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteProvider}
        custom={{
          action: "delete",
          title: `Delete provider ID ${modal.providerIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this provider? All the related data (provider's addresses, etc.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete provider",
        }}
      />

      <ConfirmSubmitModal
        show={modal.providerIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteProviderBulk}
        custom={{
          action: "delete",
          title: `Delete selected providers (${
            modal.providerIdsToDelete?.length || "N/A"
          })`,
          body: `Are you sure you want to delete all the selected providers? This action will delete ${
            modal.providerIdsToDelete?.length || "N/A"
          } provider(s) with all of the related data (providers' addresses, etc.) in the system and cannot be undone.`,
          cancelText: "Cancel",
          submitText: "Delete providers",
        }}
      />
    </>
  );
}
