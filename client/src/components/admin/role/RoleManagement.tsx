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
  ROLE_SEARCH_SORT_OPTIONS,
} from "../../../../../common/configs.common";
import type {
  RoleListResponse,
  RoleResponse,
  RoleSearchQuery,
} from "../../../../../common/types.common";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  DISABLED_TITLE_FOR_PERFORMING,
  DISABLED_TITLE_FOR_VIEWING,
  ROLE_FIELD_LABEL_LEGEND,
  WAITING_EMOJI,
  WARNING_EMOJI,
} from "../../../configs";
import type {
  AdminRoleDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  RoleDisplayField,
} from "../../../utils/types";
import useRoleStore from "../../../store/admin/roleStore";
import useRefreshStore from "../../../store/admin/refreshStore";
import useConfigStore from "../../../store/admin/configStore";
import useHasPermission from "../../../hooks/admin/useHasPermission";
import { Link, useSearchParams } from "react-router-dom";
import DetailUserLink from "../DetailUserLink";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import toast from "react-hot-toast";
import TableHeadSortBtn from "../TableHeadSortBtn";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import { exportToCsv } from "../../../utils/utils";
import LinkBtn from "../../common/LinkBtn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import Btn from "../../common/Btn";
import Pagination from "../../common/Pagination";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Pick<RoleSearchQuery, "sortBy"> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  roleIdToDelete: string | null;
  roleIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminRoleDisplayableField]: GeneralTableColDisplay<
    RoleResponse,
    (typeof ROLE_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-roles-toast";

export default function RoleManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`RoleManagement render count: ${renderCount.current}`);

  const { fetchRoles, deleteRole, deleteRoleBulk } = useRoleStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { roleManagementDisplayFields: displayFields },
    resetRoleManagementDisplayFields: resetDisplayFields,
    setRoleManagementDisplayFields: setDisplayFields,
  } = useConfigStore();

  const [canEditRole, canDeleteRole, canCreateRole, canReadUser] = [
    useHasPermission("u_usr_role"),
    useHasPermission("d_usr_role"),
    useHasPermission("c_usr_role"),
    useHasPermission("r_usr"),
  ];

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: ROLE_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (role) => <>{role.id}</>,
        getCsvVal: (role) => role.id,
      },
      name: {
        label: ROLE_FIELD_LABEL_LEGEND["name"] || "Name",
        isSortable: true,
        sortKey: { asc: "name_asc", desc: "name_desc" },
        tdContent: (role) => (
          <Link to={role.id} title="View detail role">
            {role.name}
          </Link>
        ),
        getCsvVal: (role) => role.name,
      },
      userAssigned: {
        label: ROLE_FIELD_LABEL_LEGEND["userAssigned"] || "Users assigned",
        isSortable: true,
        sortKey: { asc: "userAssigned_asc", desc: "userAssigned_desc" },
        tdContent: (role) => <>{role.userAssigned}</>,
        getCsvVal: (role) => role.userAssigned,
      },
      permissions: {
        label: ROLE_FIELD_LABEL_LEGEND["permissions"] || "Total permissions",
        tdContent: (role) => <>{role.permissions.length}</>,
        getCsvVal: (role) => role.permissions.length,
      },
      createdBy: {
        label: ROLE_FIELD_LABEL_LEGEND["createdBy"] || "Created by",
        tdContent: (role) => (
          <DetailUserLink
            userId={role.createdBy.id}
            disabled={!canReadUser}
            disabledtitle={DISABLED_TITLE_FOR_VIEWING}
          >
            {role.createdBy.fullName}
          </DetailUserLink>
        ),
        getCsvVal: (role) => role.createdBy.fullName,
      },
      createdAt: {
        label: ROLE_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        tdContent: (role) => <>{new Date(role.createdAt).toLocaleString()}</>,
        getCsvVal: (role) => new Date(role.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: ROLE_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        tdContent: (role) => <>{new Date(role.updatedAt).toLocaleString()}</>,
        getCsvVal: (role) => new Date(role.updatedAt).toLocaleString(),
      },
      actions: {
        label: ROLE_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (role) => (
          <div className="d-flex gap-2">
            <EditBtnLink
              to={`${role.id}/edit`}
              title="Edit role"
              disabled={!canEditRole}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
            <DeleteBtn
              title="Delete role"
              onClick={() =>
                setModal((prev) => ({
                  ...prev,
                  roleIdToDelete: role.id,
                }))
              }
              disabled={!canDeleteRole}
              disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
            />
          </div>
        ),
        getCsvVal: () => null,
      },
    }),
    [canDeleteRole, canEditRole, canReadUser],
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: false,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(DEFAULT_SEARCH_FORM);

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[] | "all">([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    roleIdToDelete: null,
    roleIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial when first load or search params change or refreshSignal
  useEffect(() => {
    const handleFetchSetInitialData = async () => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        const [urlLimit, urlOffset, urlSearchTerm, urlSortBy] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || DEFAULT_SEARCH_FORM.offset,
          searchTerm: urlSearchTerm || DEFAULT_SEARCH_FORM.searchTerm,
          sortBy: ROLE_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof ROLE_SEARCH_SORT_OPTIONS)[number],
          )
            ? (urlSortBy as (typeof ROLE_SEARCH_SORT_OPTIONS)[number])
            : undefined,
        };

        setSelectedRoleIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setRoles(await fetchRoles(newSearchForm));
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
    if (!roles) return;

    const selectedCount =
      selectedRoleIds === "all" ? roles.roles.total : selectedRoleIds.length;

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
                setSelectedRoleIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} role(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                roleIdsToDelete:
                  selectedRoleIds === "all"
                    ? roles.roles.roles.map((u) => u.id)
                    : selectedRoleIds,
              }));
              setSelectedRoleIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected roles
          </button>
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
  }, [selectedRoleIds]);

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
    [process.isProcessing, setSearchParams],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      if (process.isProcessing) return;

      const { limit, searchTerm, sortBy } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (sortBy) prev.set("sortBy", sortBy);
        else prev.delete("sortBy");

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

  const handleSelectRole = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !roles) return;

      const { checked, name } = e.target;

      const roleId = name.split("select-role-")[1];
      if (roleId === "all") {
        setSelectedRoleIds(checked ? "all" : []);
        return;
      }

      setSelectedRoleIds((prev) => {
        let updatedSelectedRolesIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedRolesIds = roles.roles.roles
              .filter((role) => role.id !== roleId)
              .map((role) => role.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedRolesIds = "all";
          }
        } else {
          updatedSelectedRolesIds = [...prev];

          if (checked) {
            updatedSelectedRolesIds.push(roleId);
          } else {
            updatedSelectedRolesIds = updatedSelectedRolesIds.filter(
              (id) => id !== roleId,
            );
          }
        }

        return updatedSelectedRolesIds.length === roles.roles.total
          ? "all"
          : updatedSelectedRolesIds;
      });
    },
    [process.isProcessing, roles],
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-role-all" hidden aria-hidden>
          Select all roles
        </label>
        <input
          type="checkbox"
          id="select-role-all"
          name="select-role-all"
          className="form-check-input"
          checked={selectedRoleIds === "all"}
          onChange={handleSelectRole}
          disabled={process.isProcessing}
        />
      </th>,
      ...displayFields.map((field) => {
        if (!field.visible) {
          return <Fragment key={`th-${field.name}`} />;
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
          <Loading loadingMsg="Searching roles..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage={apiErr} />
        </td>
      </tr>
    ) : !roles ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errorMessage="Roles data not found." />
        </td>
      </tr>
    ) : roles.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No roles found matching your criteria. Try adjust some
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
        {roles.roles.roles.map((role) => (
          <tr key={role.id}>
            <td>
              <label htmlFor={`select-role-${role.id}`} hidden aria-hidden>
                Select this role
              </label>
              <input
                type="checkbox"
                id={`select-role-${role.id}`}
                name={`select-role-${role.id}`}
                className="form-check-input"
                checked={
                  selectedRoleIds === "all" || selectedRoleIds.includes(role.id)
                }
                onChange={handleSelectRole}
                disabled={process.isProcessing}
              />
            </td>
            {displayFields.map((field, idx) => {
              if (!field.visible) {
                return <Fragment key={`td-${idx}-${field.name}`} />;
              }

              const colDisplay = TABLE_COL_DISPLAY[field.name];
              return (
                <td
                  key={`td-${idx}-${field.name}`}
                  className={colDisplay.tdClassName}
                >
                  {colDisplay.tdContent(role)}
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
    handleSelectRole,
    handleSort,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedRoleIds,
    roles,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: RoleDisplayField[]): void => {
      setDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setDisplayFields],
  );

  const handleResetConfigDisplay = useCallback((): void => {
    resetDisplayFields();
    toast.success("Config display has been reset to default.");
  }, [resetDisplayFields]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      roleIdToDelete: null,
      roleIdsToDelete: null,
    });
  }, []);

  const handleExportList = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!roles || roles.total === 0) {
      toast("No roles available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all roles matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const rolesToExport = (
        await fetchRoles({
          ...exportQuery,
          limit: roles.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).roles;

      if (rolesToExport.total === 0) {
        toast("No roles found to export.", { icon: WARNING_EMOJI });
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
        role: RoleResponse,
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(role),
        );
      };

      exportToCsv<RoleResponse>(
        `${PROJECT_NAME.toLowerCase()}-roles-exports-${new Date().toISOString()}.csv`,
        headers,
        rolesToExport.roles,
        getVals,
      );

      toast.success(
        `Exported ${rolesToExport.roles.length} roles successfully.`,
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
    roles,
    searchForm,
    fetchRoles,
    displayFields,
    TABLE_COL_DISPLAY,
  ]);

  const handleSubmitDeleteRole = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteRole) {
      toast.error("You do not have permission to delete roles.");
      return;
    }
    if (!modal.roleIdToDelete) {
      toast.error("Role ID to delete not found.");
      return;
    }

    try {
      await deleteRole(modal.roleIdToDelete);
      toast.success("Role deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger the effect
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteRole,
    deleteRole,
    modal.roleIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteRoleBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteRole) {
      toast.error("You do not have permission to delete roles.");
      return;
    }
    if (!modal.roleIdsToDelete || modal.roleIdsToDelete.length === 0) {
      toast.error("No selected roles to delete.");
      return;
    }

    try {
      await deleteRoleBulk({ roleIds: modal.roleIdsToDelete });
      toast.success(
        `${modal.roleIdsToDelete.length} roles deleted successfully.`,
      );

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger the effect
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteRole,
    deleteRoleBulk,
    modal.roleIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);
  
  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">Role management</h1>
        <div className="d-flex gap-3">
          <LinkBtn
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
            disabled={!canCreateRole}
            disabledtitle={DISABLED_TITLE_FOR_PERFORMING}
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new role
          </LinkBtn>
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
            <div className="row g-2 justify-content-between">
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search roles
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, ID..."
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
              <div className="col-lg-3 col-md-12 d-flex justify-content-end gap-2">
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
                disabled={process.isProcessing || !roles}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (roles && roles.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {roles && roles.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + roles.roles.total
                  } of ${roles.total}`
                : `0-0 of 0`}
            </p>
            {roles && (
              <Pagination
                totalItems={roles.total}
                itemsPerPage={roles.limit}
                currentOffset={roles.offset}
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
        legend={ROLE_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.roleIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteRole}
        custom={{
          action: "delete",
          title: `Delete role ID ${modal.roleIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this role? All users assigned to this role will lose the permissions granted by this role. This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete role",
        }}
      />

      <ConfirmSubmitModal
        show={modal.roleIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteRoleBulk}
        custom={{
          action: "delete",
          title: `Delete selected roles (${
            modal.roleIdsToDelete?.length || "N/A"
          })`,
          body: `Are you sure you want to delete all the selected roles? This action will delete ${
            modal.roleIdsToDelete?.length || "N/A"
          } role(s) and all users assigned to these roles will lose the permissions granted by these roles. This action cannot be undone.`,
          cancelText: "Cancel",
          submitText: "Delete roles",
        }}
      />
    </>
  );
}
