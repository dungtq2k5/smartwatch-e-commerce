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
  MODEL_VARIATION_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import type {
  AdminModelVariationListResponse,
  AdminModelVariationResponse,
  ModelVariationSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  INSTRUCTION_EMOJI,
  MODEL_VARIATION_FIELD_LABEL_LEGEND as VARIATION_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminModelVariationDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ModelVariationDisplayField,
} from "../../../utils/types";
import useUserStore from "../../../store/admin/userStore";
import useVariationStore from "../../../store/admin/product/variationStore";
import useConfigStore from "../../../store/admin/configStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import defaultProductImg from "../../../assets/default-product.webp";
import DetailUserLink from "../DetailUserLink";
import {
  centsToUSD,
  formatError,
  isValidBooleanString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Pagination from "../../common/Pagination";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import LinkBtn from "../../common/LinkBtn";
import CreateBtnLink from "../CreateBtnLink";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  ModelVariationSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  variationIdToDelete: string | null;
  variationIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminModelVariationDisplayableField]: GeneralTableColDisplay<
    AdminModelVariationResponse,
    (typeof MODEL_VARIATION_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-variations-toast";

export default function VariationManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`ModelManagement render count: ${renderCount.current}`);

  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchVariations, deleteVariation, deleteVariationBulk } =
    useVariationStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { modelVariationManagementDisplayFields: displayFields },
    resetModelVariationManagementDisplayFields: resetDisplayFields,
    setModelVariationManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [
    canCreateVariation,
    canEditVariation,
    canDeleteVariation,
    canReadProduct,
    canReadModel,
    canReadInstance,
    canReadUser,
    canCreateGrn,
  ] = [
    useHasPermission("c_model_variation"),
    useHasPermission("u_model_variation"),
    useHasPermission("d_model_variation"),
    useHasPermission("r_product"),
    useHasPermission("r_product_model"),
    useHasPermission("r_variation_instance"),
    useHasPermission("r_usr"),
    useHasPermission("c_grn"),
  ]; // canReadVariation is handled by ApiErr

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: VARIATION_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (variation) => <>{variation.id}</>,
        getCsvVal: (variation) => variation.id,
      },
      productId: {
        label: VARIATION_FIELD_LABEL_LEGEND["productId"] || "Product ID",
        tdContent: (variation) => (
          <LinkBtn
            to={`/admin/products/${variation.productId}`}
            title="View detail product"
            disabled={!canReadProduct}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {variation.productId}
          </LinkBtn>
        ),
        getCsvVal: (variation) => variation.productId,
      },
      productModelId: {
        label: VARIATION_FIELD_LABEL_LEGEND["productModelId"] || "Model ID",
        tdContent: (variation) => (
          <LinkBtn
            to={`/admin/products/${variation.productId}?modelId=${variation.productModelId}`}
            title="View detail model"
            disabled={!canReadModel}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {variation.productModelId}
          </LinkBtn>
        ),
        getCsvVal: (variation) => variation.productModelId,
      },
      name: {
        label: VARIATION_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (variation) => (
          <div className="d-flex align-items-center">
            <img
              src={variation.imageUrls[0] || defaultProductImg}
              alt={variation.name}
              className="admin-variation-img--g me-2"
            />
            <Link
              to={`/admin/products/${variation.productId}?modeId=${variation.productModelId}&variationId=${variation.id}`}
              title="View detail variation"
            >
              {variation.name}
            </Link>
          </div>
        ),
        getCsvVal: (variation) => variation.name,
      },
      color: {
        label: VARIATION_FIELD_LABEL_LEGEND["color"] || "Color",
        tdContent: (variation) => (
          <div className="d-inline-flex align-items-center gap-1">
            <span
              className="product-detail-color-circle--g"
              style={{
                backgroundColor: variation.color.hex,
              }}
            ></span>
            {variation.color.name}
          </div>
        ),
        getCsvVal: (variation) =>
          `${variation.color.name}(${variation.color.hex})`,
      },
      additionalPriceCents: {
        label:
          VARIATION_FIELD_LABEL_LEGEND["additionalPriceCents"] ||
          "Additional Price",
        isSortable: true,
        sortKey: {
          asc: "additionalPriceCents_asc",
          desc: "additionalPriceCents_desc",
        },
        tdClassName: "text-center",
        tdContent: (variation) => (
          <>{centsToUSD(variation.additionalPriceCents)}</>
        ),
        getCsvVal: (variation) => centsToUSD(variation.additionalPriceCents),
      },
      stockAdditionalPriceCents: {
        label:
          VARIATION_FIELD_LABEL_LEGEND["stockAdditionalPriceCents"] ||
          "Stock Additional Price",
        isSortable: true,
        sortKey: {
          asc: "stockAdditionalPriceCents_asc",
          desc: "stockAdditionalPriceCents_desc",
        },
        tdClassName: "text-center",
        tdContent: (variation) => (
          <>{centsToUSD(variation.stockAdditionalPriceCents)}</>
        ),
        getCsvVal: (variation) =>
          centsToUSD(variation.stockAdditionalPriceCents),
      },
      stockQuantity: {
        label:
          VARIATION_FIELD_LABEL_LEGEND["stockQuantity"] || "Stock Quantity",
        isSortable: true,
        sortKey: { asc: "stockQuantity_asc", desc: "stockQuantity_desc" },
        tdClassName: "text-center",
        tdContent: (variation) => (
          <LinkBtn
            to={`/admin/variation-instances?variationId=${variation.id}`}
            title="View stock instances"
            disabled={!canReadInstance}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {variation.stockQuantity}
          </LinkBtn>
        ),
        getCsvVal: (variation) => variation.stockQuantity,
      },
      createdBy: {
        label: VARIATION_FIELD_LABEL_LEGEND["createdBy"] || "Created By",
        tdContent: (variation) => (
          <DetailUserLink
            userId={variation.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {variation.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (variation) => variation.createdBy.fullName,
      },
      createdAt: {
        label: VARIATION_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (variation) => (
          <>{new Date(variation.createdAt).toLocaleString()}</>
        ),
        getCsvVal: (variation) =>
          new Date(variation.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: VARIATION_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (variation) => (
          <>{new Date(variation.updatedAt).toLocaleString()}</>
        ),
        getCsvVal: (variation) =>
          new Date(variation.updatedAt).toLocaleString(),
      },
      stopSelling: {
        label: VARIATION_FIELD_LABEL_LEGEND["stopSelling"] || "Stop Selling",
        tdContent: (variation) => <>{variation.stopSelling ? "Yes" : "No"}</>,
        getCsvVal: (variation) => (variation.stopSelling ? "Yes" : "No"),
      },
      actions: {
        label: VARIATION_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (variation) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${variation.id}/edit`}
              title="Edit variation"
              disabled={!canEditVariation}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <CreateBtnLink
              to={`/admin/grn/create/${variation.id}`}
              title="Import GRN for this variation"
              disabled={!canCreateGrn}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  variationIdToDelete: variation.id,
                }));
              }}
              title="Delete variation"
              disabled={!canDeleteVariation}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [
      canCreateGrn,
      canDeleteVariation,
      canEditVariation,
      canReadInstance,
      canReadModel,
      canReadProduct,
      canReadUser,
    ]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [variations, setVariations] =
    useState<AdminModelVariationListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedVariationIds, setSelectedVariationIds] = useState<
    string[] | "all"
  >([]);
  const [selectionToastId, setSelectionToastId] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    variationIdToDelete: null,
    variationIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params changed or refresh signal
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        // Pre-fetch sysUserId for getSync functions
        if (!sysUserId) await fetchSysUserId();

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlAdditionalPriceCentsMin,
          urlAdditionalPriceCentsMax,
          urlStockAdditionalPriceCentsMin,
          urlStockAdditionalAdditionPriceCentsMax,
          urlStopSelling,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("additionalPriceCentsMin"),
          searchParams.get("additionalPriceCentsMax"),
          searchParams.get("stockAdditionalPriceCentsMin"),
          searchParams.get("stockAdditionalPriceCentsMax"),
          searchParams.get("stopSelling"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || "0",
          searchTerm: urlSearchTerm || "",
          additionalPriceCentsMin:
            urlAdditionalPriceCentsMin &&
            isValidNumString(urlAdditionalPriceCentsMin)
              ? urlAdditionalPriceCentsMin
              : undefined,
          additionalPriceCentsMax:
            urlAdditionalPriceCentsMax &&
            isValidNumString(urlAdditionalPriceCentsMax)
              ? urlAdditionalPriceCentsMax
              : undefined,
          stockAdditionalPriceCentsMin:
            urlStockAdditionalPriceCentsMin &&
            isValidNumString(urlStockAdditionalPriceCentsMin)
              ? urlStockAdditionalPriceCentsMin
              : undefined,
          stockAdditionalPriceCentsMax:
            urlStockAdditionalAdditionPriceCentsMax &&
            isValidNumString(urlStockAdditionalAdditionPriceCentsMax)
              ? urlStockAdditionalAdditionPriceCentsMax
              : undefined,
          stopSelling:
            urlStopSelling && isValidBooleanString(urlStopSelling)
              ? urlStopSelling
              : undefined,
          sortBy: MODEL_VARIATION_SORT_OPTIONS.includes(
            urlSortBy as (typeof MODEL_VARIATION_SORT_OPTIONS)[number]
          )
            ? (urlSortBy as (typeof MODEL_VARIATION_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedVariationIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setVariations(await fetchVariations(newSearchForm));
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
    if (!variations) return;

    const selectedCount =
      selectedVariationIds === "all"
        ? variations.variations.total
        : selectedVariationIds.length;

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
                setSelectedVariationIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} model(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                variationIdsToDelete:
                  selectedVariationIds === "all"
                    ? variations.variations.variations.map((p) => p.id)
                    : selectedVariationIds,
              }));
              setSelectedVariationIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected variations
          </button>
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
  }, [selectedVariationIds]);

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
    [process.isProcessing, setSearchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const {
        limit,
        searchTerm,
        additionalPriceCentsMin,
        additionalPriceCentsMax,
        stockAdditionalPriceCentsMin,
        stockAdditionalPriceCentsMax,
        stopSelling,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (additionalPriceCentsMin)
          prev.set("additionalPriceCentsMin", additionalPriceCentsMin);
        else prev.delete("additionalPriceCentsMin");
        if (additionalPriceCentsMax)
          prev.set("additionalPriceCentsMax", additionalPriceCentsMax);
        else prev.delete("additionalPriceCentsMax");

        if (stockAdditionalPriceCentsMin)
          prev.set(
            "stockAdditionalPriceCentsMin",
            stockAdditionalPriceCentsMin
          );
        else prev.delete("stockAdditionalPriceCentsMin");
        if (stockAdditionalPriceCentsMax)
          prev.set(
            "stockAdditionalPriceCentsMax",
            stockAdditionalPriceCentsMax
          );
        else prev.delete("stockAdditionalPriceCentsMax");

        if (stopSelling) prev.set("stopSelling", stopSelling);
        else prev.delete("stopSelling");

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

  const handleSelectVariation = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !variations) return;

      const { checked, name } = e.target;

      const variationId = name.split("select-variation-")[1];
      if (variationId === "all") {
        setSelectedVariationIds(checked ? "all" : []);
        return;
      }

      setSelectedVariationIds((prev) => {
        let updatedSelectedVariationIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedVariationIds = variations.variations.variations
              .filter((v) => v.id !== variationId)
              .map((v) => v.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedVariationIds = "all";
          }
        } else {
          updatedSelectedVariationIds = [...prev];

          if (checked) {
            updatedSelectedVariationIds.push(variationId);
          } else {
            updatedSelectedVariationIds = updatedSelectedVariationIds.filter(
              (id) => id !== variationId
            );
          }
        }

        return updatedSelectedVariationIds.length ===
          variations.variations.total
          ? "all"
          : updatedSelectedVariationIds;
      });
    },
    [process.isProcessing, variations]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-variation-all" hidden aria-hidden>
          Select all variations
        </label>
        <input
          type="checkbox"
          id="select-variation-all"
          name="select-variation-all"
          className="form-check-input"
          checked={selectedVariationIds === "all"}
          onChange={handleSelectVariation}
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
          <Loading loadingMsg="Searching variations..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg={apiErr} />
        </td>
      </tr>
    ) : !variations ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg="Variations data not found." />
        </td>
      </tr>
    ) : variations.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No variations found matching your criteria. Try adjust some
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
        {variations.variations.variations.map((model) => (
          <tr key={model.id}>
            <td>
              <label
                htmlFor={`select-variation-${model.id}`}
                hidden
                aria-hidden
              >
                Select this model
              </label>
              <input
                type="checkbox"
                id={`select-variation-${model.id}`}
                name={`select-variation-${model.id}`}
                className="form-check-input"
                checked={
                  selectedVariationIds === "all" ||
                  selectedVariationIds.includes(model.id)
                }
                onChange={handleSelectVariation}
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
    handleSelectVariation,
    handleSort,
    variations,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedVariationIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: ModelVariationDisplayField[]): void => {
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
    if (!variations || variations.total === 0) {
      toast.error("No variations to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all variations matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const variationsToExport = (
        await fetchVariations({
          ...exportQuery,
          limit: variations.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).variations;

      if (variationsToExport.variations.length === 0) {
        toast("No variations found to export.", { icon: WARNING_EMOJI });
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
        model: AdminModelVariationResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(model);
        });
      };

      exportToCsv<AdminModelVariationResponse>(
        `${PROJECT_NAME.toLowerCase()}-variations-export-${new Date().toISOString()}.csv`,
        headers,
        variationsToExport.variations,
        getVals
      );

      toast.success(
        `Exported ${variationsToExport.variations.length} variations successfully.`
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
    fetchVariations,
    process.isProcessing,
    searchForm,
    variations,
  ]);

  const handleSubmitDeleteVariation = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteVariation) {
      toast.error("You do not have permission to delete variations.", {
        icon: WARNING_EMOJI,
      });
      return;
    }
    if (!modal.variationIdToDelete) {
      toast.error("Variation ID to delete not found.");
      return;
    }

    try {
      await deleteVariation(modal.variationIdToDelete);
      toast.success("Variation has been deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteVariation,
    deleteVariation,
    modal.variationIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteVariationsBulk =
    useCallback(async (): Promise<void> => {
      if (process.isProcessing) {
        toast("Another action is in progress. Please wait.", {
          icon: WAITING_EMOJI,
        });
        return;
      }
      if (!canDeleteVariation) {
        toast.error("You do not have permission to delete variations.");
        return;
      }
      if (
        !modal.variationIdsToDelete ||
        modal.variationIdsToDelete.length === 0
      ) {
        toast.error("No variations selected for deletion.");
        return;
      }

      try {
        await deleteVariationBulk({ variationIds: modal.variationIdsToDelete });
        toast.success(
          `${modal.variationIdsToDelete.length} variations deleted successfully.`
        );

        // Refresh list by re-triggering the useEffect
        // Create a new URLSearchParams object from the previous one to trigger change
        setSearchParams((prev) => new URLSearchParams(prev));
      } catch (error) {
        toast.error(formatError(error));
      }
    }, [
      canDeleteVariation,
      deleteVariationBulk,
      modal.variationIdsToDelete,
      process.isProcessing,
      setSearchParams,
    ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      variationIdToDelete: null,
      variationIdsToDelete: null,
    });
  }, []);

  const handleCreateVariation = useCallback((): void => {
    if (!canCreateVariation) {
      toast.error("You do not have permission to create variations.", {
        icon: WARNING_EMOJI,
      });
      return;
    }

    // Navigate to model management page and prompt user
    navigate("/admin/product-models");
    toast(
      "Please click the '+' button at each model in action column to create.",
      {
        icon: INSTRUCTION_EMOJI,
      }
    );
  }, [canCreateVariation, navigate]);

  // TODO: Edit variation component.

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Variation management</h1>
        <div className="d-flex gap-3">
          <button
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            onClick={handleCreateVariation}
            disabled={!canCreateVariation}
            title={
              !canCreateVariation ? DISABLED_TITLE_FOR_PERFORMING : undefined
            }
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new variation
          </button>
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
          <button
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            title="Export current list to CSV file"
            onClick={handleExportList}
            disabled={process.isProcessing}
          >
            {process.isExportingList ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                ></span>
                <output>Exporting...</output>
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faFileExport}
                  size="sm"
                  className="me-2"
                />
                Export this list
              </>
            )}
          </button>
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
                    Search models
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, ID, Model ID, Product ID..."
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
                  <label htmlFor="stopSelling" className="input-group-text">
                    Stop selling
                  </label>
                  <select
                    name="stopSelling"
                    id="stopSelling"
                    className="form-select"
                    value={searchForm.stopSelling || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="additionalPriceCentsMin"
                    className="input-group-text"
                  >
                    Price (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="additionalPriceCentsMin"
                    name="additionalPriceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.additionalPriceCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="additionalPriceCentsMax"
                    name="additionalPriceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={searchForm.additionalPriceCentsMin ?? 0}
                    value={searchForm.additionalPriceCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="stockAdditionalPriceCentsMin"
                    className="input-group-text"
                  >
                    Stock Price (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="stockAdditionalPriceCentsMin"
                    name="stockAdditionalPriceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.stockAdditionalPriceCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="stockAdditionalPriceCentsMax"
                    name="stockAdditionalPriceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={searchForm.stockAdditionalPriceCentsMin ?? 0}
                    value={searchForm.stockAdditionalPriceCentsMax ?? ""}
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
                disabled={process.isProcessing || !variations}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (variations && variations.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {variations && variations.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    variations.variations.total
                  } of ${variations.total}`
                : `0-0 of 0`}
            </p>
            {variations && (
              <Pagination
                totalItems={variations.total}
                itemsPerPage={variations.limit}
                currentOffset={variations.offset}
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
        legend={VARIATION_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.variationIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteVariation}
        custom={{
          action: "delete",
          title: `Delete variation ID ${modal.variationIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this variation? All the related data (items in carts, ect.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete variation",
        }}
      />

      <ConfirmSubmitModal
        show={modal.variationIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteVariationsBulk}
        custom={{
          action: "delete",
          title: `Delete selected variations (${
            modal.variationIdsToDelete?.length || "N/A"
          })`,
          body: "Are you sure you want to delete all the selected variations? All the related data (items in carts, ect.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete variations",
        }}
      />
    </>
  );
}
