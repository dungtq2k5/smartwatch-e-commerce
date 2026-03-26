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
  ORDER_RETURN_SEARCH_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  AdminOrderReturnListResponse,
  AdminOrderReturnResponse,
  AdminOrderReturnSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  ORDER_RETURN_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminOrderReturnDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  OrderReturnDisplayField,
} from "../../../utils/types";
import { useReturnStore } from "../../../store/admin/orderReturn/orderReturnStore";
import useRefundStateStore from "../../../store/common/returnRefund/refundStateStore";
import usePickupStateStore from "../../../store/common/returnRefund/pickupStateStore";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import LinkBtn from "../../common/LinkBtn";
import { Link, useSearchParams } from "react-router-dom";
import DetailUserLink from "../DetailUserLink";
import OrderReturnStateBadge from "../OrderReturnStateBadge";
import {
  capFirstLetter,
  centsToUSD,
  formatError,
  getLocalDateString,
  isValidDateTimeString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import OrderReturnRefundStateBadge from "../OrderReturnRefundStateBadge";
import OrderReturnPickupStateBadge from "../OrderReturnPickupStateBadge";
import OrderReturnImagesCarousel from "../OrderReturnImagesCarousel";
import useReturnReasonStore from "../../../store/common/returnRefund/returnReasonStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCheck,
  faFileExport,
  faMoneyBillTransfer,
  faSearch,
  faSliders,
  faTruck,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import Btn from "../../common/Btn";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import Pagination from "../../common/Pagination";
import EditOrderReturnPickupStateModal from "./EditOrderReturnPickupStateModal";
import EditBulkOrderReturnPickupStateModal from "./EditBulkOrderReturnPickupStateModal";
import EditOrderReturnStateModal from "./EditOrderReturnStateModal";
import EditBulkOrderReturnStateModal from "./EditBulkOrderReturnStateModal";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  AdminOrderReturnSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  returnIdToApprove: string | null;
  returnIdsToApprove: string[] | null;
  returnIdToDecline: string | null;
  returnIdsToDecline: string[] | null;
  returnIdToRefund: string | null;
  returnIdsToRefund: string[] | null;
  returnIdToUpdatePickupState: string | null;
  returnIdsToUpdatePickupState: string[] | null;
};

type TableColDisplay = {
  [key in AdminOrderReturnDisplayableField]: GeneralTableColDisplay<
    AdminOrderReturnResponse,
    (typeof ORDER_RETURN_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_MODAL_STATE: Modal = {
  configDisplay: false,
  returnIdToApprove: null,
  returnIdsToApprove: null,
  returnIdToDecline: null,
  returnIdsToDecline: null,
  returnIdToRefund: null,
  returnIdsToRefund: null,
  returnIdToUpdatePickupState: null,
  returnIdsToUpdatePickupState: null,
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-returns-toast";

export default function OrderReturnManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("OrderReturnManagement rendered count: ", renderCount.current);

  const {
    fetchReturns,
    canApproveReturn,
    canDeclineReturn,
    canRefundReturn,
    canUpdateReturnPickupState,
  } = useReturnStore();
  const { refundStates, fetchRefundStates, getRefundState } =
    useRefundStateStore();
  const { pickupStates, fetchPickupStates, getPickupState } =
    usePickupStateStore();
  const { returnStates, fetchReturnStates, getReturnState } =
    useReturnStateStore();
  const { returnReasons, fetchReturnReasons, getReturnReason } =
    useReturnReasonStore();
  const { signals, refresh } = useRefreshStore();
  const {
    config: { orderReturnManagementDisplayFields: displayFields },
    resetOrderReturnManagementDisplayFields: resetDisplayFields,
    setOrderReturnManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditReturn, canReadOrder, canReadUser] = [
    useHasPermission("u_order_return"),
    useHasPermission("r_order"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (orderReturn) => (
          <Link
            to={`/admin/order-returns/${orderReturn.id}`}
            title={"View details this return"}
          >
            {orderReturn.id}
          </Link>
        ),
        getCsvVal: (orderReturn) => orderReturn.id,
      },
      orderId: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["orderId"] || "Order ID",
        tdContent: (orderReturn) => (
          <LinkBtn
            to={`/admin/orders/${orderReturn.orderId}`}
            title={"View details this order"}
            disabled={!canReadOrder}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {orderReturn.orderId}
          </LinkBtn>
        ),
        getCsvVal: (orderReturn) => orderReturn.orderId,
      },
      returnedBy: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["returnedBy"] || "Returned By",
        tdContent: (orderReturn) => (
          <DetailUserLink
            userId={orderReturn.returnedBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {orderReturn.returnedBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (orderReturn) => orderReturn.returnedBy.fullName,
      },
      items: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["items"] || "Items",
        tdContent: (order) => (
          <>
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </>
        ),
        getCsvVal: (orderReturn) => orderReturn.items.length,
      },
      pickupAddress: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["pickupAddress"] || "Pickup Address",
        tdContent: (orderReturn) => (
          <address className="m-0">
            {orderReturn.pickupAddress.fullAddress}
          </address>
        ),
        getCsvVal: (orderReturn) => orderReturn.pickupAddress.fullAddress,
      },
      refundTransaction: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["refundTransaction"] ||
          "Refund Transaction",
        tdContent: (orderReturn) => (
          <>
            {orderReturn.refundTransaction ? (
              <>
                {orderReturn.refundTransaction.amountCents}{" "}
                {orderReturn.refundTransaction.currency}
              </>
            ) : (
              "None"
            )}
          </>
        ),
        getCsvVal: (orderReturn) =>
          orderReturn.refundTransaction
            ? `${orderReturn.refundTransaction.amountCents} ${orderReturn.refundTransaction.currency}`
            : "N/A",
      },
      refundSummary: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["refundSummary"] || "Refund Amount",
        isSortable: true,
        sortKey: {
          asc: "finalRefundAmountCents_asc",
          desc: "finalRefundAmountCents_desc",
        },
        tdClassName: "text-center",
        tdContent: (orderReturn) => (
          <>{centsToUSD(orderReturn.refundSummary.finalRefundAmountCents)}</>
        ),
        getCsvVal: (orderReturn) =>
          centsToUSD(orderReturn.refundSummary.finalRefundAmountCents),
      },
      refundStates: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["refundStates"] || "Refund State",
        tdClassName: "text-center",
        tdContent: (orderReturn) => {
          const currState =
            orderReturn.refundStates.length === 0
              ? null
              : getRefundState(orderReturn.refundStates.at(-1)?.id || "");
          return <OrderReturnRefundStateBadge state={currState} />;
        },
        getCsvVal: (orderReturn) => {
          const currState =
            orderReturn.refundStates.length === 0
              ? null
              : getRefundState(orderReturn.refundStates.at(-1)?.id || "");
          return currState?.name
            ? currState.name
            : currState === null
              ? "None"
              : "Unknown";
        },
      },
      pickupStates: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["pickupStates"] || "Pickup State",
        tdClassName: "text-center",
        tdContent: (orderReturn) => {
          const currState =
            orderReturn.pickupStates.length === 0
              ? null
              : getPickupState(orderReturn.pickupStates.at(-1)?.id || "");
          return <OrderReturnPickupStateBadge state={currState} />;
        },
        getCsvVal: (orderReturn) => {
          const currState =
            orderReturn.pickupStates.length === 0
              ? null
              : getPickupState(orderReturn.pickupStates.at(-1)?.id || "");
          return currState?.name
            ? currState.name
            : currState === null
              ? "None"
              : "Unknown";
        },
      },
      states: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["states"] || "Return State",
        tdClassName: "text-center",
        tdContent: (orderReturn) => {
          const currState =
            orderReturn.states.length === 0
              ? null
              : getReturnState(orderReturn.states.at(-1)?.id || "");
          return <OrderReturnStateBadge state={currState} />;
        },
        getCsvVal: (orderReturn) => {
          const currState =
            orderReturn.states.length === 0
              ? null
              : getReturnState(orderReturn.states.at(-1)?.id || "");
          return currState?.name
            ? currState.name
            : currState === null
              ? "None"
              : "Unknown";
        },
      },
      pickupDate: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["pickupDate"] || "Pickup Date",
        isSortable: true,
        sortKey: { asc: "pickupDate_asc", desc: "pickupDate_desc" },
        tdContent: (orderReturn) => (
          <>
            {orderReturn.pickupDate
              ? new Date(orderReturn.pickupDate).toLocaleString()
              : "None"}
          </>
        ),
        getCsvVal: (orderReturn) =>
          orderReturn.pickupDate
            ? new Date(orderReturn.pickupDate).toLocaleString()
            : "None",
      },
      estimatePickupDate: {
        label:
          ORDER_RETURN_FIELD_LABEL_LEGEND["estimatePickupDate"] ||
          "Est Pickup Date",
        isSortable: true,
        sortKey: {
          asc: "estimatePickupDate_asc",
          desc: "estimatePickupDate_desc",
        },
        tdContent: (orderReturn) => (
          <>{new Date(orderReturn.estimatePickupDate).toLocaleString()}</>
        ),
        getCsvVal: (orderReturn) =>
          new Date(orderReturn.estimatePickupDate).toLocaleString(),
      },
      reasonId: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["reasonId"] || "Return Reason",
        tdContent: (orderReturn) => (
          <>{getReturnReason(orderReturn.reasonId)?.name || "Unknown"}</>
        ),
        getCsvVal: (orderReturn) =>
          getReturnReason(orderReturn.reasonId)?.name || "Unknown",
      },
      imageUrls: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["imageUrls"] || "Images",
        tdContent: (orderReturn) => (
          <OrderReturnImagesCarousel imageUrls={orderReturn.imageUrls} />
        ),
        getCsvVal: (orderReturn) => orderReturn.imageUrls.join(", "),
      },
      buyerReason: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["buyerReason"] || "Buyer Reason",
        tdContent: (orderReturn) => <>{orderReturn.buyerReason || "None"}</>,
        getCsvVal: (orderReturn) => orderReturn.buyerReason || "None",
      },
      createdAt: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (orderReturn) => (
          <>{new Date(orderReturn.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (orderReturn) =>
          new Date(orderReturn.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (orderReturn) => (
          <>{new Date(orderReturn.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (orderReturn) =>
          new Date(orderReturn.updatedAt).toLocaleString(),
      },
      actions: {
        label: ORDER_RETURN_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (orderReturn) => {
          // Update return state separated to approved/declined/refunding buttons
          const currReturnState = getReturnState(
            orderReturn.states.at(-1)?.id || "",
          );

          const approvableReturn =
            canEditReturn && canApproveReturn(currReturnState?.lookupId || "");
          const canApproveReturnTitle = !canEditReturn
            ? DISABLED_TITLE_FOR_PERFORMING
            : !approvableReturn
              ? "Only returns in pending approval state can be approved"
              : "Approve this return";

          const declinableReturn =
            canEditReturn && canDeclineReturn(currReturnState?.lookupId || "");
          const canDeclineReturnTitle = !canEditReturn
            ? DISABLED_TITLE_FOR_PERFORMING
            : !declinableReturn
              ? "Only returns in pending approval state can be declined"
              : "Decline this return";

          const refundableReturn =
            canEditReturn && canRefundReturn(currReturnState?.lookupId || "");
          const canRefundReturnTitle = !canEditReturn
            ? DISABLED_TITLE_FOR_PERFORMING
            : !refundableReturn
              ? "Only returns in items returned state can be refunded"
              : "Refund this return";

          const canEditPickupState =
            canEditReturn &&
            canUpdateReturnPickupState(
              getPickupState(orderReturn.states.at(-1)?.id || "")?.lookupId ||
                "",
            );
          const canEditPickupStateTitle = !canEditReturn
            ? DISABLED_TITLE_FOR_PERFORMING
            : !canEditPickupState
              ? "Only returns in proper state can be updated"
              : "Update pickup state of this return";

          return (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-success"
                title={canApproveReturnTitle}
                disabled={!approvableReturn}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    returnIdToApprove: orderReturn.id,
                  }));
                }}
              >
                <FontAwesomeIcon icon={faCheck} size="sm" color="white" />
              </button>
              <button
                type="button"
                className="btn btn-danger"
                title={canDeclineReturnTitle}
                disabled={!declinableReturn}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    returnIdToDecline: orderReturn.id,
                  }));
                }}
              >
                <FontAwesomeIcon icon={faXmark} size="sm" color="white" />
              </button>
              <button
                type="button"
                className="btn btn-success"
                title={canRefundReturnTitle}
                disabled={!refundableReturn}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    returnIdToRefund: orderReturn.id,
                  }));
                }}
              >
                <FontAwesomeIcon
                  icon={faMoneyBillTransfer}
                  size="sm"
                  color="white"
                />
              </button>
              <button
                type="button"
                className="btn btn-primary"
                title={canEditPickupStateTitle}
                disabled={!canEditPickupState}
                onClick={() => {
                  setModal((prev) => ({
                    ...prev,
                    returnIdToUpdatePickupState: orderReturn.id,
                  }));
                }}
              >
                <FontAwesomeIcon icon={faTruck} size="sm" color="white" />
              </button>
            </div>
          );
        },
        getCsvVal: () => null,
      },
    }),
    [
      canApproveReturn,
      canDeclineReturn,
      canEditReturn,
      canReadOrder,
      canReadUser,
      canRefundReturn,
      canUpdateReturnPickupState,
      getPickupState,
      getRefundState,
      getReturnReason,
      getReturnState,
    ],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [returns, setReturns] = useState<AdminOrderReturnListResponse | null>(
    null,
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedReturnIds, setSelectedReturnIds] = useState<string[] | "all">(
    [],
  );
  const [selectionToastId, setSelectionToastId] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>(DEFAULT_MODAL_STATE);

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params change or refresh signal
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        await Promise.all([
          refundStates ? Promise.resolve() : fetchRefundStates(),
          pickupStates ? Promise.resolve() : fetchPickupStates(),
          returnStates ? Promise.resolve() : fetchReturnStates(),
          returnReasons ? Promise.resolve() : fetchReturnReasons(),
        ]);

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlFinalRefundAmountCentsMin,
          urlFinalRefundAmountCentsMax,
          urlRefundStateId,
          urlPickupStateId,
          urlStateId,
          urlReasonId,
          urlPickupDateFrom,
          urlPickupDateTo,
          urlEstimatePickupDateFrom,
          urlEstimatePickupDateTo,
          urlCreatedAtFrom,
          urlCreatedAtTo,
          updatedAtFrom,
          updatedAtTo,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("finalRefundAmountCentsMin"),
          searchParams.get("finalRefundAmountCentsMax"),
          searchParams.get("refundStateId"),
          searchParams.get("pickupStateId"),
          searchParams.get("stateId"),
          searchParams.get("reasonId"),
          searchParams.get("pickupDateFrom"),
          searchParams.get("pickupDateTo"),
          searchParams.get("estimatePickupDateFrom"),
          searchParams.get("estimatePickupDateTo"),
          searchParams.get("createdAtFrom"),
          searchParams.get("createdAtTo"),
          searchParams.get("updatedAtFrom"),
          searchParams.get("updatedAtTo"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          finalRefundAmountCentsMin: urlFinalRefundAmountCentsMin || undefined,
          finalRefundAmountCentsMax: urlFinalRefundAmountCentsMax || undefined,
          refundStateIds: urlRefundStateId ? [urlRefundStateId] : undefined,
          pickupStateIds: urlPickupStateId ? [urlPickupStateId] : undefined,
          stateIds: urlStateId ? [urlStateId] : undefined,
          reasonIds: urlReasonId ? [urlReasonId] : undefined,
          pickupDateFrom:
            urlPickupDateFrom && isValidDateTimeString(urlPickupDateFrom)
              ? urlPickupDateFrom
              : undefined,
          pickupDateTo:
            urlPickupDateTo && isValidDateTimeString(urlPickupDateTo)
              ? urlPickupDateTo
              : undefined,
          estimatePickupDateFrom:
            urlEstimatePickupDateFrom &&
            isValidDateTimeString(urlEstimatePickupDateFrom)
              ? urlEstimatePickupDateFrom
              : undefined,
          estimatePickupDateTo:
            urlEstimatePickupDateTo &&
            isValidDateTimeString(urlEstimatePickupDateTo)
              ? urlEstimatePickupDateTo
              : undefined,
          createdAtFrom:
            urlCreatedAtFrom && isValidDateTimeString(urlCreatedAtFrom)
              ? urlCreatedAtFrom
              : undefined,
          createdAtTo:
            urlCreatedAtTo && isValidDateTimeString(urlCreatedAtTo)
              ? urlCreatedAtTo
              : undefined,
          updatedAtFrom:
            updatedAtFrom && isValidDateTimeString(updatedAtFrom)
              ? updatedAtFrom
              : undefined,
          updatedAtTo:
            updatedAtTo && isValidDateTimeString(updatedAtTo)
              ? updatedAtTo
              : undefined,
          sortBy: ORDER_RETURN_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof ORDER_RETURN_SEARCH_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof ORDER_RETURN_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedReturnIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setReturns(await fetchReturns(newSearchForm));
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
    if (!returns) return;

    const selectedCount =
      selectedReturnIds === "all"
        ? returns.returns.total
        : selectedReturnIds.length;

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
                setSelectedReturnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} return(s) selected</div>
          </div>

          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-link text-success"
              title="Update return state to approved for selected returns"
              disabled={!canEditReturn || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  returnIdsToApprove:
                    selectedReturnIds === "all"
                      ? returns.returns.returns.map((o) => o.id)
                      : selectedReturnIds,
                }));
                setSelectedReturnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faCheck} size="sm" />
            </button>
            <button
              type="button"
              className="btn btn-link text-danger"
              title="Update return state to declined for selected returns"
              disabled={!canEditReturn || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  returnIdsToDecline:
                    selectedReturnIds === "all"
                      ? returns.returns.returns.map((o) => o.id)
                      : selectedReturnIds,
                }));
                setSelectedReturnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faXmark} size="sm" />
            </button>
            <button
              type="button"
              className="btn btn-link text-success"
              title="Refund selected returns"
              disabled={!canEditReturn || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  returnIdsToRefund:
                    selectedReturnIds === "all"
                      ? returns.returns.returns.map((o) => o.id)
                      : selectedReturnIds,
                }));
                setSelectedReturnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faMoneyBillTransfer} size="sm" />
            </button>
            <button
              type="button"
              className="btn btn-link text-primary"
              title="Update pickup state for selected returns"
              disabled={!canEditReturn || process.isProcessing}
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  returnIdsToUpdatePickupState:
                    selectedReturnIds === "all"
                      ? returns.returns.returns.map((o) => o.id)
                      : selectedReturnIds,
                }));
                setSelectedReturnIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faTruck} size="sm" />
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
  }, [selectedReturnIds]);

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
      if (
        ["refundStateIds", "pickupStateIds", "stateIds", "reasonIds"].includes(
          name,
        )
      ) {
        setSearchForm((prev) => ({
          ...prev,
          [name]: value ? [value] : undefined,
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
        finalRefundAmountCentsMin,
        finalRefundAmountCentsMax,
        refundStateIds,
        pickupStateIds,
        stateIds,
        reasonIds,
        pickupDateFrom,
        pickupDateTo,
        estimatePickupDateFrom,
        estimatePickupDateTo,
        createdAtFrom,
        createdAtTo,
        updatedAtFrom,
        updatedAtTo,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (finalRefundAmountCentsMin)
          prev.set("finalRefundAmountCentsMin", finalRefundAmountCentsMin);
        else prev.delete("finalRefundAmountCentsMin");

        if (finalRefundAmountCentsMax)
          prev.set("finalRefundAmountCentsMax", finalRefundAmountCentsMax);
        else prev.delete("finalRefundAmountCentsMax");

        if (refundStateIds && refundStateIds.length > 0) {
          prev.set("refundStateId", refundStateIds[0]);
        } else {
          prev.delete("refundStateId");
        }

        if (pickupStateIds && pickupStateIds.length > 0) {
          prev.set("pickupStateId", pickupStateIds[0]);
        } else {
          prev.delete("pickupStateId");
        }

        if (stateIds && stateIds.length > 0) {
          prev.set("stateId", stateIds[0]);
        } else {
          prev.delete("stateId");
        }

        if (reasonIds && reasonIds.length > 0) {
          prev.set("reasonId", reasonIds[0]);
        } else {
          prev.delete("reasonId");
        }

        if (pickupDateFrom) prev.set("pickupDateFrom", pickupDateFrom);
        else prev.delete("pickupDateFrom");

        if (pickupDateTo) prev.set("pickupDateTo", pickupDateTo);
        else prev.delete("pickupDateTo");

        if (estimatePickupDateFrom)
          prev.set("estimatePickupDateFrom", estimatePickupDateFrom);
        else prev.delete("estimatePickupDateFrom");

        if (estimatePickupDateTo)
          prev.set("estimatePickupDateTo", estimatePickupDateTo);
        else prev.delete("estimatePickupDateTo");

        if (createdAtFrom) prev.set("createdAtFrom", createdAtFrom);
        else prev.delete("createdAtFrom");

        if (createdAtTo) prev.set("createdAtTo", createdAtTo);
        else prev.delete("createdAtTo");

        if (updatedAtFrom) prev.set("updatedAtFrom", updatedAtFrom);
        else prev.delete("updatedAtFrom");

        if (updatedAtTo) prev.set("updatedAtTo", updatedAtTo);
        else prev.delete("updatedAtTo");

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

  const handleSelectReturn = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !returns) return;

      const { checked, name } = e.target;

      const returnId = name.split("select-return-")[1];
      if (returnId === "all") {
        setSelectedReturnIds(checked ? "all" : []);
        return;
      }

      setSelectedReturnIds((prev) => {
        let updatedSelectedReturnIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedReturnIds = returns.returns.returns
              .filter((m) => m.id !== returnId)
              .map((m) => m.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedReturnIds = "all";
          }
        } else {
          updatedSelectedReturnIds = [...prev];

          if (checked) {
            updatedSelectedReturnIds.push(returnId);
          } else {
            updatedSelectedReturnIds = updatedSelectedReturnIds.filter(
              (id) => id !== returnId,
            );
          }
        }

        return updatedSelectedReturnIds.length === returns.returns.total
          ? "all"
          : updatedSelectedReturnIds;
      });
    },
    [process.isProcessing, returns],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-return-all" hidden aria-hidden>
          Select all returns
        </label>
        <input
          type="checkbox"
          id="select-return-all"
          name="select-return-all"
          className="form-check-input"
          checked={selectedReturnIds === "all"}
          onChange={handleSelectReturn}
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
          <Loading loadingMsg="Searching returns..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !returns ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Returns data not found." />
        </td>
      </tr>
    ) : returns.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No returns in the system.
          </p>
        </td>
      </tr>
    ) : returns.returns.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No returns found matching your criteria. Try adjust some
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
        {returns.returns.returns.map((orderReturn) => (
          <tr key={orderReturn.id}>
            <td>
              <label
                htmlFor={`select-return-${orderReturn.id}`}
                hidden
                aria-hidden
              >
                Select this return
              </label>
              <input
                type="checkbox"
                id={`select-return-${orderReturn.id}`}
                name={`select-return-${orderReturn.id}`}
                className="form-check-input"
                checked={
                  selectedReturnIds === "all" ||
                  selectedReturnIds.includes(orderReturn.id)
                }
                onChange={handleSelectReturn}
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
                  {colDisplay.tdContent(orderReturn)}
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
    handleSelectReturn,
    handleSort,
    returns,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedReturnIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: OrderReturnDisplayField[]): void => {
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
    if (!returns || returns.total === 0) {
      toast.error("No returns to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all returns matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const returnsToExport = (
        await fetchReturns({
          ...exportQuery,
          limit: returns.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).returns;

      if (returnsToExport.returns.length === 0) {
        toast("No returns found to export.", { icon: WARNING_EMOJI });
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
        order: AdminOrderReturnResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(order);
        });
      };

      exportToCsv<AdminOrderReturnResponse>(
        `${PROJECT_NAME.toLowerCase()}-returns-exports-${new Date().toISOString()}.csv`,
        headers,
        returnsToExport.returns,
        getVals,
      );

      toast.success(
        `Exported ${returnsToExport.returns.length} returns successfully.`,
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
    fetchReturns,
    returns,
    process.isProcessing,
    searchForm,
  ]);

  const closeModal = useCallback((): void => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const onSuccessUpdate = useCallback((): void => {
    refresh("admin");
    setSelectedReturnIds([]);
    if (selectionToastId) {
      toast.dismiss(selectionToastId);
      setSelectionToastId(null);
    }
  }, [refresh, selectionToastId]);

  // TODO Constantize all lookup values.

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Order Return Management</h1>
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
              {/* Search Term */}
              <div className="col-12">
                <div className="position-relative">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search returns
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by return ID, order ID, user email..."
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

              {/* State Filters Row */}
              <div className="col-12">
                <div className="row g-2">
                  {/* Return State */}
                  <div className="col-lg-3 col-md-6">
                    <div className="input-group">
                      <label htmlFor="stateId" className="input-group-text">
                        Return State
                      </label>
                      <select
                        id="stateId"
                        name="stateIds"
                        className="form-select"
                        value={searchForm.stateIds?.[0] || ""}
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      >
                        <option value="">All</option>
                        {returnStates?.states.map((state) => (
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

                  {/* Refund State */}
                  <div className="col-lg-3 col-md-6">
                    <div className="input-group">
                      <label
                        htmlFor="refundStateId"
                        className="input-group-text"
                      >
                        Refund State
                      </label>
                      <select
                        id="refundStateId"
                        name="refundStateIds"
                        className="form-select"
                        value={searchForm.refundStateIds?.[0] || ""}
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      >
                        <option value="">All</option>
                        {refundStates?.states.map((state) => (
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

                  {/* Pickup State */}
                  <div className="col-lg-3 col-md-6">
                    <div className="input-group">
                      <label
                        htmlFor="pickupStateId"
                        className="input-group-text"
                      >
                        Pickup State
                      </label>
                      <select
                        id="pickupStateId"
                        name="pickupStateIds"
                        className="form-select"
                        value={searchForm.pickupStateIds?.[0] || ""}
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      >
                        <option value="">All</option>
                        {pickupStates?.states.map((state) => (
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

                  {/* Return Reason */}
                  <div className="col-lg-3 col-md-6">
                    <div className="input-group">
                      <label htmlFor="reasonId" className="input-group-text">
                        Return Reason
                      </label>
                      <select
                        id="reasonId"
                        name="reasonIds"
                        className="form-select"
                        value={searchForm.reasonIds?.[0] || ""}
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      >
                        <option value="">All</option>
                        {returnReasons?.reasons.map((reason) => (
                          <option
                            key={reason.id}
                            value={reason.id}
                            title={reason.description || undefined}
                          >
                            {capFirstLetter(reason.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refund Amount Range */}
              <div className="col-12 col-lg-6">
                <div className="input-group">
                  <label
                    htmlFor="finalRefundAmountCentsMin"
                    className="input-group-text"
                  >
                    Refund Amount (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="finalRefundAmountCentsMin"
                    name="finalRefundAmountCentsMin"
                    className="form-control"
                    placeholder="Min"
                    min={0}
                    value={searchForm.finalRefundAmountCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="finalRefundAmountCentsMax"
                    name="finalRefundAmountCentsMax"
                    className="form-control"
                    placeholder="Max"
                    min={searchForm.finalRefundAmountCentsMin ?? 0}
                    value={searchForm.finalRefundAmountCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>

              {/* Date Ranges Row */}
              <div className="col-12">
                <div className="row g-2">
                  {/* Pickup Date Range */}
                  <div className="col-lg-6">
                    <div className="input-group">
                      <label
                        htmlFor="pickupDateFrom"
                        className="input-group-text"
                      >
                        Pickup Date
                      </label>
                      <input
                        type="date"
                        id="pickupDateFrom"
                        name="pickupDateFrom"
                        className="form-control"
                        value={
                          searchForm.pickupDateFrom
                            ? getLocalDateString(searchForm.pickupDateFrom)
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                      <span className="input-group-text">-</span>
                      <input
                        type="date"
                        id="pickupDateTo"
                        name="pickupDateTo"
                        className="form-control"
                        value={
                          searchForm.pickupDateTo
                            ? getLocalDateString(searchForm.pickupDateTo)
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                    </div>
                  </div>

                  {/* Estimate Pickup Date Range */}
                  <div className="col-lg-6">
                    <div className="input-group">
                      <label
                        htmlFor="estimatePickupDateFrom"
                        className="input-group-text"
                      >
                        Est. Pickup Date
                      </label>
                      <input
                        type="date"
                        id="estimatePickupDateFrom"
                        name="estimatePickupDateFrom"
                        className="form-control"
                        value={
                          searchForm.estimatePickupDateFrom
                            ? getLocalDateString(
                                searchForm.estimatePickupDateFrom,
                              )
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                      <span className="input-group-text">-</span>
                      <input
                        type="date"
                        id="estimatePickupDateTo"
                        name="estimatePickupDateTo"
                        className="form-control"
                        value={
                          searchForm.estimatePickupDateTo
                            ? getLocalDateString(
                                searchForm.estimatePickupDateTo,
                              )
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                    </div>
                  </div>

                  {/* Created Date Range */}
                  <div className="col-lg-6">
                    <div className="input-group">
                      <label
                        htmlFor="createdAtFrom"
                        className="input-group-text"
                      >
                        Created Date
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

                  {/* Updated Date Range */}
                  <div className="col-lg-6">
                    <div className="input-group">
                      <label
                        htmlFor="updatedAtFrom"
                        className="input-group-text"
                      >
                        Updated Date
                      </label>
                      <input
                        type="date"
                        id="updatedAtFrom"
                        name="updatedAtFrom"
                        className="form-control"
                        value={
                          searchForm.updatedAtFrom
                            ? getLocalDateString(searchForm.updatedAtFrom)
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                      <span className="input-group-text">-</span>
                      <input
                        type="date"
                        id="updatedAtTo"
                        name="updatedAtTo"
                        className="form-control"
                        value={
                          searchForm.updatedAtTo
                            ? getLocalDateString(searchForm.updatedAtTo)
                            : ""
                        }
                        onChange={handleSearchChange}
                        disabled={process.isProcessing}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="col-12 d-flex justify-content-end gap-2">
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
                disabled={process.isProcessing || !returns}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (returns && returns.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {returns && returns.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    returns.returns.total
                  } of ${returns.total}`
                : `0-0 of 0`}
            </p>
            {returns && (
              <Pagination
                totalItems={returns.total}
                itemsPerPage={returns.limit}
                currentOffset={returns.offset}
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
        legend={ORDER_RETURN_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <EditOrderReturnStateModal
        type="approve"
        returnId={modal.returnIdToApprove}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderReturnStateModal
        type="approve"
        returnIds={modal.returnIdsToApprove}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditOrderReturnStateModal
        type="decline"
        returnId={modal.returnIdToDecline}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderReturnStateModal
        type="decline"
        returnIds={modal.returnIdsToDecline}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditOrderReturnStateModal
        type="refund"
        returnId={modal.returnIdToRefund}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderReturnStateModal
        type="refund"
        returnIds={modal.returnIdsToRefund}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditOrderReturnPickupStateModal
        returnId={modal.returnIdToUpdatePickupState}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderReturnPickupStateModal
        returnIds={modal.returnIdsToUpdatePickupState}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />
    </>
  );
}
