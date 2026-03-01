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
  ORDER_SEARCH_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  AdminOrderListResponse,
  AdminOrderResponse,
  AdminOrderSearchQuery,
} from "../../../../../common/types.common";
import {
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  ORDER_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminOrderDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  OrderDisplayField,
} from "../../../utils/types";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import DetailUserLink from "../DetailUserLink";
import {
  capFirstLetter,
  centsToUSD,
  formatError,
  getLocalDateString,
  isValidBooleanString,
  isValidDateTimeString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import usePaymentMethodStore from "../../../store/common/order/paymentMethodStore";
import usePaymentStateStore from "../../../store/common/order/paymentStateStore";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";
import useOrderStateStore from "../../../store/common/order/orderStateStore";
import PaymentMethodBadge from "../PaymentMethodBadge";
import PaymentStateBadge from "../PaymentStateBadge";
import DeliveryStateBadge from "../DeliveryStateBadge";
import OrderStateBadge from "../OrderStateBadge";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCalendar,
  faFileExport,
  faSearch,
  faSliders,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import { exportToCsv } from "../../../utils/utils";
import Btn from "../../common/Btn";
import EditOrderDeliveryStateModal from "./EditOrderDeliveryStateModal";
import EditOrderEstReceivedDateModal from "./EditOrderEstReceivedDateModal";
import EditBulkOrderDeliveryStateModal from "./EditBulkOrderDeliveryStateModal";
import EditBulkOrderEstReceivedDateModal from "./EditBulkOrderEstReceivedDateModal";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import Pagination from "../../common/Pagination";
import LinkBtn from "../../common/LinkBtn";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  AdminOrderSearchQuery,
  "searchTerm" | "limit" | "offset"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  orderIdToUpdateDeliveryState: string | null;
  orderIdsToUpdateDeliveryState: string[] | null;
  orderIdToUpdateEstimateReceivedDate: string | null;
  orderIdsToUpdateEstimateReceivedDate: string[] | null;
};

type TableColDisplay = {
  [key in AdminOrderDisplayableField]: GeneralTableColDisplay<
    AdminOrderResponse,
    (typeof ORDER_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_MODAL_STATE: Modal = {
  configDisplay: false,
  orderIdToUpdateDeliveryState: null,
  orderIdsToUpdateDeliveryState: null,
  orderIdToUpdateEstimateReceivedDate: null,
  orderIdsToUpdateEstimateReceivedDate: null,
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-orders-toast";

export default function OrderManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`OrderManagement render count: ${renderCount.current}`);

  const { fetchOrders, canEditOrder: editableOrder } = useOrderStore();
  const { paymentMethods, fetchPaymentMethods, getPaymentMethod } =
    usePaymentMethodStore();
  const { paymentStates, fetchPaymentStates, getPaymentState } =
    usePaymentStateStore();
  const { deliveryStates, fetchDeliveryStates, getDeliveryState } =
    useDeliveryStateStore();
  const { orderStates, fetchOrderStates, getOrderState } = useOrderStateStore();
  const { signals, refresh } = useRefreshStore();
  const {
    config: { orderManagementDisplayFields: displayFields },
    resetOrderManagementDisplayFields: resetDisplayFields,
    setOrderManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditOrder, canReadUser] = [
    useHasPermission("u_order"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: ORDER_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (order) => (
          <LinkBtn
            to={`/admin/orders/${order.id}`}
            title="View details this order"
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {order.id}
          </LinkBtn>
        ),
        getCsvVal: (order) => order.id,
      },
      orderedBy: {
        label: ORDER_FIELD_LABEL_LEGEND["orderedBy"] || "Ordered By",
        tdContent: (order) => (
          <DetailUserLink
            userId={order.orderedBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {order.orderedBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (order) => order.orderedBy.fullName,
      },
      items: {
        label: ORDER_FIELD_LABEL_LEGEND["items"] || "Items",
        tdContent: (order) => (
          <>
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </>
        ),
        getCsvVal: (order) => order.items.length,
      },
      deliveryAddress: {
        label:
          ORDER_FIELD_LABEL_LEGEND["deliveryAddress"] || "Delivery Address",
        tdContent: (order) => (
          <address className="m-0">{order.deliveryAddress.fullAddress}</address>
        ),
        getCsvVal: (order) => order.deliveryAddress.fullAddress,
      },
      transaction: {
        label: ORDER_FIELD_LABEL_LEGEND["transaction"] || "Transaction",
        tdClassName: "text-center",
        tdContent: (order) => <>{order.transaction ? "Yes" : "No"}</>,
        getCsvVal: (order) => (order.transaction ? "Yes" : "No"),
      },
      paymentSummary: {
        label: ORDER_FIELD_LABEL_LEGEND["paymentSummary"] || "Total Amount",
        tdClassName: "text-center",
        isSortable: true,
        sortKey: { asc: "totalPriceCents_asc", desc: "totalPriceCents_desc" },
        tdContent: (order) => (
          <>{centsToUSD(order.paymentSummary.finalAmountCents)}</>
        ),
        getCsvVal: (order) => centsToUSD(order.paymentSummary.finalAmountCents),
      },
      paymentMethodId: {
        label: ORDER_FIELD_LABEL_LEGEND["paymentMethodId"] || "Payment Method",
        tdClassName: "text-center",
        tdContent: (order) => (
          <PaymentMethodBadge
            method={getPaymentMethod(order.paymentMethodId)}
          />
        ),
        getCsvVal: (order) =>
          getPaymentMethod(order.paymentMethodId)?.name || "N/A",
      },
      paymentStates: {
        label: ORDER_FIELD_LABEL_LEGEND["paymentStates"] || "Payment States",
        tdClassName: "text-center",
        tdContent: (order) => {
          const currStateId = order.paymentStates.at(-1)?.id;
          return (
            <PaymentStateBadge
              state={currStateId ? getPaymentState(currStateId) : undefined}
            />
          );
        },
        getCsvVal: (order) => {
          const currStateId = order.paymentStates.at(-1)?.id;
          return getPaymentState(currStateId || "")?.name || "N/A";
        },
      },
      deliveryStates: {
        label: ORDER_FIELD_LABEL_LEGEND["deliveryStates"] || "Delivery States",
        tdClassName: "text-center",
        tdContent: (order) => {
          const currStateId = order.deliveryStates.at(-1)?.id;
          return (
            <DeliveryStateBadge
              state={currStateId ? getDeliveryState(currStateId) : undefined}
            />
          );
        },
        getCsvVal: (order) => {
          const currStateId = order.deliveryStates.at(-1)?.id;
          return getDeliveryState(currStateId || "")?.name || "N/A";
        },
      },
      states: {
        label: ORDER_FIELD_LABEL_LEGEND["states"] || "Order States",
        tdClassName: "text-center",
        tdContent: (order) => {
          const currStateId = order.states.at(-1)?.id;
          return (
            <OrderStateBadge
              state={currStateId ? getOrderState(currStateId) : undefined}
            />
          );
        },
        getCsvVal: (order) => {
          const currStateId = order.states.at(-1)?.id;
          return getOrderState(currStateId || "")?.name || "N/A";
        },
      },
      orderDate: {
        label: ORDER_FIELD_LABEL_LEGEND["orderDate"] || "Order Date",
        isSortable: true,
        sortKey: { asc: "orderDate_asc", desc: "orderDate_desc" },
        tdContent: (order) => (
          <>
            {order.orderDate
              ? new Date(order.orderDate).toLocaleString()
              : "None"}
          </>
        ),
        getCsvVal: (order) =>
          order.orderDate ? new Date(order.orderDate).toLocaleString() : "None",
      },
      estimateReceivedDate: {
        label:
          ORDER_FIELD_LABEL_LEGEND["estimateReceivedDate"] ||
          "Estimated Received Date",
        isSortable: true,
        sortKey: {
          asc: "estimateReceivedDate_asc",
          desc: "estimateReceivedDate_desc",
        },
        tdContent: (order) => (
          <>
            {order.estimateReceivedDate
              ? new Date(order.estimateReceivedDate).toLocaleString()
              : "None"}
          </>
        ),
        getCsvVal: (order) =>
          order.estimateReceivedDate
            ? new Date(order.estimateReceivedDate).toLocaleString()
            : "None",
      },
      receivedDate: {
        label: ORDER_FIELD_LABEL_LEGEND["receivedDate"] || "Received Date",
        isSortable: true,
        sortKey: { asc: "receivedDate_asc", desc: "receivedDate_desc" },
        tdContent: (order) => (
          <>
            {order.receivedDate
              ? new Date(order.receivedDate).toLocaleString()
              : "None"}
          </>
        ),
        getCsvVal: (order) =>
          order.receivedDate
            ? new Date(order.receivedDate).toLocaleString()
            : "None",
      },
      fulfilled: {
        label: ORDER_FIELD_LABEL_LEGEND["fulfilled"] || "Fulfilled",
        isSortable: true,
        sortKey: { asc: "fulfilledAt_asc", desc: "fulfilledAt_desc" },
        tdClassName: "text-center",
        tdContent: (order) => <>{order.fulfilledAt ? "Yes" : "No"}</>,
        getCsvVal: (order) => (order.fulfilledAt ? "Yes" : "No"),
      },
      canReturn: {
        label: ORDER_FIELD_LABEL_LEGEND["canReturn"] || "Returnable",
        tdClassName: "text-center",
        tdContent: (order) => <>{order.canReturn ? "Yes" : "No"}</>,
        getCsvVal: (order) => (order.canReturn ? "Yes" : "No"),
      },
      createdAt: {
        label: ORDER_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (order) => <>{new Date(order.createdAt).toLocaleString()}</>,
        getCsvVal: (order) => new Date(order.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: ORDER_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (order) => <>{new Date(order.updatedAt).toLocaleString()}</>,
        getCsvVal: (order) => new Date(order.updatedAt).toLocaleString(),
      },
      actions: {
        label: ORDER_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (order) => {
          const editable = editableOrder(order.deliveryStates.at(-1)?.id || "");
          const editDeliveryStateTitle = !canEditOrder
            ? DISABLED_TITLE_FOR_PERFORMING
            : editable
              ? "Edit delivery state for this order"
              : "This order is completed and cannot be edited";
          const editEstimateReceivedDateTitle = !canEditOrder
            ? DISABLED_TITLE_FOR_PERFORMING
            : editable
              ? "Edit estimate received date for this order"
              : "This order is completed and cannot be edited";
          const disabled = !canEditOrder || !editable;

          return (
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn bg-warning"
                title={editDeliveryStateTitle}
                disabled={disabled}
                onClick={() =>
                  setModal((prev) => ({
                    ...prev,
                    orderIdToUpdateDeliveryState: order.id,
                  }))
                }
              >
                <FontAwesomeIcon icon={faTruck} size="sm" />
              </button>
              <button
                type="button"
                className="btn bg-info"
                title={editEstimateReceivedDateTitle}
                disabled={disabled}
                onClick={() =>
                  setModal((prev) => ({
                    ...prev,
                    orderIdToUpdateEstimateReceivedDate: order.id,
                  }))
                }
              >
                <FontAwesomeIcon icon={faCalendar} size="sm" />
              </button>
            </div>
          );
        },
        getCsvVal: () => null,
      },
    }),
    [
      canEditOrder,
      canReadUser,
      editableOrder,
      getDeliveryState,
      getOrderState,
      getPaymentMethod,
      getPaymentState,
    ],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<AdminOrderListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[] | "all">(
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
          paymentMethods ? Promise.resolve() : fetchPaymentMethods(),
          paymentStates ? Promise.resolve() : fetchPaymentStates(),
          deliveryStates ? Promise.resolve() : fetchDeliveryStates(),
          orderStates ? Promise.resolve() : fetchOrderStates(),
        ]);

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlDeliveryStateId,
          urlPaymentStateId,
          urlPaymentMethodId,
          urlStateId,
          urlOrderedBy,
          urlCanReturn,
          urlOrderDateFrom,
          urlOrderDateTo,
          urlEstimateReceivedDateFrom,
          urlEstimateReceivedDateTo,
          urlReceivedDateFrom,
          urlReceivedDateTo,
          urlCreatedAtFrom,
          urlCreatedAtTo,
          updatedAtFrom,
          updatedAtTo,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("deliveryStateId"),
          searchParams.get("paymentStateId"),
          searchParams.get("paymentMethodId"),
          searchParams.get("stateId"),
          searchParams.get("orderedBy"),
          searchParams.get("canReturn"),
          searchParams.get("orderDateFrom"),
          searchParams.get("orderDateTo"),
          searchParams.get("estimateReceivedDateFrom"),
          searchParams.get("estimateReceivedDateTo"),
          searchParams.get("receivedDateFrom"),
          searchParams.get("receivedDateTo"),
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
          deliveryStateIds: urlDeliveryStateId
            ? [urlDeliveryStateId]
            : undefined,
          paymentStateIds: urlPaymentStateId ? [urlPaymentStateId] : undefined,
          paymentMethodIds: urlPaymentMethodId
            ? [urlPaymentMethodId]
            : undefined,
          stateIds: urlStateId ? [urlStateId] : undefined,
          orderedBy: urlOrderedBy || undefined,
          canReturn:
            urlCanReturn && isValidBooleanString(urlCanReturn)
              ? urlCanReturn
              : undefined,
          orderDateFrom:
            urlOrderDateFrom && isValidDateTimeString(urlOrderDateFrom)
              ? urlOrderDateFrom
              : undefined,
          orderDateTo:
            urlOrderDateTo && isValidDateTimeString(urlOrderDateTo)
              ? urlOrderDateTo
              : undefined,
          estimateReceivedDateFrom:
            urlEstimateReceivedDateFrom &&
            isValidDateTimeString(urlEstimateReceivedDateFrom)
              ? urlEstimateReceivedDateFrom
              : undefined,
          estimateReceivedDateTo:
            urlEstimateReceivedDateTo &&
            isValidDateTimeString(urlEstimateReceivedDateTo)
              ? urlEstimateReceivedDateTo
              : undefined,
          receivedDateFrom:
            urlReceivedDateFrom && isValidDateTimeString(urlReceivedDateFrom)
              ? urlReceivedDateFrom
              : undefined,
          receivedDateTo:
            urlReceivedDateTo && isValidDateTimeString(urlReceivedDateTo)
              ? urlReceivedDateTo
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
          sortBy: ORDER_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof ORDER_SEARCH_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof ORDER_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedOrderIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setOrders(await fetchOrders(newSearchForm));
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
    if (!orders) return;

    const selectedCount =
      selectedOrderIds === "all"
        ? orders.orders.total
        : selectedOrderIds.length;

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
                setSelectedOrderIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} order(s) selected</div>
          </div>

          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-link text-primary"
              title="Update delivery state for selected orders"
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  orderIdsToUpdateDeliveryState:
                    selectedOrderIds === "all"
                      ? orders.orders.orders.map((o) => o.id)
                      : selectedOrderIds,
                }));
                setSelectedOrderIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faTruck} size="sm" />
            </button>
            <button
              type="button"
              className="btn btn-link text-primary"
              title="Update estimated received date for selected orders"
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  orderIdsToUpdateEstimateReceivedDate:
                    selectedOrderIds === "all"
                      ? orders.orders.orders.map((o) => o.id)
                      : selectedOrderIds,
                }));
                setSelectedOrderIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            >
              <FontAwesomeIcon icon={faCalendar} size="sm" />
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
  }, [selectedOrderIds]);

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
        [
          "deliveryStateIds",
          "paymentStateIds",
          "paymentMethodIds",
          "stateIds",
        ].includes(name)
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
        deliveryStateIds,
        paymentStateIds,
        paymentMethodIds,
        stateIds,
        orderedBy,
        canReturn,
        orderDateFrom,
        orderDateTo,
        estimateReceivedDateFrom,
        estimateReceivedDateTo,
        receivedDateFrom,
        receivedDateTo,
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

        if (deliveryStateIds && deliveryStateIds.length > 0) {
          prev.set("deliveryStateId", deliveryStateIds[0]);
        } else {
          prev.delete("deliveryStateId");
        }

        if (paymentStateIds && paymentStateIds.length > 0) {
          prev.set("paymentStateId", paymentStateIds[0]);
        } else {
          prev.delete("paymentStateId");
        }

        if (paymentMethodIds && paymentMethodIds.length > 0) {
          prev.set("paymentMethodId", paymentMethodIds[0]);
        } else {
          prev.delete("paymentMethodId");
        }

        if (stateIds && stateIds.length > 0) {
          prev.set("stateId", stateIds[0]);
        } else {
          prev.delete("stateId");
        }

        if (orderedBy) prev.set("orderedBy", orderedBy);
        else prev.delete("orderedBy");

        if (canReturn !== undefined) prev.set("canReturn", canReturn);
        else prev.delete("canReturn");

        if (orderDateFrom) prev.set("orderDateFrom", orderDateFrom);
        else prev.delete("orderDateFrom");

        if (orderDateTo) prev.set("orderDateTo", orderDateTo);
        else prev.delete("orderDateTo");

        if (estimateReceivedDateFrom)
          prev.set("estimateReceivedDateFrom", estimateReceivedDateFrom);
        else prev.delete("estimateReceivedDateFrom");

        if (estimateReceivedDateTo)
          prev.set("estimateReceivedDateTo", estimateReceivedDateTo);
        else prev.delete("estimateReceivedDateTo");

        if (receivedDateFrom) prev.set("receivedDateFrom", receivedDateFrom);
        else prev.delete("receivedDateFrom");

        if (receivedDateTo) prev.set("receivedDateTo", receivedDateTo);
        else prev.delete("receivedDateTo");

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

  const handleSelectOrder = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !orders) return;

      const { checked, name } = e.target;

      const orderId = name.split("select-order-")[1];
      if (orderId === "all") {
        setSelectedOrderIds(checked ? "all" : []);
        return;
      }

      setSelectedOrderIds((prev) => {
        let updatedSelectedOrderIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedOrderIds = orders.orders.orders
              .filter((m) => m.id !== orderId)
              .map((m) => m.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedOrderIds = "all";
          }
        } else {
          updatedSelectedOrderIds = [...prev];

          if (checked) {
            updatedSelectedOrderIds.push(orderId);
          } else {
            updatedSelectedOrderIds = updatedSelectedOrderIds.filter(
              (id) => id !== orderId,
            );
          }
        }

        return updatedSelectedOrderIds.length === orders.orders.total
          ? "all"
          : updatedSelectedOrderIds;
      });
    },
    [process.isProcessing, orders],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-order-all" hidden aria-hidden>
          Select all orders
        </label>
        <input
          type="checkbox"
          id="select-order-all"
          name="select-order-all"
          className="form-check-input"
          checked={selectedOrderIds === "all"}
          onChange={handleSelectOrder}
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
          <Loading loadingMsg="Searching orders..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !orders ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Orders data not found." />
        </td>
      </tr>
    ) : orders.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No orders in the system.
          </p>
        </td>
      </tr>
    ) : orders.orders.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No orders found matching your criteria. Try adjust some
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
        {orders.orders.orders.map((order) => (
          <tr key={order.id}>
            <td>
              <label htmlFor={`select-order-${order.id}`} hidden aria-hidden>
                Select this order
              </label>
              <input
                type="checkbox"
                id={`select-order-${order.id}`}
                name={`select-order-${order.id}`}
                className="form-check-input"
                checked={
                  selectedOrderIds === "all" ||
                  selectedOrderIds.includes(order.id)
                }
                onChange={handleSelectOrder}
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
                  {colDisplay.tdContent(order)}
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
    handleSelectOrder,
    handleSort,
    orders,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedOrderIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: OrderDisplayField[]): void => {
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
    if (!orders || orders.total === 0) {
      toast.error("No orders to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all orders matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const ordersToExport = (
        await fetchOrders({
          ...exportQuery,
          limit: orders.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).orders;

      if (ordersToExport.orders.length === 0) {
        toast("No orders found to export.", { icon: WARNING_EMOJI });
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
        order: AdminOrderResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(order);
        });
      };

      exportToCsv<AdminOrderResponse>(
        `${PROJECT_NAME.toLowerCase()}-orders-exports-${new Date().toISOString()}.csv`,
        headers,
        ordersToExport.orders,
        getVals,
      );

      toast.success(
        `Exported ${ordersToExport.orders.length} orders successfully.`,
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
    fetchOrders,
    orders,
    process.isProcessing,
    searchForm,
  ]);

  const closeModal = useCallback((): void => {
    setModal(DEFAULT_MODAL_STATE);
  }, []);

  const onSuccessUpdate = useCallback((): void => {
    refresh("admin");
    setSelectedOrderIds([]);
    if (selectionToastId) {
      toast.dismiss(selectionToastId);
      setSelectionToastId(null);
    }
  }, [refresh, selectionToastId]);

  // CHECKPOINT fulfilled UI
  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Order Management</h1>
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
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search orders
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by order ID..."
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

              {/* Delivery State */}
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="deliveryStateId" className="input-group-text">
                    Delivery
                  </label>
                  <select
                    id="deliveryStateId"
                    name="deliveryStateIds"
                    className="form-select"
                    value={searchForm.deliveryStateIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    {deliveryStates?.states.map((state) => (
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

              {/* Payment State */}
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="paymentStateId" className="input-group-text">
                    Payment
                  </label>
                  <select
                    id="paymentStateId"
                    name="paymentStateIds"
                    className="form-select"
                    value={searchForm.paymentStateIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    {paymentStates?.states.map((state) => (
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

              {/* Order State */}
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="stateId" className="input-group-text">
                    Order State
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
                    {orderStates?.states.map((state) => (
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

              {/* Payment Method */}
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="paymentMethodId" className="input-group-text">
                    Method
                  </label>
                  <select
                    id="paymentMethodId"
                    name="paymentMethodIds"
                    className="form-select"
                    value={searchForm.paymentMethodIds?.[0] || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    {paymentMethods?.methods.map((method) => (
                      <option
                        key={method.id}
                        value={method.id}
                        title={method.description || undefined}
                      >
                        {capFirstLetter(method.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Can Return */}
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="canReturn" className="input-group-text">
                    Returnable
                  </label>
                  <select
                    id="canReturn"
                    name="canReturn"
                    className="form-select"
                    value={searchForm.canReturn || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              {/* Ordered By */}
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="orderedBy" className="input-group-text">
                    Ordered By
                  </label>
                  <input
                    type="text"
                    id="orderedBy"
                    name="orderedBy"
                    className="form-control"
                    placeholder="Enter user ID..."
                    value={searchForm.orderedBy || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>

              {/* Order Date Range */}
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label htmlFor="orderDateFrom" className="input-group-text">
                    Order Date
                  </label>
                  <input
                    type="date"
                    id="orderDateFrom"
                    name="orderDateFrom"
                    className="form-control"
                    value={
                      searchForm.orderDateFrom
                        ? getLocalDateString(searchForm.orderDateFrom)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="date"
                    id="orderDateTo"
                    name="orderDateTo"
                    className="form-control"
                    value={
                      searchForm.orderDateTo
                        ? getLocalDateString(searchForm.orderDateTo)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>

              {/* Estimate Received Date Range */}
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="estimateReceivedDateFrom"
                    className="input-group-text"
                  >
                    Est. Received
                  </label>
                  <input
                    type="date"
                    id="estimateReceivedDateFrom"
                    name="estimateReceivedDateFrom"
                    className="form-control"
                    value={
                      searchForm.estimateReceivedDateFrom
                        ? getLocalDateString(
                            searchForm.estimateReceivedDateFrom,
                          )
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="date"
                    id="estimateReceivedDateTo"
                    name="estimateReceivedDateTo"
                    className="form-control"
                    value={
                      searchForm.estimateReceivedDateTo
                        ? getLocalDateString(searchForm.estimateReceivedDateTo)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>

              {/* Received Date Range */}
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="receivedDateFrom"
                    className="input-group-text"
                  >
                    Received Date
                  </label>
                  <input
                    type="date"
                    id="receivedDateFrom"
                    name="receivedDateFrom"
                    className="form-control"
                    value={
                      searchForm.receivedDateFrom
                        ? getLocalDateString(searchForm.receivedDateFrom)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="date"
                    id="receivedDateTo"
                    name="receivedDateTo"
                    className="form-control"
                    value={
                      searchForm.receivedDateTo
                        ? getLocalDateString(searchForm.receivedDateTo)
                        : ""
                    }
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>

              {/* Created At Range */}
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label htmlFor="createdAtFrom" className="input-group-text">
                    Created At
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

              {/* Updated At Range */}
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label htmlFor="updatedAtFrom" className="input-group-text">
                    Updated At
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

              {/* Action Buttons */}
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
                disabled={process.isProcessing || !orders}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (orders && orders.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {orders && orders.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + orders.orders.total
                  } of ${orders.total}`
                : `0-0 of 0`}
            </p>
            {orders && (
              <Pagination
                totalItems={orders.total}
                itemsPerPage={orders.limit}
                currentOffset={orders.offset}
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
        legend={ORDER_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <EditOrderDeliveryStateModal
        orderId={modal.orderIdToUpdateDeliveryState || undefined}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderDeliveryStateModal
        orderIds={modal.orderIdsToUpdateDeliveryState || undefined}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditOrderEstReceivedDateModal
        orderId={modal.orderIdToUpdateEstimateReceivedDate || undefined}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />

      <EditBulkOrderEstReceivedDateModal
        orderIds={modal.orderIdsToUpdateEstimateReceivedDate || undefined}
        onHide={closeModal}
        onSuccess={onSuccessUpdate}
      />
    </>
  );
}
