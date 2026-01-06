import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faSearch } from "@fortawesome/free-solid-svg-icons";
import useDeliveryStateStore from "../../../store/common/order/deliveryStateStore";
import type {
  OrderListResponse,
  OrderReturnListResponse,
} from "../../../../../common/types.common";
import { useCallback, useEffect, useRef, useState } from "react";
import ApiError from "../../common/ApiError";
import type { PurchaseTab } from "../../../utils/types";
import useOrderStateStore from "../../../store/common/order/orderStateStore";
import { MAX_PURCHASES_PER_PAGE, WAITING_EMOJI } from "../../../configs";
import useOrderStore from "../../../store/user/orderStore";
import { formatError } from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import PurchaseCard from "../purchase/PurchaseCard";
import ConfirmSubmitModal from "../modal/ConfirmSubmitModal";
import useReturnStore from "../../../store/user/orderReturnStore";
import useReturnStateStore from "../../../store/common/returnRefund/returnStateStore";
import ReturnCard from "../purchase/ReturnCard";
import { useSearchParams } from "react-router-dom";
import Loading from "../../common/Loading";
import usePaymentMethodStore from "../../../store/common/order/paymentMethodStore";
import Btn from "../../common/Btn";

type SearchForm = {
  activeTab: PurchaseTab;
  limit: number;
  searchTerm: string;
};

type Process = {
  isProcessing: boolean;
  isInitializing: boolean; // re-fetch all state need for faster render PurchaseCard component
  isFetchingOrders: boolean;
  isFetchingReturns: boolean;
  isShowingMore: boolean;
};

type NextPageData = {
  orders: OrderListResponse | null;
  returns: OrderReturnListResponse | null;
};

type Modal = Partial<{
  orderIdToSubmit: string;
  orderIdToCancel: string;
  returnToCancel: { orderId: string; returnId: string };
}>;

const TABS: { name: PurchaseTab; label: string }[] = [
  { name: "all", label: "All" },
  { name: "to-pay", label: "To Pay" }, // pending
  { name: "to-ship", label: "To Ship" }, // confirmed, placed, delivering
  { name: "to-receive", label: "To Receive" }, // delivered
  { name: "completed", label: "Completed" }, // completed
  { name: "cancelled", label: "Cancelled" }, // cancelled
  { name: "return-refund", label: "Refunded/Returned" },
];

export default function Purchase() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Purchase render count:", renderCount.current);

  const { deliveryStates, fetchDeliveryStates } = useDeliveryStateStore();
  const { orderStates, fetchOrderStates, fetchOrderStateByLookupId } =
    useOrderStateStore();
  const { paymentMethods, fetchPaymentMethods } = usePaymentMethodStore();
  const { fetchOrders, updateSelfOrder } = useOrderStore();
  const { fetchReturns, updateReturn } = useReturnStore();
  const { returnStates, fetchReturnStates, fetchReturnStateByLookupId } =
    useReturnStateStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>({
    activeTab: "all",
    limit: MAX_PURCHASES_PER_PAGE,
    searchTerm: "",
  });
  const [searchOrders, setSearchOrders] = useState<OrderListResponse | null>(
    null
  );
  const [searchReturns, setSearchReturns] =
    useState<OrderReturnListResponse | null>(null);
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isInitializing: true,
    isFetchingOrders: false,
    isFetchingReturns: false,
    isShowingMore: false,
  });

  const [nextPageData, setNextPageData] = useState<NextPageData>({
    orders: null,
    returns: null,
  });

  const [modal, setModal] = useState<Modal>({});

  // Fetch initial when first loaded: deliveryStates, orderStates, returnStates
  useEffect(() => {
    const handleFetchInitialData = async (): Promise<void> => {
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isInitializing: true,
      }));
      setApiErr(null);

      try {
        await Promise.all([
          deliveryStates ? Promise.resolve() : fetchDeliveryStates(),
          orderStates ? Promise.resolve() : fetchOrderStates(),
          paymentMethods ? Promise.resolve() : fetchPaymentMethods(),
          returnStates ? Promise.resolve() : fetchReturnStates(),
        ]);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isInitializing: false,
        }));
      }
    };

    handleFetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch data base on search params or accumulate base on nextPageData
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const handleLocationChange = async (): Promise<void> => {
      if (signal.aborted) return;

      // nextPageData("show more" was clicked) -> append this data to the current list
      const { orders: nextOrders, returns: nextReturns } = nextPageData;
      if (nextOrders) {
        setSearchOrders((prev) => {
          if (!prev) return nextOrders;

          const combinedOrders = [
            ...prev.orders.orders,
            ...nextOrders.orders.orders,
          ];
          return {
            ...nextOrders, // total, limit, offset
            orders: {
              ...nextOrders.orders,
              total: combinedOrders.length,
              orders: combinedOrders,
            },
          };
        });

        setNextPageData((prev) => ({ ...prev, orders: null }));
        return;
      }
      if (nextReturns) {
        setSearchReturns((prev) => {
          if (!prev) return nextReturns;

          const combinedReturns = [
            ...prev.returns.returns,
            ...nextReturns.returns.returns,
          ];
          return {
            ...nextReturns, // total, limit, offset
            returns: {
              ...nextReturns.returns,
              total: combinedReturns.length,
              returns: combinedReturns,
            },
          };
        });
        setNextPageData((prev) => ({ ...prev, returns: null }));
        return;
      }

      // No nextPageData -> normal flow of changing tab or searchTerm -> re-fetch
      let activeTab: PurchaseTab = "all";
      const [urlTab, urlSearchTerm, urlLimit] = [
        searchParams.get("tab"),
        searchParams.get("searchTerm"),
        searchParams.get("limit"),
      ];

      if (urlTab) {
        activeTab = TABS.find((t) => t.name === urlTab)?.name || "all";
      }

      const newSearchForm: SearchForm = {
        ...searchForm,
        activeTab,
        limit: urlLimit
          ? Number.parseInt(urlLimit, 10)
          : MAX_PURCHASES_PER_PAGE,
        searchTerm: urlSearchTerm && activeTab === "all" ? urlSearchTerm : "",
      };
      setSearchForm(newSearchForm);

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
      }));
      setApiErr(null);

      try {
        if (activeTab === "return-refund") {
          // For "Refunded/Returned" tab
          setProcess((prev) => ({
            ...prev,
            isFetchingReturns: true,
          }));

          const returns = await fetchReturns(
            {
              limit: newSearchForm.limit.toString(),
            },
            signal
          );

          if (!signal?.aborted) setSearchReturns(returns);
          setProcess((prev) => ({
            ...prev,
            isFetchingReturns: false,
          }));
          return;
        }

        // For other tabs
        setProcess((prev) => ({
          ...prev,
          isFetchingOrders: true,
        }));

        const orders = await fetchOrders(
          {
            searchTerm:
              newSearchForm.activeTab === "all"
                ? newSearchForm.searchTerm
                : undefined,
            limit: newSearchForm.limit.toString(),
            stateIds:
              newSearchForm.activeTab === "all"
                ? undefined
                : await getOrderStateIdsForTab(newSearchForm.activeTab),
          },
          signal
        );

        // Only update the orders if the request was not aborted
        if (!signal?.aborted) setSearchOrders(orders);
        setProcess((prev) => ({
          ...prev,
          isFetchingOrders: false,
        }));
      } catch (error) {
        if (!signal?.aborted) setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
        }));
      }
    };

    handleLocationChange();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // May throw an error if API fails
  const getOrderStateIdsForTab = useCallback(
    async (tab: Omit<PurchaseTab, "return-refund">): Promise<string[]> => {
      let stateLookupIds: string[] = [];

      switch (tab) {
        case "to-pay":
          stateLookupIds = ["1"]; // pending
          break;
        case "to-ship":
          stateLookupIds = ["2", "3", "4"]; // confirmed, placed, delivering
          break;
        case "to-receive":
          stateLookupIds = ["5"]; // delivered
          break;
        case "completed":
          stateLookupIds = ["6"]; // completed
          break;
        case "cancelled":
          stateLookupIds = ["7"]; // cancelled
          break;
      }

      try {
        return Promise.all(
          stateLookupIds.map((lookupId) => fetchOrderStateByLookupId(lookupId))
        ).then((states) => states.map((state) => state.id));
      } catch (error) {
        throw new Error(formatError(error));
      }
    },
    [fetchOrderStateByLookupId]
  );

  const handleTabChange = useCallback(
    (tabName: PurchaseTab): void => {
      if (searchForm.activeTab === tabName) return;
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      setSearchParams({ tab: tabName });
    },
    [process.isProcessing, searchForm.activeTab, setSearchParams]
  );

  const handleShowMore = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isShowingMore: true,
    }));
    setApiErr(null);

    const offset =
      searchForm.activeTab === "return-refund"
        ? searchReturns?.returns.total || 0
        : searchOrders?.orders.total || 0;

    const newForm: SearchForm = {
      ...searchForm,
      limit: searchForm.limit + MAX_PURCHASES_PER_PAGE,
    };

    try {
      if (searchForm.activeTab === "return-refund") {
        // For "Refunded/Returned" tab
        const nextReturns = await fetchReturns({
          offset: offset.toString(),
          limit: MAX_PURCHASES_PER_PAGE.toString(),
        });

        setNextPageData({ orders: null, returns: nextReturns });
      } else {
        // For other tabs
        const stateIds =
          searchForm.activeTab === "all"
            ? undefined
            : await getOrderStateIdsForTab(searchForm.activeTab);
        const nextOrders = await fetchOrders({
          ...newForm,
          offset: offset.toString(),
          limit: MAX_PURCHASES_PER_PAGE.toString(),
          stateIds,
        });

        setNextPageData({ orders: nextOrders, returns: null });
      }

      setSearchForm(newForm);

      // Update the URL to trigger useEffect to append the new data
      setSearchParams((prev) => {
        prev.set("tab", searchForm.activeTab);
        if (searchForm.activeTab === "all" && searchForm.searchTerm) {
          prev.set("searchTerm", searchForm.searchTerm);
        }
        prev.set("limit", newForm.limit.toString());

        return prev;
      });
    } catch (error) {
      toast.error(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isShowingMore: false,
      }));
    }
  }, [
    fetchOrders,
    fetchReturns,
    getOrderStateIdsForTab,
    process.isProcessing,
    searchForm,
    searchOrders?.orders.total,
    searchReturns?.returns.total,
    setSearchParams,
  ]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing) return;

      const { name, value } = e.target;
      setSearchForm((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [process.isProcessing]
  );

  const handleSearch = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      // No need to check isProcessing state because of abortion

      setSearchParams({ tab: "all", searchTerm: searchForm.searchTerm });
    },
    [setSearchParams, searchForm.searchTerm]
  );

  const handleSubmitReceived = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    const orderIdToSubmit = modal.orderIdToSubmit;
    if (!orderIdToSubmit) {
      toast.error("No order selected for submission.");
      return;
    }

    try {
      const completeState = await fetchOrderStateByLookupId("6"); // completed
      if (!completeState) throw new Error("Order state not found.");

      const updatedOrder = await updateSelfOrder(orderIdToSubmit, {
        stateId: completeState.id,
      });

      // Refresh the list after update
      setSearchOrders((prev) => {
        if (!prev) return prev;

        let newOrderList = prev.orders.orders;
        if (searchForm.activeTab === "all") {
          // replace the current
          const orderIdx = newOrderList.findIndex(
            (o) => o.id === orderIdToSubmit
          );
          if (orderIdx !== -1) {
            newOrderList[orderIdx] = updatedOrder;
          }
        } else if (searchForm.activeTab === "to-receive") {
          // filter out
          newOrderList = newOrderList.filter((o) => o.id !== orderIdToSubmit);
        }

        return {
          ...prev,
          total:
            searchForm.activeTab === "to-receive" ? prev.total - 1 : prev.total,
          orders: {
            ...prev.orders,
            orders: newOrderList,
            total: newOrderList.length,
          },
        };
      });

      toast.success("Order marked as received.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    fetchOrderStateByLookupId,
    modal.orderIdToSubmit,
    process.isProcessing,
    searchForm.activeTab,
    updateSelfOrder,
  ]);

  const handleSubmitCancelOrder = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    const orderIdToCancel = modal.orderIdToCancel;
    if (!orderIdToCancel) {
      toast.error("No order selected for cancellation.");
      return;
    }

    try {
      const cancelledState = await fetchOrderStateByLookupId("7"); // cancelled
      if (!cancelledState) throw new Error("Order state not found.");

      const updatedOrder = await updateSelfOrder(orderIdToCancel, {
        stateId: cancelledState.id,
      });

      // Refresh the list after update (at "all", "to-pay" and "to-ship" tabs only)
      setSearchOrders((prev) => {
        if (!prev) return prev;

        let newOrderList = prev.orders.orders;
        if (["to-pay", "to-ship"].includes(searchForm.activeTab)) {
          // filter out
          newOrderList = newOrderList.filter((o) => o.id !== orderIdToCancel);
        } else if (searchForm.activeTab === "all") {
          // replace the current
          const orderIdx = newOrderList.findIndex(
            (o) => o.id === orderIdToCancel
          );
          if (orderIdx !== -1) {
            newOrderList[orderIdx] = updatedOrder;
          }
        }

        return {
          ...prev,
          total: ["to-pay", "to-ship"].includes(searchForm.activeTab)
            ? prev.total - 1
            : prev.total,
          orders: {
            ...prev.orders,
            orders: newOrderList,
            total: newOrderList.length,
          },
        };
      });

      toast.success("Order cancelled.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    fetchOrderStateByLookupId,
    modal.orderIdToCancel,
    process.isProcessing,
    searchForm.activeTab,
    updateSelfOrder,
  ]);

  const handleSubmitCancelReturn = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }

    const returnToCancel = modal.returnToCancel;
    if (!returnToCancel) {
      toast.error("No return request selected for cancellation.");
      return;
    }

    try {
      const cancelState = await fetchReturnStateByLookupId("7"); // cancelled
      const updatedReturn = await updateReturn(returnToCancel.returnId, {
        stateId: cancelState.id,
      });

      // Refresh the list after update
      setSearchReturns((prev) => {
        if (!prev) return prev;

        const updatedReturnList = prev.returns.returns;
        const returnIdx = updatedReturnList.findIndex(
          (r) => r.id === returnToCancel.returnId
        );
        if (returnIdx !== -1) {
          updatedReturnList[returnIdx] = updatedReturn;
        }

        return {
          ...prev,
          returns: {
            ...prev.returns,
            returns: updatedReturnList,
          },
        };
      });

      toast.success("Return request cancelled.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    fetchReturnStateByLookupId,
    modal.returnToCancel,
    process.isProcessing,
    updateReturn,
  ]);

  const onSubmitReceived = useCallback((orderId: string): void => {
    setModal({ orderIdToSubmit: orderId });
  }, []);

  const onCancelOrder = useCallback((orderId: string): void => {
    setModal({ orderIdToCancel: orderId });
  }, []);

  const onCancelReturn = useCallback(
    (orderId: string, returnId: string): void => {
      setModal({ returnToCancel: { orderId, returnId } });
    },
    []
  );

  const closeModal = useCallback((): void => {
    setModal({});
  }, []);

  const activeTabLabel =
    TABS.find((t) => t.name === searchForm.activeTab)?.label || "";

  const itemsLoaded =
    searchForm.activeTab === "return-refund"
      ? searchReturns?.returns.total || 0
      : searchOrders?.orders.total || 0;
  const totalItems =
    searchForm.activeTab === "return-refund"
      ? searchReturns?.total || 0
      : searchOrders?.total || 0;
  const canShowMore = itemsLoaded > 0 && itemsLoaded < totalItems;

  return (
    <>
      {/* Header */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((tab) => (
          <li key={tab.name} className="nav-item">
            <button
              type="button"
              className={`nav-link ${
                searchForm.activeTab === tab.name
                  ? "active text-primary"
                  : "text-dark"
              }`}
              onClick={() => handleTabChange(tab.name)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Search form if in "All" section  */}
      {searchForm.activeTab === "all" && (
        <form className="mb-3" onSubmit={handleSearch}>
          <div className="input-group">
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              className="form-control"
              value={searchForm.searchTerm}
              placeholder="You can search by Product name or Order ID"
              onChange={handleSearchChange}
            />
            <button
              type="submit"
              className="btn btn-outline-secondary"
              disabled={process.isProcessing}
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
        </form>
      )}

      {process.isInitializing ||
      (searchForm.activeTab === "return-refund"
        ? process.isFetchingReturns
        : process.isFetchingOrders) ? (
        <Loading loadingMsg={`Loading ${activeTabLabel} orders...`} />
      ) : apiErr ? (
        <ApiError errMsg={apiErr} />
      ) : !deliveryStates ? (
        <ApiError errMsg="Delivery state data is not available." />
      ) : !orderStates ? (
        <ApiError errMsg="Order state data is not available." />
      ) : !paymentMethods ? (
        <ApiError errMsg="Payment method data is not available." />
      ) : !returnStates ? (
        <ApiError errMsg="Return/Refund state data is not available." />
      ) : searchForm.activeTab !== "return-refund" && !searchOrders ? (
        <ApiError errMsg="Order data is not available." />
      ) : searchForm.activeTab === "return-refund" && !searchReturns ? (
        <ApiError errMsg="Return/Refund data is not available." />
      ) : (searchForm.activeTab !== "return-refund" && !searchOrders?.total) ||
        (searchForm.activeTab === "return-refund" && !searchReturns?.total) ? (
        <div className="d-flex flex-column align-items-center justify-content-center h-100">
          <FontAwesomeIcon
            icon={faBoxOpen}
            size="2x"
            className="mb-2 text-body-tertiary"
          />
          <p className="text-muted mb-0">No orders yet.</p>
        </div>
      ) : (
        // Purchase list
        <div>
          {/* Purchase card */}
          {searchForm.activeTab === "return-refund"
            ? searchReturns!.returns.returns.map((orderReturn) => {
                return (
                  <ReturnCard
                    key={orderReturn.id}
                    orderReturn={orderReturn}
                    onCancelReturn={onCancelReturn}
                  />
                );
              })
            : searchOrders!.orders.orders.map((order) => {
                return (
                  <PurchaseCard
                    key={order.id}
                    order={order}
                    onSubmitReceived={onSubmitReceived}
                    onCancelOrder={onCancelOrder}
                  />
                );
              })}

          {/* Show more */}
          <div className="text-center">
            {canShowMore ? (
              <Btn
                type="button"
                className="btn btn-link p-0"
                onClick={handleShowMore}
                disabled={process.isProcessing}
                loading={process.isShowingMore}
              >
                Show more
              </Btn>
            ) : (
              <p className="text-muted mb-0">No more order to display.</p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmSubmitModal
        show={!!modal.orderIdToSubmit}
        onHide={closeModal}
        onSubmit={handleSubmitReceived}
        custom={{
          action: "update",
          title: "Confirm Order Received",
          body: "Confirm that you have received all items in this order. You can still be able to request a return or refund later if needed.",
          cancelText: "Not yet",
          submitText: "Yes, I've received",
        }}
      />

      <ConfirmSubmitModal
        show={!!modal.orderIdToCancel}
        onHide={closeModal}
        onSubmit={handleSubmitCancelOrder}
        custom={{
          action: "delete",
          title: "Confirm Cancel Order",
          body: "Are you sure you want to cancel this order? You won't be able to undo this action.",
          cancelText: "No, go back",
          submitText: "Yes, cancel order",
        }}
      />

      <ConfirmSubmitModal
        show={!!modal.returnToCancel}
        onHide={closeModal}
        onSubmit={handleSubmitCancelReturn}
        custom={{
          action: "delete",
          title: "Confirm Cancel Return Request",
          body: "Are you sure you want to cancel this return request? You won't be able to undo this action.",
          cancelText: "No, go back",
          submitText: "Yes, cancel request",
        }}
      />
    </>
  );
}
