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
  WITHDRAWAL_METHODS,
  WITHDRAWAL_SEARCH_SORT_OPTIONS,
} from "../../../../../common/configs.common";
import type {
  AdminWithdrawalRequestListResponse,
  AdminWithdrawalRequestResponse,
  WithdrawalRequestSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_VIEWING,
  WAITING_EMOJI,
  WARNING_EMOJI,
  WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND,
} from "../../../configs";
import type {
  AdminWithdrawalRequestDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  WithdrawalRequestDisplayField,
} from "../../../utils/types";
import useWithdrawalRequestStore from "../../../store/admin/withdrawalRequestStore";
import useWithdrawalStateStore from "../../../store/common/withdrawalStateStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import DetailUserLink from "../DetailUserLink";
import {
  capFirstLetter,
  centsToUSD,
  formatError,
  getLocalDateString,
  isValidDateTimeString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCheck,
  faFileExport,
  faSliders,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import Btn from "../../common/Btn";
import Pagination from "../../common/Pagination";
import EditWithdrawalRequestStateModal from "./EditWithdrawalRequestModal";
import EditBulkWithdrawalRequestStateModal from "./EditBulkWithdrawalRequestStateModal";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  WithdrawalRequestSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  requestIdToApprove: string | null;
  requestIdToReject: string | null;
  requestIdsToApprove: string[] | null;
  requestIdsToReject: string[] | null;
};

type TableColDisplay = {
  [key in AdminWithdrawalRequestDisplayableField]: GeneralTableColDisplay<
    AdminWithdrawalRequestResponse,
    (typeof WITHDRAWAL_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_MODAL_STATE: Modal = {
  configDisplay: false,
  requestIdToApprove: null,
  requestIdToReject: null,
  requestIdsToApprove: null,
  requestIdsToReject: null,
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-requests-toast";

export default function WithdrawalRequestManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(
    "WithdrawalRequestManagement rendered count: ",
    renderCount.current,
  );

  const { fetchWithdrawalRequests, canApproveRequest, canRejectRequest } =
    useWithdrawalRequestStore();
  const { withdrawalStates, fetchWithdrawalStates, getWithdrawalState } =
    useWithdrawalStateStore();
  const { signals, refresh } = useRefreshStore();
  const {
    config: { withdrawalRequestManagementDisplayFields: displayFields },
    resetWithdrawalRequestManagementDisplayFields: resetDisplayFields,
    setWithdrawalRequestManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditRequest, canReadUser] = [
    useHasPermission("u_withdrawal_req"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (request) => (
          <Link
            to={`/admin/withdrawal-requests/${request.id}`}
            title="View details this request"
          >
            {request.id}
          </Link>
        ),
        getCsvVal: (request) => request.id,
      },
      requestedBy: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["requestedBy"] ||
          "Requested By",
        tdContent: (request) => (
          <DetailUserLink
            userId={request.requestedBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {request.requestedBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (request) => request.requestedBy.fullName,
      },
      amountCents: {
        label: WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["amountCents"] || "Amount",
        isSortable: true,
        sortKey: { asc: "amountCents_asc", desc: "amountCents_desc" },
        tdClassName: "text-center",
        tdContent: (request) => <>{centsToUSD(request.amountCents)}</>,
        getCsvVal: (request) => centsToUSD(request.amountCents),
      },
      currency: {
        label: WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["currency"] || "Currency",
        tdClassName: "text-center",
        tdContent: (request) => <>{request.currency}</>,
        getCsvVal: (request) => request.currency,
      },
      states: {
        label: WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["states"] || "State",
        tdClassName: "text-center",
        tdContent: (request) => {
          const currState =
            request.states.length === 0
              ? null
              : getWithdrawalState(request.states.at(-1)?.id || "");
          return <>{currState}</>; // TODO Use WithdrawalRequestStateBadge component
        },
        getCsvVal: (request) => {
          const currState =
            request.states.length === 0
              ? null
              : getWithdrawalState(request.states.at(-1)?.id || "");
          return currState?.name
            ? currState.name
            : currState === null
              ? "None"
              : "Unknown";
        },
      },
      withdrawalMethod: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["withdrawalMethod"] ||
          "Withdrawal Method",
        tdContent: (request) => <>{request.withdrawalMethod}</>, // TODO Use WithdrawalMethodBadge component
        getCsvVal: (request) => request.withdrawalMethod,
      },
      stripeTransferGroupId: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["stripeTransferGroupId"] ||
          "Stripe Transfer Group ID",
        tdContent: (request) => <>{request.stripeTransferGroupId}</>,
        getCsvVal: (request) => request.stripeTransferGroupId,
      },
      stripeTransferId: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["stripeTransferId"] ||
          "Stripe Transfer ID",
        tdContent: (request) => <>{request.stripeTransferId}</>,
        getCsvVal: (request) => request.stripeTransferId,
      },
      bankAccount: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["bankAccount"] ||
          "Bank Account",
        tdContent: (request) => (
          <div
            className="d-flex flex-column py-2"
            title={`Account: ${request.bankAccount.accountHolderName}`}
          >
            <strong className="small">{request.bankAccount.bankName}</strong>
            <span className="small text-muted font-monospace">
              •••• {request.bankAccount.last4}
            </span>
            <span className="small text-muted fst-italic">
              {request.bankAccount.accountHolderName}
            </span>
          </div>
        ),
        getCsvVal: (request) =>
          `${request.bankAccount.bankName} •••• ${request.bankAccount.last4} (${request.bankAccount.accountHolderName})`,
      },
      failureReason: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["failureReason"] ||
          "Failure Reason",
        tdContent: (request) => <>{request.failureReason || "None"}</>,
        getCsvVal: (request) => request.failureReason || "None",
      },
      processedAt: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["processedAt"] ||
          "Processed At",
        isSortable: true,
        sortKey: { asc: "processedAt_asc", desc: "processedAt_desc" },
        tdContent: (request) => (
          <>
            {request.processedAt
              ? new Date(request.processedAt).toLocaleString()
              : "None"}
          </>
        ),
        getCsvVal: (request) =>
          request.processedAt
            ? new Date(request.processedAt).toLocaleString()
            : "None",
      },
      createdAt: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (request) => (
          <>{new Date(request.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (request) => new Date(request.createdAt).toLocaleString(),
      },
      updatedAt: {
        label:
          WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (request) => (
          <>{new Date(request.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (request) => new Date(request.updatedAt).toLocaleString(),
      },
      actions: {
        label: WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (request) => {
          const currState = getWithdrawalState(request.states.at(-1)?.id || "");

          const canApprove =
            canEditRequest && canApproveRequest(currState?.lookupId || "");
          const canApproveTitle = !canEditRequest
            ? DISABLED_TITLE_FOR_VIEWING
            : !canApprove
              ? "This request cannot be approved in its current state"
              : "Approve this request";

          const canReject =
            canEditRequest && canRejectRequest(currState?.lookupId || "");
          const canRejectTitle = !canEditRequest
            ? DISABLED_TITLE_FOR_VIEWING
            : !canReject
              ? "This request cannot be rejected in its current state"
              : "Reject this request";

          return (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-success"
                title={canApproveTitle}
                disabled={!canApprove}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    requestIdToApprove: request.id,
                  }));
                }}
              >
                <FontAwesomeIcon icon={faCheck} size="sm" color="white" />
              </button>
              <button
                type="button"
                className="btn btn-danger"
                title={canRejectTitle}
                disabled={!canReject}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    requestIdToReject: request.id,
                  }));
                }}
              >
                <FontAwesomeIcon icon={faXmark} size="sm" color="white" />
              </button>
            </div>
          );
        },
        getCsvVal: () => null,
      },
    }),
    [
      canApproveRequest,
      canEditRequest,
      canReadUser,
      canRejectRequest,
      getWithdrawalState,
    ],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [requests, setRequests] =
    useState<AdminWithdrawalRequestListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedRequestIds, setSelectedRequestIds] = useState<
    string[] | "all"
  >([]);
  const [selectionToastId, setSelectionToastId] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>(DEFAULT_MODAL_STATE);

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params change or refresh signal
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        if (!withdrawalStates) await fetchWithdrawalStates();

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlStateId,
          urlAmountCentsMin,
          urlAmountCentsMax,
          urlCurrency,
          urlWithdrawalMethod,
          urlCreatedAtFrom,
          urlCreatedAtTo,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("stateId"),
          searchParams.get("amountCentsMin"),
          searchParams.get("amountCentsMax"),
          searchParams.get("currency"),
          searchParams.get("withdrawalMethod"),
          searchParams.get("createdAtFrom"),
          searchParams.get("createdAtTo"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          stateIds: urlStateId ? [urlStateId] : undefined,
          amountCentsMin: urlAmountCentsMin || undefined,
          amountCentsMax: urlAmountCentsMax || undefined,
          currency: urlCurrency || undefined,
          withdrawalMethod: WITHDRAWAL_METHODS.includes(
            urlWithdrawalMethod as (typeof WITHDRAWAL_METHODS)[number],
          )
            ? (urlWithdrawalMethod as (typeof WITHDRAWAL_METHODS)[number])
            : undefined,
          createdAtFrom:
            urlCreatedAtFrom && isValidDateTimeString(urlCreatedAtFrom)
              ? urlCreatedAtFrom
              : undefined,
          createdAtTo:
            urlCreatedAtTo && isValidDateTimeString(urlCreatedAtTo)
              ? urlCreatedAtTo
              : undefined,
          sortBy: WITHDRAWAL_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof WITHDRAWAL_SEARCH_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof WITHDRAWAL_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedRequestIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setRequests(await fetchWithdrawalRequests(newSearchForm));
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
  }, [searchParams, signals.admin]);

  // Handle show/hide the selection action toast
  useEffect(() => {
    if (!requests) return;

    const selectedCount =
      selectedRequestIds === "all"
        ? requests.requests.total
        : selectedRequestIds.length;

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
                setSelectedRequestIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} request(s) selected</div>
          </div>

          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-link text-success"
              title="Update request state to approved for selected requests"
              disabled={!canEditRequest || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  requestIdsToApprove:
                    selectedRequestIds === "all"
                      ? requests.requests.requests.map((o) => o.id)
                      : selectedRequestIds,
                }));
                setSelectedRequestIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faCheck} size="sm" />
            </button>
            <button
              type="button"
              className="btn btn-link text-danger"
              title="Update request state to rejected for selected requests"
              disabled={!canEditRequest || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  requestIdsToReject:
                    selectedRequestIds === "all"
                      ? requests.requests.requests.map((o) => o.id)
                      : selectedRequestIds,
                }));
                setSelectedRequestIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faXmark} size="sm" />
            </button>
          </div>
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
  }, [selectedRequestIds]);

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

      // Handle array fields
      if (name === "stateIds") {
        setSearchForm((prev) => ({
          ...prev,
          stateIds: value ? [value] : undefined,
        }));
        return;
      }

      setSearchForm((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    },
    [process.isProcessing, setSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const {
        limit,
        searchTerm,
        stateIds,
        amountCentsMin,
        amountCentsMax,
        currency,
        withdrawalMethod,
        createdAtFrom,
        createdAtTo,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (stateIds && stateIds.length > 0) {
          prev.set("stateId", stateIds[0]);
        } else {
          prev.delete("stateId");
        }

        if (amountCentsMin) prev.set("amountCentsMin", amountCentsMin);
        else prev.delete("amountCentsMin");

        if (amountCentsMax) prev.set("amountCentsMax", amountCentsMax);
        else prev.delete("amountCentsMax");

        if (currency) prev.set("currency", currency);
        else prev.delete("currency");

        if (withdrawalMethod) prev.set("withdrawalMethod", withdrawalMethod);
        else prev.delete("withdrawalMethod");

        if (createdAtFrom) prev.set("createdAtFrom", createdAtFrom);
        else prev.delete("createdAtFrom");

        if (createdAtTo) prev.set("createdAtTo", createdAtTo);
        else prev.delete("createdAtTo");

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

  const handleSelectRequest = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !requests) return;

      const { checked, name } = e.target;

      const returnId = name.split("select-request-")[1];
      if (returnId === "all") {
        setSelectedRequestIds(checked ? "all" : []);
        return;
      }

      setSelectedRequestIds((prev) => {
        let updatedSelectedRequestIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedRequestIds = requests.requests.requests
              .filter((m) => m.id !== returnId)
              .map((m) => m.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedRequestIds = "all";
          }
        } else {
          updatedSelectedRequestIds = [...prev];

          if (checked) {
            updatedSelectedRequestIds.push(returnId);
          } else {
            updatedSelectedRequestIds = updatedSelectedRequestIds.filter(
              (id) => id !== returnId,
            );
          }
        }

        return updatedSelectedRequestIds.length === requests.requests.total
          ? "all"
          : updatedSelectedRequestIds;
      });
    },
    [process.isProcessing, requests],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-request-all" hidden aria-hidden>
          Select all requests
        </label>
        <input
          type="checkbox"
          id="select-request-all"
          name="select-request-all"
          className="form-check-input"
          checked={selectedRequestIds === "all"}
          onChange={handleSelectRequest}
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
          <Loading loadingMsg="Searching requests..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !requests ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Returns data not found." />
        </td>
      </tr>
    ) : requests.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No requests in the system.
          </p>
        </td>
      </tr>
    ) : requests.requests.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No requests found matching your criteria. Try adjust some
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
        {requests.requests.requests.map((request) => (
          <tr key={request.id}>
            <td>
              <label
                htmlFor={`select-request-${request.id}`}
                hidden
                aria-hidden
              >
                Select this request
              </label>
              <input
                type="checkbox"
                id={`select-request-${request.id}`}
                name={`select-request-${request.id}`}
                className="form-check-input"
                checked={
                  selectedRequestIds === "all" ||
                  selectedRequestIds.includes(request.id)
                }
                onChange={handleSelectRequest}
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
                  {colDisplay.tdContent(request)}
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
    selectedRequestIds,
    handleSelectRequest,
    process.isProcessing,
    process.isFetching,
    displayFields,
    apiErr,
    requests,
    handleClearFilters,
    TABLE_COL_DISPLAY,
    searchForm.sortBy,
    handleSort,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: WithdrawalRequestDisplayField[]): void => {
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
    if (!requests || requests.total === 0) {
      toast.error("No requests to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all requests matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const requestsToExport = (
        await fetchWithdrawalRequests({
          ...exportQuery,
          limit: requests.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).requests;

      if (requestsToExport.requests.length === 0) {
        toast("No requests found to export.", { icon: WARNING_EMOJI });
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
        order: AdminWithdrawalRequestResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(order);
        });
      };

      exportToCsv<AdminWithdrawalRequestResponse>(
        `${PROJECT_NAME.toLowerCase()}-requests-exports-${new Date().toISOString()}.csv`,
        headers,
        requestsToExport.requests,
        getVals,
      );

      toast.success(
        `Exported ${requestsToExport.requests.length} requests successfully.`,
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
    requests,
    searchForm,
    fetchWithdrawalRequests,
    displayFields,
    TABLE_COL_DISPLAY,
  ]);

  const closeModal = useCallback((): void => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const onSuccessUpdate = useCallback((): void => {
    refresh("admin");
    setSelectedRequestIds([]);
    if (selectionToastId) {
      toast.dismiss(selectionToastId);
      setSelectionToastId(null);
    }
  }, [refresh, selectionToastId]);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Withdrawal Request Management</h1>
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
            {/* Search Input */}
            <div className="input-group mb-3">
              <label htmlFor="searchTerm" className="input-group-text">
                Search
              </label>
              <input
                type="text"
                id="searchTerm"
                name="searchTerm"
                className="form-control"
                placeholder="Request ID, User ID, Email, Name..."
                value={searchForm.searchTerm}
                onChange={handleSearchChange}
                disabled={process.isProcessing}
              />
            </div>

            {/* State Filter */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-3 col-md-4">
                <div className="input-group">
                  <label htmlFor="stateIds" className="input-group-text">
                    State
                  </label>
                  <select
                    id="stateIds"
                    name="stateIds"
                    className="form-select"
                    value={searchForm.stateIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All States</option>
                    {withdrawalStates?.states.map((state) => (
                      <option
                        key={state.id}
                        value={state.id}
                        title={state.description || undefined}
                      >
                        {capFirstLetter(state.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Withdrawal Method Filter */}
              <div className="col-12 col-lg-3 col-md-4">
                <div className="input-group">
                  <label
                    htmlFor="withdrawalMethod"
                    className="input-group-text"
                  >
                    Method
                  </label>
                  <select
                    id="withdrawalMethod"
                    name="withdrawalMethod"
                    className="form-select"
                    value={searchForm.withdrawalMethod || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All Methods</option>
                    {WITHDRAWAL_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {capFirstLetter(method.replace("_", " "))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency Filter */}
              <div className="col-12 col-lg-3 col-md-4">
                <div className="input-group">
                  <label htmlFor="currency" className="input-group-text">
                    Currency
                  </label>
                  <input
                    type="text"
                    id="currency"
                    name="currency"
                    className="form-control"
                    placeholder="e.g., USD"
                    value={searchForm.currency || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Amount Range */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-5">
                <div className="input-group">
                  <label htmlFor="amountCentsMin" className="input-group-text">
                    Amount Range
                  </label>
                  <input
                    type="number"
                    id="amountCentsMin"
                    name="amountCentsMin"
                    className="form-control"
                    placeholder="Min (cents)"
                    min={0}
                    value={searchForm.amountCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="amountCentsMax"
                    name="amountCentsMax"
                    className="form-control"
                    placeholder="Max (cents)"
                    min={searchForm.amountCentsMin ?? 0}
                    value={searchForm.amountCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="row g-3 mb-3">
              <div className="col-12 col-lg-6">
                <div className="input-group">
                  <label htmlFor="createdAtFrom" className="input-group-text">
                    Created Date Range
                  </label>
                  <input
                    type="date"
                    id="createdAtFrom"
                    name="createdAtFrom"
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
                    id="createdAtTo"
                    name="createdAtTo"
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
            </div>

            {/* Action Buttons */}
            <div className="row">
              <div className="col-12 col-lg-auto ms-lg-auto d-flex justify-content-end gap-2">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={process.isProcessing}
                >
                  Apply Filters
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearFilters}
                  disabled={process.isProcessing}
                >
                  Clear All Filters
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
                disabled={process.isProcessing || !requests}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (requests && requests.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {requests && requests.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    requests.requests.total
                  } of ${requests.total}`
                : `0-0 of 0`}
            </p>
            {requests && (
              <Pagination
                totalItems={requests.total}
                itemsPerPage={requests.limit}
                currentOffset={requests.offset}
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
        legend={WITHDRAWAL_REQUEST_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <EditWithdrawalRequestStateModal
        type="approve"
        requestId={modal.requestIdToApprove}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditWithdrawalRequestStateModal
        type="reject"
        requestId={modal.requestIdToReject}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkWithdrawalRequestStateModal
        type="approve"
        requestIds={modal.requestIdsToApprove}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkWithdrawalRequestStateModal
        type="reject"
        requestIds={modal.requestIdsToReject}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />
    </>
  );
}
