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
  type VARIATION_INSTANCE_SORT_OPTIONS,
} from "../../../../../common/configs.common";
import type {
  VariationInstanceListResponse,
  VariationInstanceResponse,
  VariationInstanceSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  VARIATION_INSTANCE_FIELD_LABEL_LEGEND as INSTANCE_FIELD_LABEL_LEGEND,
  INSTRUCTION_EMOJI,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminVariationInstanceDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  VariationInstanceDisplayField,
} from "../../../utils/types";
import useUserStore from "../../../store/admin/userStore";
import useInstanceStore from "../../../store/admin/product/instanceStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { useNavigate, useSearchParams } from "react-router-dom";
import useInstanceConditionStore from "../../../store/admin/product/instanceConditionStore";
import EditBtnLink from "../EditBtnLink";
import {
  formatError,
  isValidBooleanString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Pagination from "../../common/Pagination";
import LinkBtn from "../../common/LinkBtn";
import Btn from "../../common/Btn";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<
  VariationInstanceSearchQuery,
  "limit" | "offset" | "searchTerm"
> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  selectedInstanceIds: string[] | null;
};

type TableColDisplay = {
  [key in AdminVariationInstanceDisplayableField]: GeneralTableColDisplay<
    VariationInstanceResponse,
    (typeof VARIATION_INSTANCE_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-instances-toast";

export default function InstanceManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`InstanceManagement render count: ${renderCount.current}`);

  const navigate = useNavigate();

  const { sysUserId, fetchSysUserId } = useUserStore();
  const { instanceConditions, fetchInstanceConditions, getInstanceCondition } =
    useInstanceConditionStore();
  const { fetchInstances } = useInstanceStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { variationInstanceManagementDisplayFields: displayFields },
    resetVariationInstanceManagementDisplayFields: resetDisplayFields,
    setVariationInstanceManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditInstance, canCreateInstance, canReadModel] = [
    useHasPermission("u_variation_instance"),
    useHasPermission("c_variation_instance"),
    useHasPermission("r_product_model"),
  ]; // canReadInstance is handled by ApiErr

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: INSTANCE_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (instance) => <>{instance.id}</>,
        getCsvVal: (instance) => instance.id,
      },
      sku: {
        label: INSTANCE_FIELD_LABEL_LEGEND["sku"] || "SKU",
        isSortable: true,
        sortKey: { asc: "sku_asc", desc: "sku_desc" },
        tdContent: (instance) => <>{instance.sku}</>,
        getCsvVal: (instance) => instance.sku,
      },
      modelVariationId: {
        label:
          INSTANCE_FIELD_LABEL_LEGEND["modelVariationId"] || "Variation ID",
        tdContent: (instance) => (
          <LinkBtn
            to={`/admin/model-variations?searchTerm=${instance.modelVariationId}`}
            title="View detail model"
            disabled={!canReadModel}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {instance.modelVariationId}
          </LinkBtn>
        ),
        getCsvVal: (instance) => instance.modelVariationId,
      },
      supplierSerialNumber: {
        label:
          INSTANCE_FIELD_LABEL_LEGEND["supplierSerialNumber"] ||
          "Serial Number",
        tdContent: (instance) => <>{instance.supplierSerialNumber}</>,
        getCsvVal: (instance) => instance.supplierSerialNumber,
      },
      supplierImeiNumber: {
        label:
          INSTANCE_FIELD_LABEL_LEGEND["supplierImeiNumber"] || "IMEI Number",
        tdContent: (instance) => <>{instance.supplierImeiNumber || "N/A"}</>,
        getCsvVal: (instance) => instance.supplierImeiNumber || "N/A",
      },
      conditionId: {
        label: INSTANCE_FIELD_LABEL_LEGEND["conditionId"] || "Condition",
        tdContent: (instance) => {
          const condition = getInstanceCondition(instance.conditionId);
          const conditionLookupId = condition?.lookupId || null;

          let className = "text-capitalize badge ";
          switch (conditionLookupId) {
            case "1":
              className += "text-bg-success";
              break;
            case "2":
              className += "text-bg-primary";
              break;
            case "3":
              className += "text-bg-warning";
              break;
            case "4":
              className += "text-bg-danger";
              break;
            default:
              className += "text-bg-secondary";
          }

          return (
            <span className={className}>{condition?.name || "unknown"}</span>
          );
        },
        getCsvVal: (instance) => instance.conditionId,
      },
      isActive: {
        label: INSTANCE_FIELD_LABEL_LEGEND["isActive"] || "Active Status",
        tdContent: (instance) =>
          instance.isActive ? (
            <span className="badge bg-success">Active</span>
          ) : (
            <div className="d-flex align-items-center gap-1">
              <span className="badge bg-secondary">Inactive</span>
              <span className="small text-muted">
                at{" "}
                {instance.inactiveAt
                  ? new Date(instance.inactiveAt).toLocaleDateString()
                  : "unknown"}
              </span>
            </div>
          ),
        getCsvVal: (instance) =>
          instance.isActive
            ? "Active"
            : `Inactive (at ${
                instance.inactiveAt
                  ? new Date(instance.inactiveAt).toLocaleDateString()
                  : "unknown"
              })`,
      },
      createdAt: {
        label: INSTANCE_FIELD_LABEL_LEGEND["createdAt"] || "Created At",
        isSortable: true,
        sortKey: { asc: "createdAt_asc", desc: "createdAt_desc" },
        tdContent: (instance) => (
          <>{new Date(instance.createdAt).toLocaleDateString()}</>
        ),
        getCsvVal: (instance) =>
          new Date(instance.createdAt).toLocaleDateString(),
      },
      updatedAt: {
        label: INSTANCE_FIELD_LABEL_LEGEND["updatedAt"] || "Updated At",
        isSortable: true,
        sortKey: { asc: "updatedAt_asc", desc: "updatedAt_desc" },
        tdContent: (instance) => (
          <>{new Date(instance.updatedAt).toLocaleDateString()}</>
        ),
        getCsvVal: (instance) =>
          new Date(instance.updatedAt).toLocaleDateString(),
      },
      actions: {
        label: INSTANCE_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (instance) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${instance.id}/edit`}
              title="Edit instance"
              disabled={!canEditInstance}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canEditInstance, canReadModel, getInstanceCondition]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [instances, setInstances] =
    useState<VariationInstanceListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedInstanceIds, setSelectedInstanceIds] = useState<
    string[] | "all"
  >([]);
  const [selectionToastId, setSelectionToastId] = useState<string | null>(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    selectedInstanceIds: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial data when first load or search params changed or refresh signal
  useEffect(() => {
    const handleFetchSetInitialData = async (): Promise<void> => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        // Pre-fetch sysUserId, instanceConditions for getSync functions
        await Promise.all([
          sysUserId ? Promise.resolve() : fetchSysUserId(),
          instanceConditions ? Promise.resolve() : fetchInstanceConditions(),
        ]);

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlConditionId,
          urlIsActive,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("conditionId"),
          searchParams.get("isActive"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          conditionId: urlConditionId || undefined,
          isActive:
            urlIsActive && isValidBooleanString(urlIsActive)
              ? urlIsActive
              : undefined,
        };

        setSelectedInstanceIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setInstances(await fetchInstances(newSearchForm));
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
    if (!instances) return;

    const selectedCount =
      selectedInstanceIds === "all"
        ? instances.instances.total
        : selectedInstanceIds.length;

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
                setSelectedInstanceIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} model(s) selected</div>
          </div>

          {/* <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                selectedInstanceIds:
                  selectedInstanceIds === "all"
                    ? instances.instances.instances.map((p) => p.id)
                    : selectedInstanceIds,
              }));
              setSelectedInstanceIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected instances
          </button> */}
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
  }, [selectedInstanceIds]);

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

      setSearchForm((prev) => ({ ...prev, [name]: value }));
    },
    [process.isProcessing, setSearchParams]
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const { limit, searchTerm, conditionId, isActive } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (conditionId) prev.set("conditionId", conditionId);
        else prev.delete("conditionId");

        if (isActive) prev.set("isActive", isActive);
        else prev.delete("isActive");

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

  const handleSelectInstance = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !instances) return;

      const { checked, name } = e.target;

      const instanceId = name.split("select-instance-")[1];
      if (instanceId === "all") {
        setSelectedInstanceIds(checked ? "all" : []);
        return;
      }

      setSelectedInstanceIds((prev) => {
        let updatedSelectedInstanceIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedInstanceIds = instances.instances.instances
              .filter((v) => v.id !== instanceId)
              .map((v) => v.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedInstanceIds = "all";
          }
        } else {
          updatedSelectedInstanceIds = [...prev];

          if (checked) {
            updatedSelectedInstanceIds.push(instanceId);
          } else {
            updatedSelectedInstanceIds = updatedSelectedInstanceIds.filter(
              (id) => id !== instanceId
            );
          }
        }

        return updatedSelectedInstanceIds.length === instances.instances.total
          ? "all"
          : updatedSelectedInstanceIds;
      });
    },
    [process.isProcessing, instances]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-instance-all" hidden aria-hidden>
          Select all instances
        </label>
        <input
          type="checkbox"
          id="select-instance-all"
          name="select-instance-all"
          className="form-check-input"
          checked={selectedInstanceIds === "all"}
          onChange={handleSelectInstance}
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
          <Loading loadingMsg="Searching instances..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg={apiErr} />
        </td>
      </tr>
    ) : !instances ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg="Instances data not found." />
        </td>
      </tr>
    ) : instances.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No instances found matching your criteria. Try adjust some
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
        {instances.instances.instances.map((model) => (
          <tr key={model.id}>
            <td>
              <label htmlFor={`select-instance-${model.id}`} hidden aria-hidden>
                Select this model
              </label>
              <input
                type="checkbox"
                id={`select-instance-${model.id}`}
                name={`select-instance-${model.id}`}
                className="form-check-input"
                checked={
                  selectedInstanceIds === "all" ||
                  selectedInstanceIds.includes(model.id)
                }
                onChange={handleSelectInstance}
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
    handleSelectInstance,
    handleSort,
    instances,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedInstanceIds,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: VariationInstanceDisplayField[]): void => {
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
    if (!instances || instances.total === 0) {
      toast.error("No instances to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all instances matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const instancesToExport = (
        await fetchInstances({
          ...exportQuery,
          limit: instances.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).instances;

      if (instancesToExport.instances.length === 0) {
        toast("No instances found to export.", { icon: WARNING_EMOJI });
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
        instance: VariationInstanceResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) => {
          return TABLE_COL_DISPLAY[field.name].getCsvVal(instance);
        });
      };

      exportToCsv<VariationInstanceResponse>(
        `${PROJECT_NAME.toLowerCase()}-instances-export-${new Date().toISOString()}.csv`,
        headers,
        instancesToExport.instances,
        getVals
      );

      toast.success(
        `Exported ${instancesToExport.instances.length} instances successfully.`
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
    fetchInstances,
    process.isProcessing,
    searchForm,
    instances,
  ]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      selectedInstanceIds: null,
    });
  }, []);

  const handleCreateInstance = useCallback((): void => {
    if (!canCreateInstance) {
      toast.error("You do not have permission to create instances.", {
        icon: WARNING_EMOJI,
      });
      return;
    }

    // Navigate to variation management page and prompt user
    navigate("/admin/model-variations");
    toast(
      "Please click the '+' button at each variation in action column to create.",
      {
        icon: INSTRUCTION_EMOJI,
      }
    );
  }, [canCreateInstance, navigate]);

  // TODO instance details (life-cycle)

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Instance management</h1>
        <div className="d-flex gap-3">
          <button
            type="button"
            className="border-0 p-0 bg-transparent text-primary"
            onClick={handleCreateInstance}
            disabled={!canCreateInstance}
            title={
              !canCreateInstance ? DISABLED_TITLE_FOR_PERFORMING : undefined
            }
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new instance
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
                    placeholder="Search by name, ID, Sku, variation ID..."
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
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="conditionId" className="input-group-text">
                    Condition
                  </label>
                  <select
                    name="conditionId"
                    id="conditionId"
                    className="form-select"
                    value={searchForm.conditionId || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    {!instanceConditions ? (
                      <>
                        {process.isFetching ? (
                          <option disabled>Loading...</option>
                        ) : (
                          <option disabled>Conditions data not found.</option>
                        )}
                      </>
                    ) : instanceConditions.total === 0 ? (
                      <option disabled>No conditions found.</option>
                    ) : (
                      <>
                        <option value="">All</option>
                        {instanceConditions.conditions.map((condition) => (
                          <option
                            key={condition.id}
                            value={condition.id}
                            className="text-capitalize"
                          >
                            {condition.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="isActive" className="input-group-text">
                    Active status
                  </label>
                  <select
                    name="isActive"
                    id="isActive"
                    className="form-select"
                    value={searchForm.isActive || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
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
                disabled={process.isProcessing || !instances}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (instances && instances.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {instances && instances.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) +
                    instances.instances.total
                  } of ${instances.total}`
                : `0-0 of 0`}
            </p>
            {instances && (
              <Pagination
                totalItems={instances.total}
                itemsPerPage={instances.limit}
                currentOffset={instances.offset}
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
        legend={INSTANCE_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />
    </>
  );
}
