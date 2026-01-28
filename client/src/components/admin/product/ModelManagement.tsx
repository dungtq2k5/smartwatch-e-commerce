import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import type {
  AdminProductModelListResponse,
  AdminProductModelResponseForList as AdminProductModelResponse,
  ProductModelSearchQuery,
} from "../../../../../common/types.common";
import type {
  AdminProductModelDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  ProductModelDisplayField,
} from "../../../utils/types";
import {
  PRODUCT_MODEL_SEARCH_SORT_OPTIONS as MODEL_SEARCH_SORT_OPTIONS,
  PROJECT_NAME,
} from "../../../../../common/configs.common";
import useUserStore from "../../../store/admin/userStore";
import useModelStore from "../../../store/admin/product/modelStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  INSTRUCTION_EMOJI,
  PRODUCT_MODEL_FIELD_LABEL_LEGEND as MODEL_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import defaultProductImg from "../../../assets/default-product.webp";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  centsToUSD,
  formatError,
  isValidBooleanString,
  isValidDateTimeString,
  isValidNumString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import DetailUserLink from "../DetailUserLink";
import toast from "react-hot-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Pagination from "../../common/Pagination";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import LinkBtn from "../../common/LinkBtn";
import CreateBtnLink from "../CreateBtnLink";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  ProductModelSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  modelIdToDelete: string | null;
  modelIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminProductModelDisplayableField]: GeneralTableColDisplay<
    AdminProductModelResponse,
    (typeof MODEL_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-models-toast";

export default function ModelManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`ModelManagement render count: ${renderCount.current}`);

  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { fetchModels, deleteModel, deleteModelBulk } = useModelStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { productModelManagementDisplayFields: displayFields },
    resetProductModelManagementDisplayFields: resetDisplayFields,
    setProductModelManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [
    canCreateModel,
    canEditModel,
    canDeleteModel,
    canReadProduct,
    canReadVariation,
    canReadUser,
    canCreateVariation,
  ] = [
    useHasPermission("c_product_model"),
    useHasPermission("u_product_model"),
    useHasPermission("d_product_model"),
    useHasPermission("r_product"),
    useHasPermission("r_model_variation"),
    useHasPermission("r_usr"),
    useHasPermission("c_model_variation"),
  ]; // canReadModel is handled by ApiError

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: MODEL_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (model) => <>{model.id}</>,
        getCsvVal: (model) => model.id,
      },
      productId: {
        label: MODEL_FIELD_LABEL_LEGEND["productId"] || "Product ID",
        tdContent: (model) => (
          <LinkBtn
            to={`/admin/products/${model.productId}`}
            title="View detail product"
            disabled={!canReadProduct}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {model.productId}
          </LinkBtn>
        ),
        getCsvVal: (model) => model.productId,
      },
      name: {
        label: MODEL_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (model) => (
          <div className="d-flex align-items-center">
            <img
              src={model.imageUrls[0] || defaultProductImg}
              alt={model.name}
              className="admin-model-img--g me-2"
            />
            <Link
              to={`/admin/products/${model.productId}?modelId=${model.id}`}
              title="View detail model"
            >
              {model.name}
            </Link>
          </div>
        ),
        getCsvVal: (model) => model.name,
      },
      priceCents: {
        label: MODEL_FIELD_LABEL_LEGEND["priceCents"] || "Selling Price",
        isSortable: true,
        sortKey: { asc: "priceCents_asc", desc: "priceCents_desc" },
        tdClassName: "text-center",
        tdContent: (model) => <>{centsToUSD(model.priceCents)}</>,
        getCsvVal: (model) => centsToUSD(model.priceCents),
      },
      stockPriceCents: {
        label: MODEL_FIELD_LABEL_LEGEND["stockPriceCents"] || "Stock Price",
        isSortable: true,
        sortKey: { asc: "stockPriceCents_asc", desc: "stockPriceCents_desc" },
        tdClassName: "text-center",
        tdContent: (model) => <>{centsToUSD(model.stockPriceCents)}</>,
        getCsvVal: (model) => centsToUSD(model.stockPriceCents),
      },
      totalVariations: {
        label:
          MODEL_FIELD_LABEL_LEGEND["totalVariations"] || "Total Variations",
        tdClassName: "text-center",
        tdContent: (model) => (
          <LinkBtn
            to={`/admin/model-variations?searchTerm=${model.id}`}
            title="View variations of this model"
            disabled={!canReadVariation}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {model.totalVariations}
          </LinkBtn>
        ),
        getCsvVal: (model) => model.totalVariations,
      },
      caseMaterial: {
        label: MODEL_FIELD_LABEL_LEGEND["caseMaterial"] || "Case Material",
        tdContent: (model) => <>{model.caseMaterial}</>,
        getCsvVal: (model) => model.caseMaterial,
      },
      watchWeightMg: {
        label: MODEL_FIELD_LABEL_LEGEND["watchWeightMg"] || "Watch Weight (mg)",
        tdContent: (model) => <>{model.watchWeightMg}</>,
        getCsvVal: (model) => model.watchWeightMg,
      },
      compatibleBandLugWidthMm: {
        label:
          MODEL_FIELD_LABEL_LEGEND["compatibleBandLugWidthMm"] ||
          "Compatible Band Lug Width (mm)",
        tdContent: (model) => <>{model.compatibleBandLugWidthMm}</>,
        getCsvVal: (model) => model.compatibleBandLugWidthMm,
      },
      releaseDate: {
        label: MODEL_FIELD_LABEL_LEGEND["releaseDate"] || "Release Date",
        isSortable: true,
        sortKey: { asc: "releaseDate_asc", desc: "releaseDate_desc" },
        tdContent: (model) => (
          <>{new Date(model.releaseDate).toLocaleDateString()}</>
        ),
        getCsvVal: (model) => new Date(model.releaseDate).toLocaleDateString(),
      },
      stopSelling: {
        label: MODEL_FIELD_LABEL_LEGEND["stopSelling"] || "Stop Selling",
        tdContent: (model) => <>{model.stopSelling ? "Yes" : "No"}</>,
        getCsvVal: (model) => (model.stopSelling ? "Yes" : "No"),
      },
      createdBy: {
        label: MODEL_FIELD_LABEL_LEGEND["createdBy"] || "Created By",
        tdContent: (model) => (
          <DetailUserLink
            userId={model.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {model.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (model) => model.createdBy.fullName,
      },
      createdAt: {
        label: MODEL_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (model) => <>{new Date(model.createdAt).toLocaleString()}</>,
        getCsvVal: (model) => new Date(model.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: MODEL_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (model) => <>{new Date(model.updatedAt).toLocaleString()}</>,
        getCsvVal: (model) => new Date(model.updatedAt).toLocaleString(),
      },
      actions: {
        label: MODEL_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (model) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${model.id}/edit`}
              title="Edit model"
              disabled={!canEditModel}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <CreateBtnLink
              to={`/admin/model-variations/create/${model.id}`}
              title="Create variation for this model"
              disabled={!canCreateVariation}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              onClick={() => {
                setModal((prev) => ({
                  ...prev,
                  modelIdToDelete: model.id,
                }));
              }}
              title="Delete model"
              disabled={!canDeleteModel}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [
      canCreateVariation,
      canDeleteModel,
      canEditModel,
      canReadProduct,
      canReadUser,
      canReadVariation,
    ]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [models, setModels] = useState<AdminProductModelListResponse | null>(
    null
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedModelIds, setSelectedModelIds] = useState<string[] | "all">(
    []
  );
  const [selectionToastId, setSelectionToastId] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    modelIdToDelete: null,
    modelIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params change or refresh signal
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
          urlPriceCentsMin,
          urlPriceCentsMax,
          urlStockPriceCentsMin,
          urlStockPriceCentsMax,
          urlReleaseDateFrom,
          urlReleaseDateTo,
          urlStopSelling,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("priceCentsMin"),
          searchParams.get("priceCentsMax"),
          searchParams.get("stockPriceCentsMin"),
          searchParams.get("stockPriceCentsMax"),
          searchParams.get("releaseDateFrom"),
          searchParams.get("releaseDateTo"),
          searchParams.get("stopSelling"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          priceCentsMin:
            urlPriceCentsMin && isValidNumString(urlPriceCentsMin)
              ? urlPriceCentsMin
              : undefined,
          priceCentsMax:
            urlPriceCentsMax && isValidNumString(urlPriceCentsMax)
              ? urlPriceCentsMax
              : undefined,
          stockPriceCentsMin:
            urlStockPriceCentsMin && isValidNumString(urlStockPriceCentsMin)
              ? urlStockPriceCentsMin
              : undefined,
          stockPriceCentsMax:
            urlStockPriceCentsMax && isValidNumString(urlStockPriceCentsMax)
              ? urlStockPriceCentsMax
              : undefined,
          releaseDateFrom:
            urlReleaseDateFrom && isValidDateTimeString(urlReleaseDateFrom)
              ? urlReleaseDateFrom
              : undefined,
          releaseDateTo:
            urlReleaseDateTo && isValidDateTimeString(urlReleaseDateTo)
              ? urlReleaseDateTo
              : undefined,
          stopSelling:
            urlStopSelling && isValidBooleanString(urlStopSelling)
              ? urlStopSelling
              : undefined,
          sortBy: MODEL_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof MODEL_SEARCH_SORT_OPTIONS)[number]
          )
            ? (urlSortBy as (typeof MODEL_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedModelIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setModels(await fetchModels(newSearchForm));
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
    if (!models) return;

    const selectedCount =
      selectedModelIds === "all"
        ? models.models.total
        : selectedModelIds.length;

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
                setSelectedModelIds([]);
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
                modelIdsToDelete:
                  selectedModelIds === "all"
                    ? models.models.models.map((p) => p.id)
                    : selectedModelIds,
              }));
              setSelectedModelIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected models
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
  }, [selectedModelIds]);

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
        priceCentsMin,
        priceCentsMax,
        stockPriceCentsMin,
        stockPriceCentsMax,
        releaseDateFrom,
        releaseDateTo,
        stopSelling,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (priceCentsMin) prev.set("priceCentsMin", priceCentsMin);
        else prev.delete("priceCentsMin");
        if (priceCentsMax) prev.set("priceCentsMax", priceCentsMax);
        else prev.delete("priceCentsMax");

        if (stockPriceCentsMin)
          prev.set("stockPriceCentsMin", stockPriceCentsMin);
        else prev.delete("stockPriceCentsMin");
        if (stockPriceCentsMax)
          prev.set("stockPriceCentsMax", stockPriceCentsMax);
        else prev.delete("stockPriceCentsMax");

        if (releaseDateFrom) prev.set("releaseDateFrom", releaseDateFrom);
        else prev.delete("releaseDateFrom");
        if (releaseDateTo) prev.set("releaseDateTo", releaseDateTo);
        else prev.delete("releaseDateTo");

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

  const handleSelectModel = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !models) return;

      const { checked, name } = e.target;

      const modelId = name.split("select-model-")[1];
      if (modelId === "all") {
        setSelectedModelIds(checked ? "all" : []);
        return;
      }

      setSelectedModelIds((prev) => {
        let updatedSelectedModelIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedModelIds = models.models.models
              .filter((m) => m.id !== modelId)
              .map((m) => m.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedModelIds = "all";
          }
        } else {
          updatedSelectedModelIds = [...prev];

          if (checked) {
            updatedSelectedModelIds.push(modelId);
          } else {
            updatedSelectedModelIds = updatedSelectedModelIds.filter(
              (id) => id !== modelId
            );
          }
        }

        return updatedSelectedModelIds.length === models.models.total
          ? "all"
          : updatedSelectedModelIds;
      });
    },
    [process.isProcessing, models]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-model-all" hidden aria-hidden>
          Select all models
        </label>
        <input
          type="checkbox"
          id="select-model-all"
          name="select-model-all"
          className="form-check-input"
          checked={selectedModelIds === "all"}
          onChange={handleSelectModel}
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
          <Loading loadingMsg="Searching models..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !models ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Models data not found." />
        </td>
      </tr>
    ) : models.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            <FontAwesomeIcon icon={faBoxOpen} className="me-2" size="sm" />
            No models in the system.
          </p>
        </td>
      </tr>
    ) : models.models.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No models found matching your criteria. Try adjust some
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
        {models.models.models.map((model) => (
          <tr key={model.id}>
            <td>
              <label htmlFor={`select-model-${model.id}`} hidden aria-hidden>
                Select this model
              </label>
              <input
                type="checkbox"
                id={`select-model-${model.id}`}
                name={`select-model-${model.id}`}
                className="form-check-input"
                checked={
                  selectedModelIds === "all" ||
                  selectedModelIds.includes(model.id)
                }
                onChange={handleSelectModel}
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
    handleSelectModel,
    handleSort,
    models,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedModelIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: ProductModelDisplayField[]): void => {
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
    if (!models || models.total === 0) {
      toast.error("No models to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all models matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const modelsToExport = (
        await fetchModels({
          ...exportQuery,
          limit: models.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).models;

      if (modelsToExport.models.length === 0) {
        toast("No models found to export.", { icon: WARNING_EMOJI });
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
        model: AdminProductModelResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(model);
        });
      };

      exportToCsv<AdminProductModelResponse>(
        `${PROJECT_NAME.toLowerCase()}-models-exports-${new Date().toISOString()}.csv`,
        headers,
        modelsToExport.models,
        getVals
      );

      toast.success(
        `Exported ${modelsToExport.models.length} models successfully.`
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
    fetchModels,
    models,
    process.isProcessing,
    searchForm,
  ]);

  const handleSubmitDeleteModel = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteModel) {
      toast.error("You do not have permission to delete models.", {
        icon: WARNING_EMOJI,
      });
      return;
    }
    if (!modal.modelIdToDelete) {
      toast.error("Model ID to delete not found.");
      return;
    }

    try {
      await deleteModel(modal.modelIdToDelete);
      toast.success("Model has been deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteModel,
    deleteModel,
    modal.modelIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteModelsBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteModel) {
      toast.error("You do not have permission to delete models.");
      return;
    }
    if (!modal.modelIdsToDelete || modal.modelIdsToDelete.length === 0) {
      toast.error("No models selected for deletion.");
      return;
    }

    try {
      await deleteModelBulk({ modelIds: modal.modelIdsToDelete });
      toast.success(
        `${modal.modelIdsToDelete.length} models deleted successfully.`
      );

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger change
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteModel,
    deleteModelBulk,
    modal.modelIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      modelIdToDelete: null,
      modelIdsToDelete: null,
    });
  }, []);

  const handleCreateModel = useCallback((): void => {
    if (!canCreateModel) {
      toast.error("You do not have permission to create models.", {
        icon: WARNING_EMOJI,
      });
      return;
    }

    // Navigate to product management page and prompt user
    navigate("/admin/products");
    toast(
      "Please click the '+' button at each product in action column to create.",
      {
        icon: INSTRUCTION_EMOJI,
      }
    );
  }, [canCreateModel, navigate]);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Model management</h1>
        <div className="d-flex gap-3">
          {canCreateModel && (
            <button
              type="button"
              className="border-0 p-0 bg-transparent text-primary"
              onClick={handleCreateModel}
              disabled={!canCreateModel}
              title={
                !canCreateModel ? DISABLED_TITLE_FOR_PERFORMING : undefined
              }
            >
              <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
              Create new model
            </button>
          )}
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
                    Search models
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, ID, Product ID..."
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
                  <label htmlFor="priceCentsMin" className="input-group-text">
                    Price (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="priceCentsMin"
                    name="priceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.priceCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="priceCentsMax"
                    name="priceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={searchForm.priceCentsMin ?? 0}
                    value={searchForm.priceCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
              <div className="col-lg-4 col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="stockPriceCentsMin"
                    className="input-group-text"
                  >
                    Stock Price (&#65504;)
                  </label>
                  <input
                    type="number"
                    id="stockPriceCentsMin"
                    name="stockPriceCentsMin"
                    className="form-control"
                    placeholder="From"
                    min={0}
                    value={searchForm.stockPriceCentsMin ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="number"
                    id="stockPriceCentsMax"
                    name="stockPriceCentsMax"
                    className="form-control"
                    placeholder="To"
                    min={searchForm.stockPriceCentsMin ?? 0}
                    value={searchForm.stockPriceCentsMax ?? ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                </div>
              </div>
              <div className="col-lg-auto col-md-6">
                <div className="input-group">
                  <label htmlFor="releaseDateFrom" className="input-group-text">
                    Release Date
                  </label>
                  <input
                    type="date"
                    id="releaseDateFrom"
                    name="releaseDateFrom"
                    className="form-control"
                    value={searchForm.releaseDateFrom || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  />
                  <span className="input-group-text">-</span>
                  <input
                    type="date"
                    id="releaseDateTo"
                    name="releaseDateTo"
                    className="form-control"
                    value={searchForm.releaseDateTo || ""}
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
                disabled={process.isProcessing || !models}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (models && models.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {models && models.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + models.models.total
                  } of ${models.total}`
                : `0-0 of 0`}
            </p>
            {models && (
              <Pagination
                totalItems={models.total}
                itemsPerPage={models.limit}
                currentOffset={models.offset}
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
        legend={MODEL_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.modelIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteModel}
        custom={{
          action: "delete",
          title: `Delete model ID ${modal.modelIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this model? All the related data (variants, ect.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete model",
        }}
      />

      <ConfirmSubmitModal
        show={modal.modelIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteModelsBulk}
        custom={{
          action: "delete",
          title: `Delete selected models (${
            modal.modelIdsToDelete?.length || "N/A"
          })`,
          body: "Are you sure you want to delete all the selected models? All the related data (variants, ect.) will also be deleted. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete models",
        }}
      />
    </>
  );
}
