import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faCheck,
  faCheckCircle,
  faSearch,
  faTimesCircle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import type {
  AdminOrderDetailsResponse,
  AdminOrderResponse,
  OrderFulfillItemUpdate,
  VariationInstanceLightResponse,
} from "../../../../../common/types.common";
import {
  capFirstLetter,
  formatError,
} from "../../../../../common/utils.common";
import { useOrderStore } from "../../../store/admin/order/orderStore";
import useInstanceStore from "../../../store/admin/product/instanceStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import Btn from "../../common/Btn";
import { WAITING_EMOJI, MODAL_CLOSE_DELAY_MS } from "../../../configs";

/**
 * FulfillDraft: { [variationId]: sku[] }
 *
 * WHY SKUs instead of instanceIds?
 * The server's fulfillItem endpoint accepts SKUs. It resolves them to
 * VariationInstance documents internally. SKUs are also human-readable,
 * which matters for the manual-entry and barcode scanning flows.
 *
 * WHY a local draft at all?
 * The server does NOT support partial fulfillment. Every variation's SKUs
 * must be collected before calling the API once. The draft is a staging area.
 */
type FulfillDraft = Record<string, string[]>; // { [variationId]: sku[] }

type Process = { isSubmitting: boolean };

/**
 * Per-variation search state — kept separate from the draft.
 * Clearing a search input never removes already-picked SKUs.
 *
 * WHY VariationInstanceLightResponse[]?
 * The /search-by-variation endpoint returns { id, sku } only (lean select).
 * The endpoint already filters by isActive server-side, so every result
 * is guaranteed to be a valid candidate — no isActive check needed in the UI.
 */
type SkuSearchState = {
  query: string;
  results: VariationInstanceLightResponse[]; // { id, sku }
  isSearching: boolean;
};

type SkuSearchMap = Record<string, SkuSearchState>; // { [variationId]: SkuSearchState }

type ScanFeedback = { success: boolean; message: string } | null;

type OrderItem = AdminOrderResponse["items"][0];

// Default search state for variations that haven't been searched yet.
// Defined outside the component so it's a stable reference (no new object per render).
const DEFAULT_SKU_SEARCH: SkuSearchState = {
  query: "",
  results: [],
  isSearching: false,
};

/**
 * WHY memo + sliced props?
 * An order may have many variations. On each keypress in any search box,
 * without memo every row would re-render. Memo + passing only the relevant
 * slices (pickedSkus, skuSearch for THIS variationId) keeps it O(1) per row.
 */
const OrderItemRow = memo(
  ({
    item,
    pickedSkus,
    skuSearch,
    onQueryChange,
    onAdd,
    onRemove,
    disabled,
    canEdit,
  }: Readonly<{
    item: OrderItem;
    pickedSkus: string[];
    skuSearch: SkuSearchState;
    onQueryChange: (variationId: string, query: string) => void;
    onAdd: (variationId: string, sku: string) => void;
    onRemove: (variationId: string, sku: string) => void;
    disabled: boolean;
    canEdit: boolean;
  }>) => {
    const pickedCount = pickedSkus.length;
    const requiredCount = item.quantity;
    const isFulfilled = pickedCount >= requiredCount;

    /**
     * Enter key = add the raw typed query as a SKU directly.
     * Supports USB HID barcode wedge scanners (acts like a keyboard + Enter).
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        e.preventDefault();
        const trimmed = skuSearch.query.trim();
        if (trimmed) onAdd(item.variation.id, trimmed);
      }
    };

    return (
      <div className="card shadow-sm border-0 mb-3">
        {/* Header: variation name + progress badge */}
        <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <span className="fw-semibold">
              {item.variation.productModel?.name ?? "N/A"} —{" "}
              {item.variation.name}
            </span>
            <span className="text-muted small ms-2">
              ({item.variation.color?.name})
            </span>
          </div>
          <span
            className={`badge ${
              pickedCount > requiredCount
                ? "bg-danger"
                : isFulfilled
                  ? "bg-success"
                  : "bg-warning text-dark"
            }`}
          >
            {pickedCount} / {requiredCount}
          </span>
        </div>

        <div className="card-body">
          {/* Picked SKU chips */}
          {pickedSkus.length > 0 && (
            <div className="mb-3 p-2 rounded bg-success-subtle border border-success-subtle">
              <p className="small fw-semibold text-success mb-2">
                <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                Picked:
              </p>
              <div className="d-flex flex-wrap gap-2">
                {pickedSkus.map((sku) => (
                  <span
                    key={sku}
                    className="badge bg-success d-flex align-items-center gap-1 px-2 py-1"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <span className="font-monospace">{sku}</span>
                    {canEdit && !disabled && (
                      <button
                        type="button"
                        className="btn btn-link p-0 text-white d-flex align-items-center"
                        onClick={() => onRemove(item.variation.id, sku)}
                        title="Remove from draft"
                      >
                        <FontAwesomeIcon icon={faXmark} size="xs" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SKU search input */}
          {canEdit && !isFulfilled && (
            <div>
              <div className="input-group mb-2">
                <label
                  htmlFor={`sku-${item.variation.id}`}
                  className="input-group-text bg-white"
                >
                  <FontAwesomeIcon
                    icon={faSearch}
                    className={
                      skuSearch.isSearching ? "text-primary" : "text-muted"
                    }
                  />
                </label>
                <input
                  type="text"
                  id={`sku-${item.variation.id}`}
                  name={`sku-${item.variation.id}`}
                  className="form-control"
                  placeholder="Type or scan SKU, then press Enter..."
                  value={skuSearch.query}
                  onChange={(e) =>
                    onQueryChange(item.variation.id, e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  aria-label={`Search SKU for ${item.variation.name}`}
                />
                {skuSearch.query && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => onQueryChange(item.variation.id, "")}
                    title="Clear"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                )}
              </div>

              {/* Live search results */}
              {skuSearch.query.length >= 2 && (
                <div
                  className="border rounded overflow-auto mb-2"
                  style={{ maxHeight: "180px" }}
                >
                  {skuSearch.isSearching ? (
                    <p className="text-center text-muted small py-2 mb-0">
                      Searching...
                    </p>
                  ) : skuSearch.results.length === 0 ? (
                    <div className="px-3 py-2 small">
                      <span className="text-muted">
                        No instance found for "{skuSearch.query}". Press{" "}
                        <kbd>Enter</kbd> to add directly.
                      </span>
                    </div>
                  ) : (
                    skuSearch.results.map((inst) => {
                      const alreadyPicked = pickedSkus.includes(inst.sku);

                      return (
                        <div
                          key={inst.id}
                          className={`d-flex justify-content-between align-items-center px-3 py-2 border-bottom ${
                            alreadyPicked ? "bg-success-subtle" : "bg-white"
                          }`}
                        >
                          <span className="font-monospace small">
                            {inst.sku}
                          </span>
                          {alreadyPicked ? (
                            <span className="text-success small">
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="me-1"
                              />
                              Picked
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => onAdd(item.variation.id, inst.sku)}
                              disabled={disabled}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <p className="text-muted small mb-0">
                Search by SKU or type the exact SKU and press <kbd>Enter</kbd>.
                Only active instances for this variation are shown.
              </p>
            </div>
          )}

          {isFulfilled && (
            <p className="text-success small mb-0">
              <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
              All {requiredCount} SKU(s) picked for this variation.
            </p>
          )}
        </div>
      </div>
    );
  },
);

OrderItemRow.displayName = "OrderItemRow";

/**
 * FulfillOrderModal allows admins to assign inventory SKUs to an order's items.
 *
 * WHY SKU-based (not pre-loaded instances)?
 * When a buyer places an order, items[].instances is empty — no instances are
 * assigned yet. The admin must pick SKUs from the inventory. We can't pre-load
 * them because we don't know which specific units the admin will grab.
 *
 * Flow:
 * 1. Admin opens modal for a confirmed order.
 * 2. Per variation row: admin types/scans a SKU → live search hits the lightweight
 *    /search-by-variation endpoint → results shown → admin clicks Add or presses Enter.
 * 3. Once ALL variations have their required SKU count, the Submit button activates.
 * 4. Payload: { items: [{ variationId, skus }] } sent to the server.
 */
const FulfillOrderModal = memo(
  ({
    order,
    onHide,
    onSuccess,
  }: Readonly<{
    order: AdminOrderDetailsResponse | AdminOrderResponse | null;
    onHide: () => void;
    onSuccess?: () => void;
  }>): JSX.Element => {
    const { fulfillOrder } = useOrderStore();
    const { searchInstancesByVariation } = useInstanceStore();
    const canFulfill = useHasPermission("u_order");

    // --- State ---
    const [fulfillDraft, setFulfillDraft] = useState<FulfillDraft>({});
    const [skuSearchMap, setSkuSearchMap] = useState<SkuSearchMap>({});
    const [process, setProcess] = useState<Process>({ isSubmitting: false });
    const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);

    /**
     * WHY a separate internal `showFulfillModal` instead of relying on `!!order`?
     *
     * When the scanner opens we need to hide THIS modal so the scanner can use
     * the full viewport without two modals stacking. If we cleared `order` in
     * the parent to hide this modal, the draft would be destroyed.
     *
     * Keeping an internal boolean lets us:
     *  - Hide the fulfill modal while the scanner is open
     *  - Restore it when the scanner closes
     *  - Never lose the draft between the two
     */
    const [showFulfillModal, setShowFulfillModal] = useState<boolean>(!!order);
    const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

    const scannerDivId = "fulfill-order-qr-scanner";
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * WHY useRef for debounce timers (not useState)?
     * Timers are mutable side-effect storage. Storing them in state would
     * cause unnecessary re-renders on every keypress. useRef is correct here.
     */
    const debounceTimers = useRef<
      Record<string, ReturnType<typeof setTimeout>>
    >({});

    /**
     * Sync internal show state when the `order` prop changes.
     *  - order becomes non-null → open fulfill modal, reset draft for the new order
     *  - order becomes null     → parent signalled close; hide both modals
     *
     * WHY reset draft here and not inside onHide?
     * onHide fires during the scanner toggle too (because we hide the fulfill
     * modal temporarily). Resetting on `order` change is the correct trigger —
     * a new/fresh order always gets a clean draft.
     */
    useEffect(() => {
      if (order) {
        setShowFulfillModal(true);
        setFulfillDraft({});
        setSkuSearchMap({});
        setScanFeedback(null);
      } else {
        setShowFulfillModal(false);
        setShowScannerModal(false);
      }
    }, [order]);

    // --- Scanner open / close ---

    /** Hide fulfill modal, open scanner. Draft is untouched. */
    const handleOpenScanner = useCallback((): void => {
      setShowFulfillModal(false);
      setShowScannerModal(true);
    }, []);

    /**
     * Close scanner, restore fulfill modal.
     * The 200 ms delay lets the scanner modal's exit animation finish before
     * the fulfill modal re-appears, preventing visual stacking.
     */
    const handleCloseScanner = useCallback((): void => {
      setShowScannerModal(false);
      setTimeout(() => setShowFulfillModal(true), MODAL_CLOSE_DELAY_MS);
    }, []);

    // Cleanup timers on unmount
    useEffect(() => {
      const timers = debounceTimers.current;

      return () => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        for (const t of Object.values(timers)) clearTimeout(t);
      };
    }, []);

    // --- Scanner lifecycle ---

    /**
     * WHY useEffect for scanner init?
     * html5-qrcode imperatively mounts into a DOM node by ID.
     * We must wait until the modal renders that node before calling .render().
     * The cleanup fn calls .clear() to release the camera stream — without this
     * the webcam light stays on after the modal closes.
     */
    useEffect(() => {
      if (!showScannerModal || !order) return;

      const initTimer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          scannerDivId,
          {
            fps: 10,
            qrbox: { width: 300, height: 150 },
            supportedScanTypes: [
              Html5QrcodeScanType.SCAN_TYPE_CAMERA,
              Html5QrcodeScanType.SCAN_TYPE_FILE,
            ],
            rememberLastUsedCamera: true,
          },
          false,
        );

        scanner.render(
          (decodedText) => {
            handleScanResult(decodedText.trim());
          },
          () => {
            /* per-frame decode failures — silently ignore */
          },
        );

        scannerRef.current = scanner;
      }, 150);

      return () => {
        clearTimeout(initTimer);
        scannerRef.current
          ?.clear()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showScannerModal]);

    // --- Feedback helper ---

    const showScanFeedback = useCallback(
      (success: boolean, message: string): void => {
        setScanFeedback({ success, message });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(
          () => setScanFeedback(null),
          3000,
        );
      },
      [],
    );

    // --- Core: tryAddSku ---

    /**
     * Single validation + mutation point for adding a SKU to the draft.
     * Both the scanner AND the manual Add/Enter key flow go through here.
     *
     * Returns { success, message } so callers can show feedback without
     * duplicating the validation rules.
     */
    const tryAddSku = useCallback(
      (
        variationId: string,
        sku: string,
      ): { success: boolean; message: string } => {
        if (!order) return { success: false, message: "Order not loaded." };

        const item = order.items.find((i) => i.variation.id === variationId);
        if (!item)
          return {
            success: false,
            message: "Variation not found in this order.",
          };

        const currentPicked = fulfillDraft[variationId] ?? [];

        if (currentPicked.includes(sku)) {
          return { success: false, message: `SKU "${sku}" already picked.` };
        }
        if (currentPicked.length >= item.quantity) {
          return {
            success: false,
            message: `Variation already has all ${item.quantity} SKU(s) picked.`,
          };
        }

        // Valid — commit to draft and clear the search box for this variation
        setFulfillDraft((prev) => ({
          ...prev,
          [variationId]: [...(prev[variationId] ?? []), sku],
        }));
        setSkuSearchMap((prev) => ({
          ...prev,
          [variationId]: { query: "", results: [], isSearching: false },
        }));

        return { success: true, message: `SKU "${sku}" picked.` };
      },
      [order, fulfillDraft],
    );

    // --- Scanner: resolve scanned SKU → variationId ---

    /**
     * WHY call the API here instead of matching locally?
     * items[].instances is empty for unfulfilled orders — nothing to match against.
     * We hit /search-by-variation for each unfulfilled variation in parallel,
     * find which one owns the scanned SKU, then delegate to tryAddSku.
     */
    const handleScanResult = useCallback(
      async (sku: string): Promise<void> => {
        if (!order) return;

        const unfilledItems = order.items.filter((item) => {
          const picked = fulfillDraft[item.variation.id] ?? [];
          return picked.length < item.quantity;
        });

        // Run all lookups in parallel — faster than sequential for multi-item orders
        const lookupResults = await Promise.allSettled(
          unfilledItems.map(async (item) => {
            const res = await searchInstancesByVariation({
              variationId: item.variation.id,
              searchTerm: sku,
              isActive: "true",
              limit: "5",
            });
            // PaginatedResponse shape: res.instances.instances is the actual array
            const exact = res.instances.instances.find((r) => r.sku === sku);
            return exact ? item.variation.id : null;
          }),
        );

        const matchedVariationId =
          lookupResults.find(
            (r): r is PromiseFulfilledResult<string> =>
              r.status === "fulfilled" && r.value !== null,
          )?.value ?? null;

        if (!matchedVariationId) {
          showScanFeedback(
            false,
            `SKU "${sku}" not found in any unfulfilled variation of this order.`,
          );
          return;
        }

        const outcome = tryAddSku(matchedVariationId, sku);
        showScanFeedback(outcome.success, outcome.message);
      },
      [
        order,
        fulfillDraft,
        searchInstancesByVariation,
        tryAddSku,
        showScanFeedback,
      ],
    );

    // --- Manual: per-variation debounced SKU search ---

    /**
     * WHY debounce at 400ms?
     * /search-by-variation is a lean find() but we still avoid firing on every
     * keypress for fast typists. 400ms feels instant but reduces load.
     */
    const handleQueryChange = useCallback(
      (variationId: string, query: string): void => {
        // Optimistic update — input feels responsive immediately
        setSkuSearchMap((prev) => ({
          ...prev,
          [variationId]: {
            query,
            results: prev[variationId]?.results ?? [],
            isSearching: query.length >= 2,
          },
        }));

        if (debounceTimers.current[variationId]) {
          clearTimeout(debounceTimers.current[variationId]);
        }

        if (query.length < 2) {
          setSkuSearchMap((prev) => ({
            ...prev,
            [variationId]: { query, results: [], isSearching: false },
          }));
          return;
        }

        debounceTimers.current[variationId] = setTimeout(async () => {
          try {
            const res = await searchInstancesByVariation({
              variationId,
              searchTerm: query,
              isActive: "true",
              limit: "20", // Hard cap — typeahead only needs top matches
            });
            // Unwrap PaginatedResponse: res.instances.instances is the flat array
            setSkuSearchMap((prev) => ({
              ...prev,
              [variationId]: {
                query,
                results: res.instances.instances,
                isSearching: false,
              },
            }));
          } catch {
            setSkuSearchMap((prev) => ({
              ...prev,
              [variationId]: {
                ...(prev[variationId] ?? { query, results: [] }),
                isSearching: false,
              },
            }));
          }
        }, 400);
      },
      [searchInstancesByVariation],
    );

    const handleAdd = useCallback(
      (variationId: string, sku: string): void => {
        const trimmed = sku.trim();
        if (!trimmed) return;

        const outcome = tryAddSku(variationId, trimmed);
        if (!outcome.success) toast.error(outcome.message);
      },
      [tryAddSku],
    );

    const handleRemove = useCallback(
      (variationId: string, sku: string): void => {
        setFulfillDraft((prev) => ({
          ...prev,
          [variationId]: (prev[variationId] ?? []).filter((s) => s !== sku),
        }));
      },
      [],
    );

    // --- Derived state ---

    const totalPicked = useMemo(
      (): number =>
        Object.values(fulfillDraft).reduce((sum, skus) => sum + skus.length, 0),
      [fulfillDraft],
    );

    const totalRequired = useMemo(
      (): number => order?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
      [order],
    );

    /**
     * isAllFulfilled gates the submit button.
     * Every variation must have exactly `quantity` SKUs — enforces the server's
     * "no partial fulfillment" constraint at the UI level.
     */
    const isAllFulfilled = useMemo((): boolean => {
      if (!order || order.items.length === 0) return false;
      return order.items.every((item) => {
        const picked = fulfillDraft[item.variation.id] ?? [];
        return picked.length === item.quantity;
      });
    }, [order, fulfillDraft]);

    // --- Submission ---

    const handleSubmit = useCallback(async (): Promise<void> => {
      if (process.isSubmitting) {
        toast("Submission in progress, please wait.", { icon: WAITING_EMOJI });
        return;
      }
      if (!canFulfill) {
        toast.error("You don't have permission to fulfill orders.");
        return;
      }
      if (!isAllFulfilled) {
        toast.error("Please pick all required SKUs before submitting.");
        return;
      }

      setProcess({ isSubmitting: true });
      try {
        const payload: OrderFulfillItemUpdate = {
          items: Object.entries(fulfillDraft).map(([variationId, skus]) => ({
            variationId,
            skus,
          })),
        };

        await fulfillOrder(payload);
        toast.success("Order fulfilled successfully!");
        onSuccess?.();
        onHide();
      } catch (error) {
        toast.error(formatError(error));
      } finally {
        setProcess({ isSubmitting: false });
      }
    }, [
      canFulfill,
      fulfillDraft,
      fulfillOrder,
      isAllFulfilled,
      onHide,
      onSuccess,
      process.isSubmitting,
    ]);

    // --- Render ---

    if (!order) return <></>;

    return (
      <>
        {/* ── Main Fulfillment Modal ── */}
        <Modal
          show={showFulfillModal}
          onHide={onHide}
          size="xl"
          centered
          scrollable
        >
          <Modal.Header closeButton>
            <Modal.Title>Fulfill Order #ID {order.id}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {/* Overall progress bar */}
            <div className="mb-4">
              <div className="d-flex justify-content-between small mb-1">
                <span className="fw-semibold">Item(s) filled</span>
                <span className="text-muted">
                  {totalPicked} / {totalRequired} SKUs picked
                </span>
              </div>
              <div className="progress" style={{ height: "10px" }}>
                <progress
                  className={`progress-bar ${isAllFulfilled ? "bg-success" : "bg-primary"}`}
                  style={{
                    width:
                      totalRequired > 0
                        ? `${Math.min((totalPicked / totalRequired) * 100, 100)}%`
                        : "0%",
                  }}
                  aria-valuenow={totalPicked}
                  aria-valuemin={0}
                  aria-valuemax={totalRequired}
                />
              </div>
            </div>

            {/* Scan button toolbar */}
            <div className="d-flex justify-content-end mb-4">
              <button
                type="button"
                className="btn btn-outline-primary d-flex align-items-center gap-2"
                onClick={handleOpenScanner}
                disabled={process.isSubmitting || isAllFulfilled}
                title="Open camera scanner"
              >
                <FontAwesomeIcon icon={faCamera} />
                <span>Scan Barcode / QR</span>
              </button>
            </div>

            {/* Per-variation rows */}
            {order.items.length === 0 ? (
              <p className="text-center text-muted">No items in this order.</p>
            ) : (
              order.items.map((item) => (
                <OrderItemRow
                  key={item.variation.id}
                  item={item}
                  pickedSkus={fulfillDraft[item.variation.id] ?? []}
                  skuSearch={
                    skuSearchMap[item.variation.id] ?? DEFAULT_SKU_SEARCH
                  }
                  onQueryChange={handleQueryChange}
                  onAdd={handleAdd}
                  onRemove={handleRemove}
                  disabled={process.isSubmitting}
                  canEdit={canFulfill}
                />
              ))
            )}
          </Modal.Body>

          <Modal.Footer className="justify-content-between">
            <span className="small">
              {isAllFulfilled ? (
                <span className="text-success fw-semibold">
                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
                  All SKUs picked — ready to submit!
                </span>
              ) : (
                <span className="text-muted">
                  {totalRequired - totalPicked} SKU(s) remaining
                </span>
              )}
            </span>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onHide}
                disabled={process.isSubmitting}
              >
                Cancel
              </button>
              <Btn
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={process.isSubmitting}
                loading={process.isSubmitting}
              >
                Complete Fulfillment
              </Btn>
            </div>
          </Modal.Footer>
        </Modal>

        {/* ── Scanner Modal ── */}
        <Modal
          show={showScannerModal}
          onHide={handleCloseScanner}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Scan Barcode / QR Code</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {/* Scan result feedback */}
            {scanFeedback && (
              <div
                className={`alert ${scanFeedback.success ? "alert-success" : "alert-danger"} d-flex align-items-center py-2 mb-3`}
                role="alert"
              >
                <FontAwesomeIcon
                  icon={scanFeedback.success ? faCheckCircle : faTimesCircle}
                  className="me-2 flex-shrink-0"
                />
                <span>{scanFeedback.message}</span>
              </div>
            )}

            {/* Mini progress */}
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Progress</span>
              <span>
                {totalPicked} / {totalRequired}
              </span>
            </div>
            <div className="progress mb-3" style={{ height: "6px" }}>
              <div
                className={`progress-bar ${isAllFulfilled ? "bg-success" : "bg-primary"}`}
                style={{
                  width:
                    totalRequired > 0
                      ? `${Math.min((totalPicked / totalRequired) * 100, 100)}%`
                      : "0%",
                }}
              />
            </div>

            {/* html5-qrcode mount point */}
            <div id={scannerDivId} />

            {/* Per-variation status summary */}
            <div className="mt-3">
              <p className="small fw-semibold mb-2">Draft Summary:</p>
              {order.items.map((item) => {
                const picked = fulfillDraft[item.variation.id] ?? [];
                const done = picked.length >= item.quantity;
                return (
                  <div
                    key={item.variation.id}
                    className={`d-flex justify-content-between align-items-center small px-2 py-1 rounded mb-1 ${
                      done ? "bg-success-subtle" : "bg-light"
                    }`}
                  >
                    <span>
                      {capFirstLetter(item.variation.name)} (
                      {item.variation.color?.name})
                    </span>
                    <span
                      className={`badge ${done ? "bg-success" : "bg-warning text-dark"}`}
                    >
                      {picked.length} / {item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          </Modal.Body>

          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseScanner}
            >
              Done Scanning
            </button>
          </Modal.Footer>
        </Modal>
      </>
    );
  },
);

FulfillOrderModal.displayName = "FulfillOrderModal";

export default FulfillOrderModal;
