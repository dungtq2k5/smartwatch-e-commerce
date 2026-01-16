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
  GRN_SEARCH_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  GrnListResponse,
  GrnDetailsResponse,
  GrnSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  GRN_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminGrnDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  GrnDisplayField,
} from "../../../utils/types";
import useUserStore from "../../../store/admin/userStore";
import useGrnStateStore from "../../../store/admin/grn/grnStateStore";
import useGrnStore from "../../../store/admin/grn/grnStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import LinkBtn from "../../common/LinkBtn";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import DetailUserLink from "../DetailUserLink";
import {
  centsToUSD,
  formatError,
  getLocalDateString,
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import EditBtnLink from "../EditBtnLink";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faFileExport,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Btn from "../../common/Btn";
import Pagination from "../../common/Pagination";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<GrnSearchQuery, "limit" | "offset" | "searchTerm"> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  grnIdsSelected: string[] | null;
};

type TableColDisplay = {
  [key in AdminGrnDisplayableField]: GeneralTableColDisplay<
    GrnDetailsResponse,
    (typeof GRN_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-grns-toast";

export default function GrnManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("GrnManagement render count:", renderCount.current);

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { grnStates, fetchGrnStates, getGrnState } = useGrnStateStore();
  const { fetchGrns } = useGrnStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);

  const {
    config: { grnManagementDisplayFields: displayFields },
    resetGrnManagementDisplayFields: resetDisplayFields,
    setGrnManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canReadProvider, canReadUser, canEditGrn] = [
    useHasPermission("r_provider_inventory"),
    useHasPermission("r_usr"),
    useHasPermission("u_grn"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: GRN_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (grn) => <>{grn.id}</>,
        getCsvVal: (grn) => grn.id,
      },
      name: {
        label: GRN_FIELD_LABEL_LEGEND["name"] || "Name",
        tdContent: (grn) => <>{grn.name}</>,
        getCsvVal: (grn) => grn.name,
      },
      provider: {
        label: GRN_FIELD_LABEL_LEGEND["provider"] || "Provider",
        tdContent: (grn) => (
          <LinkBtn
            to={`/admin/providers/${grn.provider.id}`}
            title="View this provider"
            disabled={!canReadProvider}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {grn.provider.fullName}
          </LinkBtn>
        ),
        getCsvVal: (grn) => grn.provider.fullName,
      },
      createdBy: {
        label: GRN_FIELD_LABEL_LEGEND["createdBy"] || "Created By",
        tdContent: (grn) => (
          <DetailUserLink
            userId={grn.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {grn.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (grn) => grn.createdBy.fullName,
      },
      totalPriceCents: {
        label: GRN_FIELD_LABEL_LEGEND["totalPriceCents"] || "Total Price",
        isSortable: true,
        sortKey: { asc: "totalPriceCents_asc", desc: "totalPriceCents_desc" },
        tdContent: (grn) => <>{centsToUSD(grn.totalPriceCents)}</>,
        getCsvVal: (grn) => centsToUSD(grn.totalPriceCents),
      },
      quantity: {
        label: GRN_FIELD_LABEL_LEGEND["quantity"] || "Quantity",
        tdContent: (grn) => <>{grn.quantity}</>,
        getCsvVal: (grn) => grn.quantity,
      },
      notes: {
        label: GRN_FIELD_LABEL_LEGEND["notes"] || "Notes",
        tdContent: (grn) => <>{grn.notes || "None"}</>,
        getCsvVal: (grn) => grn.notes || "None",
      },
      createdAt: {
        label: GRN_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (grn) => <>{new Date(grn.createdAt).toLocaleString()}</>,
        getCsvVal: (grn) => new Date(grn.createdAt).toLocaleString(),
      },
      state: {
        label: GRN_FIELD_LABEL_LEGEND["state"] || "State",
        tdContent: (grn) => <>{getGrnState(grn.stateId)?.name || "Unknown"}</>,
        getCsvVal: (grn) => getGrnState(grn.stateId)?.name || "Unknown",
      },
      reversed: {
        label: GRN_FIELD_LABEL_LEGEND["reversed"] || "Reversed",
        tdContent: (grn) => <>{grn.reversedByGrnId ? "Yes" : "No"}</>,
        getCsvVal: (grn) => (grn.reversedByGrnId ? "Yes" : "No"),
      },
      actions: {
        label: GRN_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (grn) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`/admin/grns/${grn.id}/edit`}
              title="Edit this GRN"
              disabled={!canEditGrn}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canEditGrn, canReadProvider, canReadUser, getGrnState]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: false,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [grns, setGrns] = useState<GrnListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedGrnIds, setSelectedGrnIds] = useState<string[] | "all">([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    grnIdsSelected: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params changed or refresh signal triggered
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        // Pre-fetch necessary data
        if (!sysUserId) await fetchSysUserId();
        if (!grnStates) await fetchGrnStates();

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlTotalPriceCentsMin,
          urlTotalPriceCentsMax,
          urlCreatedAtFrom,
          urlCreatedAtTo,
          urlStateId,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("totalPriceCentsMin"),
          searchParams.get("totalPriceCentsMax"),
          searchParams.get("createdAtFrom"),
          searchParams.get("createdAtTo"),
          searchParams.get("stateId"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          totalPriceCentsMin:
            urlTotalPriceCentsMin && isValidNumString(urlTotalPriceCentsMin)
              ? urlTotalPriceCentsMin
              : undefined,
          totalPriceCentsMax:
            urlTotalPriceCentsMax && isValidNumString(urlTotalPriceCentsMax)
              ? urlTotalPriceCentsMax
              : undefined,
          createdAtFrom:
            urlCreatedAtFrom && isValidDateTimeString(urlCreatedAtFrom)
              ? urlCreatedAtFrom
              : undefined,
          createdAtTo:
            urlCreatedAtTo && isValidDateTimeString(urlCreatedAtTo)
              ? urlCreatedAtTo
              : undefined,
          stateId: urlStateId || undefined,
          sortBy: GRN_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof GRN_SEARCH_SORT_OPTIONS)[number]
          )
            ? (urlSortBy as (typeof GRN_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedGrnIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setGrns(await fetchGrns(newSearchForm));
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
    if (!grns) return;

    const selectedCount =
      selectedGrnIds === "all" ? grns.grns.total : selectedGrnIds.length;

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
                setSelectedGrnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} grn(s) selected</div>
          </div>
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
  }, [selectedGrnIds]);

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
    [process.isProcessing, setSearchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const {
        limit,
        searchTerm,
        totalPriceCentsMin,
        totalPriceCentsMax,
        createdAtFrom,
        createdAtTo,
        sortBy,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (totalPriceCentsMin)
          prev.set("totalPriceCentsMin", totalPriceCentsMin);
        else prev.delete("totalPriceCentsMin");

        if (totalPriceCentsMax)
          prev.set("totalPriceCentsMax", totalPriceCentsMax);
        else prev.delete("totalPriceCentsMax");

        if (createdAtFrom) prev.set("createdAtFrom", createdAtFrom);
        else prev.delete("createdAtFrom");

        if (createdAtTo) prev.set("createdAtTo", createdAtTo);
        else prev.delete("createdAtTo");

        if (sortBy) prev.set("sortBy", sortBy);
        else prev.delete("sortBy");

        return prev;
      });
    },
    [process.isProcessing, searchForm, setSearchParams]
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

  const handleSelectGrn = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !grns) return;

      const { checked, name } = e.target;

      const grnId = name.split("select-grn-")[1];
      if (grnId === "all") {
        setSelectedGrnIds(checked ? "all" : []);
        return;
      }

      setSelectedGrnIds((prev) => {
        let updatedSelectedGrnIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedGrnIds = grns.grns.grns
              .filter((v) => v.id !== grnId)
              .map((v) => v.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedGrnIds = "all";
          }
        } else {
          updatedSelectedGrnIds = [...prev];

          if (checked) {
            updatedSelectedGrnIds.push(grnId);
          } else {
            updatedSelectedGrnIds = updatedSelectedGrnIds.filter(
              (id) => id !== grnId
            );
          }
        }

        return updatedSelectedGrnIds.length === grns.grns.total
          ? "all"
          : updatedSelectedGrnIds;
      });
    },
    [process.isProcessing, grns]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-grn-all" hidden aria-hidden>
          Select all grns
        </label>
        <input
          type="checkbox"
          id="select-grn-all"
          name="select-grn-all"
          className="form-check-input"
          checked={selectedGrnIds === "all"}
          onChange={handleSelectGrn}
          disabled={process.isProcessing}
        />
      </th>,
      ...displayFields.map((field) => {
        if (!field.visible) {
          return <Fragment key={`th-${field.name}`}></Fragment>;
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
          <Loading loadingMsg="Searching grns..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg={apiErr} />
        </td>
      </tr>
    ) : !grns ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg="Grns data not found." />
        </td>
      </tr>
    ) : grns.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No grns in the system.
          </p>
        </td>
      </tr>
    ) : grns.grns.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No grns found matching your criteria. Try adjust some filters
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
        {grns.grns.grns.map((model) => (
          <tr key={model.id}>
            <td>
              <label htmlFor={`select-grn-${model.id}`} hidden aria-hidden>
                Select this model
              </label>
              <input
                type="checkbox"
                id={`select-grn-${model.id}`}
                name={`select-grn-${model.id}`}
                className="form-check-input"
                checked={
                  selectedGrnIds === "all" || selectedGrnIds.includes(model.id)
                }
                onChange={handleSelectGrn}
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
                  {colDisplay.tdContent(model)}
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
    handleSelectGrn,
    handleSort,
    grns,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedGrnIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: GrnDisplayField[]): void => {
      setDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setDisplayFields]
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
    if (!grns || grns.total === 0) {
      toast.error("No grns to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all grns matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const grnsToExport = (
        await fetchGrns({
          ...exportQuery,
          limit: grns.total.toString(),
        })
      ).grns;

      if (grnsToExport.grns.length === 0) {
        toast("No grns found to export.", { icon: WARNING_EMOJI });
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
        grn: GrnDetailsResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(grn);
        });
      };

      exportToCsv<GrnDetailsResponse>(
        `${PROJECT_NAME.toLowerCase()}-grns-export-${new Date().toISOString()}.csv`,
        headers,
        grnsToExport.grns,
        getVals
      );

      toast.success(`Exported ${grnsToExport.grns.length} grns successfully.`);
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
    fetchGrns,
    process.isProcessing,
    searchForm,
    grns,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      grnIdsSelected: null,
    });
  }, []);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">GRN management</h1>
        <div className="d-flex gap-3">
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
            <div className="row g-3">
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search GRN
                  </label>
                  <input
                    type="text"
                    name="searchTerm"
                    id="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, ID, provider..."
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
                  <label htmlFor="stateId" className="input-group-text">
                    State
                  </label>
                  <select
                    name="stateId"
                    id="stateId"
                    className="form-select"
                    value={searchForm.stateId || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    {!grnStates ? (
                      <>
                        {process.isFetching ? (
                          <option disabled>Loading...</option>
                        ) : (
                          <option disabled>Grn states data not found.</option>
                        )}
                      </>
                    ) : grnStates.total === 0 ? (
                      <option disabled>No grn states found.</option>
                    ) : (
                      <>
                        <option value="">All</option>
                        {grnStates.states.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="totalPriceCentsMin"
                    className="input-group-text"
                  >
                    Total price (&#65504;)
                  </label>
                  <input
                    type="number"
                    name="totalPriceCentsMin"
                    id="totalPriceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.totalPriceCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    name="totalPriceCentsMax"
                    id="totalPriceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={searchForm.totalPriceCentsMin ?? 0}
                    value={searchForm.totalPriceCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label htmlFor="createdAtFrom" className="input-group-text">
                    Created at
                  </label>
                  <input
                    type="date"
                    name="createdAtFrom"
                    id="createdAtFrom"
                    className="form-control"
                    value={
                      searchForm.createdAtFrom
                        ? getLocalDateString(searchForm.createdAtFrom)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="date"
                    name="createdAtTo"
                    id="createdAtTo"
                    className="form-control"
                    value={
                      searchForm.createdAtTo
                        ? getLocalDateString(searchForm.createdAtTo)
                        : ""
                    }
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
                  type="button"
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
                disabled={process.isProcessing || !grns}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (grns && grns.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {grns && grns.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + grns.grns.total
                  } of ${grns.total}`
                : `0-0 of 0`}
            </p>
            {grns && (
              <Pagination
                totalItems={grns.total}
                itemsPerPage={grns.limit}
                currentOffset={grns.offset}
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
        legend={GRN_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />
    </>
  );
}
