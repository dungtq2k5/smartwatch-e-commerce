import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type {
  UserBalanceHistoryListResponse,
  UserBalanceHistoryResponse,
} from "../../../../../common/types.common";
import {
  MAX_BALANCE_HISTORIES_PER_PAGE,
  USER_BALANCE_HISTORY_TYPE_ICON_LEGEND,
  WAITING_EMOJI,
} from "../../../configs";
import {
  PROJECT_NAME,
  USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS,
} from "../../../../../common/configs.common";
import {
  centsToUSD,
  formatError,
  getClosestPreMonday,
  isValidNumString,
} from "../../../../../common/utils.common";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserBalanceHistoryStore } from "../../../store/user/userBalanceHistoryStore";
import ApiError from "../../common/ApiError";
import useAuthStore from "../../../store/user/authStore";
import toast from "react-hot-toast";
import CreateWithdrawalRequestModal from "../modal/CreateWithdrawalRequestModal";
import WithdrawalDetailModal from "../modal/WithdrawalDetailModal";
import RefundDetailModal from "../modal/RefundDetailModal";
import PaymentDetailModal from "../modal/PaymentDetailModal";
import Loading from "../../common/Loading";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isShowingMore: boolean;
};

type SearchForm = {
  limit: number;
  category: (typeof USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS)[number] | "";
  createdAtFrom: string;
};

type Modal = {
  withdrawalDetailId: string | null;
  refundDetailId: string | null; // orderReturnId
  paymentDetailId: string | null; // orderId
};

export default function Balance() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("Balance render count:", renderCount.current);

  const { user } = useAuthStore();
  const { fetchBalanceHistories } = useUserBalanceHistoryStore();

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchForm, setSearchForm] = useState<SearchForm>({
    limit: MAX_BALANCE_HISTORIES_PER_PAGE,
    category: "", // all
    createdAtFrom: "", // all
  });
  const [balanceHistories, setBalanceHistories] =
    useState<UserBalanceHistoryListResponse | null>(null);

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isShowingMore: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [createWithdrawalModal, setCreateWithdrawalModal] =
    useState<boolean>(false);

  const [modal, setModal] = useState<Modal>({
    withdrawalDetailId: null,
    refundDetailId: null,
    paymentDetailId: null,
  });

  // Fetch&set initial when first loaded
  useEffect(() => {
    const handleFetchSetHistories = async (): Promise<void> => {
      // Initial load or URL search params changed -> fetch new data
      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetching: true,
      }));
      setApiErr(null);

      const [urlLimit, urlCategory, urlCreatedAtFrom] = [
        searchParams.get("limit"),
        searchParams.get("category"),
        searchParams.get("createdAtFrom"),
      ];

      const newSearchForm: SearchForm = {
        ...searchForm,
        limit:
          urlLimit && isValidNumString(urlLimit)
            ? Number.parseInt(urlLimit, 10)
            : MAX_BALANCE_HISTORIES_PER_PAGE,
        category:
          urlCategory &&
          USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS.includes(
            urlCategory as (typeof USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS)[number]
          )
            ? (urlCategory as (typeof USER_BALANCE_HISTORY_SEARCH_CATEGORY_OPTIONS)[number])
            : "",
        createdAtFrom: urlCreatedAtFrom || "",
      };
      setSearchForm(newSearchForm);

      try {
        const balanceHistories = await fetchBalanceHistories({
          ...newSearchForm,
          limit: newSearchForm.limit.toString(),
          category: newSearchForm.category || undefined,
          createdAtFrom: newSearchForm.createdAtFrom || undefined,
        });
        setBalanceHistories(balanceHistories);
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

    handleFetchSetHistories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const offset = balanceHistories?.histories.total || 0;
    const newSearchForm: SearchForm = {
      ...searchForm,
      limit: searchForm.limit + MAX_BALANCE_HISTORIES_PER_PAGE,
    };

    try {
      const nextBalanceHistories = await fetchBalanceHistories({
        ...newSearchForm,
        offset: offset.toString(),
        limit: MAX_BALANCE_HISTORIES_PER_PAGE.toString(),
        category: newSearchForm.category || undefined,
        createdAtFrom: newSearchForm.createdAtFrom || undefined,
      });
      setSearchForm(newSearchForm);

      // Update the URL
      setSearchParams((prev) => {
        prev.set("limit", newSearchForm.limit.toString());
        if (newSearchForm.category) {
          prev.set("category", newSearchForm.category);
        } else {
          prev.delete("category");
        }
        if (newSearchForm.createdAtFrom) {
          prev.set("createdAtFrom", newSearchForm.createdAtFrom);
        } else {
          prev.delete("createdAtFrom");
        }
        return prev;
      });

      setBalanceHistories((prev) => {
        if (!prev) return nextBalanceHistories;

        const combinedHistories = [
          ...prev.histories.histories,
          ...nextBalanceHistories.histories.histories,
        ];
        return {
          ...prev,
          histories: {
            ...prev.histories,
            total: combinedHistories.length,
            histories: combinedHistories,
          },
        };
      });
    } catch (error) {
      setApiErr(formatError(error));
    } finally {
      setProcess((prev) => ({
        ...prev,
        isProcessing: false,
        isShowingMore: false,
      }));
    }
  }, [
    balanceHistories?.histories.total,
    fetchBalanceHistories,
    process.isProcessing,
    searchForm,
    setSearchParams,
  ]);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }

      setProcess((prev) => ({
        ...prev,
        isProcessing: true,
        isFetching: true,
      }));
      setApiErr(null);

      const { name, value } = e.target;

      const newSearchForm: SearchForm = {
        ...searchForm,
        [name]: value,
        limit: MAX_BALANCE_HISTORIES_PER_PAGE, // reset to default
      };
      setSearchForm(newSearchForm);

      // Update the URL
      setSearchParams((prev) => {
        prev.set("limit", newSearchForm.limit.toString());
        if (newSearchForm.category) {
          prev.set("category", newSearchForm.category);
        } else {
          prev.delete("category");
        }
        if (newSearchForm.createdAtFrom) {
          prev.set("createdAtFrom", newSearchForm.createdAtFrom);
        } else {
          prev.delete("createdAtFrom");
        }
        return prev;
      });

      try {
        const balanceHistories = await fetchBalanceHistories({
          ...newSearchForm,
          limit: newSearchForm.limit.toString(),
          category: newSearchForm.category || undefined,
          createdAtFrom: newSearchForm.createdAtFrom || undefined,
        });
        setBalanceHistories(balanceHistories);
      } catch (error) {
        setApiErr(formatError(error));
      } finally {
        setProcess((prev) => ({
          ...prev,
          isProcessing: false,
          isFetching: false,
        }));
      }
    },
    [fetchBalanceHistories, process.isProcessing, searchForm, setSearchParams]
  );

  const closestPreMonday = useMemo(getClosestPreMonday, []);
  const startOfThisMonth = useMemo(() => {
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const startOfLast1Month = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);
  const startOfLast2Months = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 2);
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const handleCloseModal = useCallback((): void => {
    setModal({
      withdrawalDetailId: null,
      refundDetailId: null,
      paymentDetailId: null,
    });
  }, []);

  const handleShowDetailModal = useCallback(
    (balanceHistory: UserBalanceHistoryResponse): void => {
      const { type, referenceId } = balanceHistory;

      switch (type) {
        case "withdraw_request":
          setModal((prev) => ({
            ...prev,
            withdrawalDetailId: referenceId,
          }));
          break;
        case "refund":
          setModal((prev) => ({
            ...prev,
            refundDetailId: referenceId,
          }));
          break;
        case "payment_to":
          setModal((prev) => ({
            ...prev,
            paymentDetailId: referenceId,
          }));
          break;
      }
    },
    []
  );

  return (
    <>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-top mb-4">
        <h1 className="h3">Balance History</h1>
        <div className="text-end">
          <p className="h5 mb-2">
            My current balance:{" "}
            <span className="fw-bold text-primary">
              {user ? centsToUSD(user.userBalanceCents) : "N/A"}
            </span>
          </p>
          {user && user.userBalanceCents > 0 && (
            <button
              className="btn btn-primary"
              disabled={process.isProcessing}
              onClick={() => setCreateWithdrawalModal(true)}
            >
              Withdraw
            </button>
          )}
        </div>
      </div>

      {/* Filter form */}
      <div className="border rounded-3 p-3 mb-4 bg-light">
        <form className="row g-3 align-items-end">
          <div className="col-md-4">
            <label htmlFor="category" className="form-label fw-bold">
              Filter by type
            </label>
            <select
              id="category"
              name="category"
              className="form-select"
              value={searchForm.category}
              onChange={handleChange}
              disabled={process.isProcessing}
            >
              <option value="">All</option>
              <option value="money_in">Money in</option>
              <option value="money_out">Money out</option>
            </select>
          </div>
          <div className="col-md-4">
            <label htmlFor="createdAtFrom" className="form-label fw-bold">
              Filter by time
            </label>
            <select
              id="createdAtFrom"
              name="createdAtFrom"
              className="form-select"
              value={searchForm.createdAtFrom}
              onChange={handleChange}
              disabled={process.isProcessing}
            >
              <option value="">All</option>
              <option value={closestPreMonday.toISOString()}>
                Current Week
              </option>
              <option value={startOfThisMonth.toISOString()}>
                Current Month
              </option>
              <option value={startOfLast1Month.toISOString()}>
                Last 1 Month and Current Month
              </option>
              <option value={startOfLast2Months.toISOString()}>
                Last 2 Months and Current Month
              </option>
            </select>
          </div>
        </form>
      </div>

      {process.isFetching ? (
        <Loading loadingMsg="Loading balance history..." />
      ) : apiErr ? (
        <ApiError errorMessage={apiErr} />
      ) : balanceHistories === null ? (
        <ApiError errorMessage="Balance history data is not available." />
      ) : (
        <>
          {/* Balance history */}
          {balanceHistories.total === 0 ? (
            <p className="text-muted">No balance history found.</p>
          ) : (
            <>
              <ul className="list-group list-group-flush">
                {balanceHistories.histories.histories.map((history) => {
                  const iconDisplay =
                    USER_BALANCE_HISTORY_TYPE_ICON_LEGEND[history.type];
                  const titleDisplay =
                    history.type === "withdraw_request"
                      ? "Withdrawal"
                      : history.type === "payment_to"
                      ? `Payment to ${PROJECT_NAME}`
                      : history.type === "refund"
                      ? `Refund for order #${history.referenceId.slice(-6)}`
                      : history.type;

                  const isMoneyIn = history.type === "refund";

                  return (
                    <li
                      key={history.referenceId}
                      className="list-group-item list-group-item-action balance-history-item--g"
                    >
                      <button
                        className="border-0 w-100 bg-transparent p-0 d-flex justify-content-between align-items-center"
                        onClick={() => handleShowDetailModal(history)}
                      >
                        <div className="d-flex align-items-center">
                          <FontAwesomeIcon
                            icon={iconDisplay}
                            size="lg"
                            className="text-primary me-3"
                          />
                          <div className="text-start">
                            <p className="fw-semibold mb-0">{titleDisplay}</p>
                            <span className="text-muted small">
                              {new Date(history.createdAt).toLocaleDateString()}
                            </span>
                            <span className="ms-2 text-muted small text-capitalize">
                              {history.state}
                            </span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center">
                          <p
                            className={`fw-semibold mb-0 me-3 ${
                              isMoneyIn ? "text-success" : ""
                            }`}
                          >
                            {isMoneyIn ? "+" : "-"}
                            {centsToUSD(history.balanceCentsUsed)}
                          </p>
                          <FontAwesomeIcon
                            icon={faChevronRight}
                            className="text-muted"
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="text-center mt-4">
                {balanceHistories.total > balanceHistories.histories.total ? (
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
                  <p className="text-muted mb-0">No more history to display.</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      <CreateWithdrawalRequestModal
        show={createWithdrawalModal}
        onHide={() => setCreateWithdrawalModal(false)}
      />

      <WithdrawalDetailModal
        requestId={modal.withdrawalDetailId}
        onHide={handleCloseModal}
      />

      <RefundDetailModal
        orderReturnId={modal.refundDetailId}
        onHide={handleCloseModal}
      />

      <PaymentDetailModal
        orderId={modal.paymentDetailId}
        onHide={handleCloseModal}
      />
    </>
  );
}
