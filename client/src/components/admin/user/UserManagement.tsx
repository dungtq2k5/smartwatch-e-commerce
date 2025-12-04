import {
  faFileExport,
  faPlus,
  faSearch,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type {
  AdminUserListResponse,
  AdminUserResponse,
  UserSearchQuery,
} from "../../../../../common/types.common";
import Pagination from "../../common/Pagination";
import {
  centsToUSD,
  formatError,
  isValidBooleanString,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { useUserStore } from "../../../store/admin/userStore";
import { Link, useSearchParams } from "react-router-dom";
import {
  DATA_DISPLAY_ROWS_PER_PAGE,
  WAITING_EMOJI,
  WARNING_EMOJI,
  DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE,
  USER_FIELD_LABEL_LEGEND,
} from "../../../configs";
import {
  PROJECT_NAME,
  USER_SEARCH_SORT_OPTIONS,
} from "../../../../../common/configs.common";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import toast from "react-hot-toast";
import type {
  AdminUserDisplayableField,
  TableColDisplay as GeneralTableColDisplay,
  UserDisplayField,
} from "../../../utils/types";
import ConfigDisplayModal from "../modal/ConfigDisplayModal";
import { exportToCsv } from "../../../utils/utils";
import defaultAvatar from "../../../assets/default-avatar.webp";
import { useRoleStore } from "../../../store/admin/roleStore";
import ConfirmSubmitModal from "../../user/modal/ConfirmSubmitModal";
import { useConfigStore } from "../../../store/admin/configStore";
import { useAuthStore } from "../../../store/admin/authStore";
import { useHasPermission } from "../../../hooks/admin/useHasPermission";
import { useRefreshStore } from "../../../store/admin/refreshStore";
import EditBtnLink from "../EditBtnLink";
import DeleteBtn from "../DeleteBtn";
import TableHeadSortBtn from "../TableHeadSortBtn";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isExportingList: boolean;
};

type SearchForm = Omit<UserSearchQuery, "searchTerm" | "limit" | "offset"> & {
  limit: string;
  offset: string;
  searchTerm: string;
};

type Modal = {
  configDisplay: boolean;
  userIdToDelete: string | null;
  userIdsToDelete: string[] | null;
};

type TableColDisplay = {
  [key in AdminUserDisplayableField]: GeneralTableColDisplay<
    AdminUserResponse,
    (typeof USER_SEARCH_SORT_OPTIONS)[number]
  >;
};

const DEFAULT_SEARCH_FORM: SearchForm = {
  limit: DEFAULT_DATA_DISPLAY_ROWS_PER_PAGE.toString(),
  offset: "0",
  searchTerm: "",
};

const SELECTION_TOAST_ID = "selected-users-toast";

export default function UserManagement() {
  // DEV temp for testing
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log(`UserManagement render count: ${renderCount.current}`);

  const { admin } = useAuthStore();
  const { fetchUsers, deleteUser, deleteUserBulk } = useUserStore();
  const { fetchRoles, getRoleSync } = useRoleStore();
  const refreshSignal = useRefreshStore((state) => state.signals.admin);
  const {
    config: { userManagementDisplayFields: displayFields },
    resetUserManagementDisplayFields,
    setUserManagementDisplayFields,
  } = useConfigStore();

  const [canEditUser, canDeleteUser] = [
    useHasPermission("u_usr"),
    useHasPermission("d_usr"),
  ]; // canReadUser is handled by ApiError

  const TABLE_COL_DISPLAY = useMemo(
    (): TableColDisplay => ({
      id: {
        label: USER_FIELD_LABEL_LEGEND["id"] || "ID",
        tdContent: (user) => <>{user.id}</>,
        getCsvVal: (user) => user.id,
      },
      fullName: {
        label: USER_FIELD_LABEL_LEGEND["fullName"] || "Full name",
        isSortable: true,
        sortKey: { asc: "fullName_asc", desc: "fullName_desc" },
        tdContent: (user) => (
          <div className="d-flex align-items-center">
            <img
              src={user.avatarUrl || defaultAvatar}
              alt={`${user.fullName}'s avatar`}
              className="avatar--g avatar--sm--g me-2"
            />
            <Link to={user.id} title="View detail user">
              {user.fullName}
            </Link>
          </div>
        ),
        getCsvVal: (user) => user.fullName,
      },
      birth: {
        label: USER_FIELD_LABEL_LEGEND["birth"] || "Birth",
        tdContent: (user) => <>{new Date(user.birth).toLocaleDateString()}</>,
        getCsvVal: (user) => new Date(user.birth).toLocaleDateString(),
      },
      gender: {
        label: USER_FIELD_LABEL_LEGEND["gender"] || "Gender",
        thClassName: "text-capitalize",
        tdContent: (user) => <>{user.gender}</>,
        getCsvVal: (user) => user.gender,
      },
      stripeCustomerId: {
        label: USER_FIELD_LABEL_LEGEND["stripeCustomerId"] || "Stripe ID",
        tdContent: (user) => <>{user.stripeCustomerId || "N/A"}</>,
        getCsvVal: (user) => user.stripeCustomerId || "N/A",
      },
      userBalanceCents: {
        label: USER_FIELD_LABEL_LEGEND["userBalanceCents"] || "User balance",
        isSortable: true,
        sortKey: { asc: "userBalanceCents_asc", desc: "userBalanceCents_desc" },
        tdContent: (user) => <>{centsToUSD(user.userBalanceCents)}</>,
        getCsvVal: (user) => centsToUSD(user.userBalanceCents),
      },
      lastLogin: {
        label: USER_FIELD_LABEL_LEGEND["lastLogin"] || "Last login",
        isSortable: true,
        sortKey: { asc: "lastLogin_asc", desc: "lastLogin_desc" },
        tdContent: (user) => (
          <>
            {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "N/A"}
          </>
        ),
        getCsvVal: (user) =>
          user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "N/A",
      },
      createdAt: {
        label: USER_FIELD_LABEL_LEGEND["createdAt"] || "Created at",
        tdContent: (user) => <>{new Date(user.createdAt).toLocaleString()}</>,
        getCsvVal: (user) => new Date(user.createdAt).toLocaleString(),
      },
      updatedAt: {
        label: USER_FIELD_LABEL_LEGEND["updatedAt"] || "Updated at",
        tdContent: (user) => <>{new Date(user.updatedAt).toLocaleString()}</>,
        getCsvVal: (user) => new Date(user.updatedAt).toLocaleString(),
      },
      email: {
        label: USER_FIELD_LABEL_LEGEND["email"] || "Email",
        isSortable: true,
        sortKey: { asc: "email_asc", desc: "email_desc" },
        tdContent: (user) => <>{user.email || "N/A"}</>,
        getCsvVal: (user) => user.email || "N/A",
      },
      phoneNumber: {
        label: USER_FIELD_LABEL_LEGEND["phoneNumber"] || "Phone number",
        tdContent: (user) => <>{user.phoneNumber || "N/A"}</>,
        getCsvVal: (user) => user.phoneNumber || "N/A",
      },
      authProvider: {
        label: USER_FIELD_LABEL_LEGEND["authProvider"] || "Auth type",
        thClassName: "text-capitalize",
        tdContent: (user) => <>{user.authProvider}</>,
        getCsvVal: (user) => user.authProvider,
      },
      accountVerified: {
        label: USER_FIELD_LABEL_LEGEND["accountVerified"] || "Account verified",
        tdContent: (user) => (
          <>
            {user.isEmailVerified && (
              <span className="badge bg-success-subtle text-success-emphasis">
                Email
              </span>
            )}
            {user.isPhoneNumberVerified && (
              <span className="badge bg-success-subtle text-success-emphasis ms-1">
                Phone
              </span>
            )}
            {!user.isEmailVerified && !user.isPhoneNumberVerified && (
              <span className="badge bg-warning-subtle text-warning-emphasis">
                None
              </span>
            )}
          </>
        ),
        getCsvVal: (user) => {
          const verifiedMethods: string[] = [];
          if (user.isEmailVerified) verifiedMethods.push("Email");
          if (user.isPhoneNumberVerified) verifiedMethods.push("Phone");
          return verifiedMethods.length > 0
            ? verifiedMethods.join(", ")
            : "None";
        },
      },
      accountStatus: {
        label: USER_FIELD_LABEL_LEGEND["accountStatus"] || "Account status",
        tdContent: (user) =>
          user.isLocked ? (
            <span className="badge bg-danger">Locked</span>
          ) : (
            <span className="badge bg-success">Active</span>
          ),
        getCsvVal: (user) => (user.isLocked ? "Locked" : "Active"),
      },
      roles: {
        label: USER_FIELD_LABEL_LEGEND["roles"] || "Roles",
        tdContent: (user) => (
          <>
            {user.roles.length > 0 ? (
              user.roles.map((role, idx) => (
                <span
                  key={role.id}
                  className={`badge bg-info-subtle text-info-emphasis text-capitalize ${
                    idx > 1 ? "ms-1" : ""
                  }`}
                >
                  {getRoleSync(role.id)?.name || "Unknown Role"}
                </span>
              ))
            ) : (
              <span className="text-muted">No roles assigned</span>
            )}
          </>
        ),
        getCsvVal: (user) =>
          user.roles.length > 0
            ? user.roles
                .map((role) => getRoleSync(role.id)?.name || "Unknown Role")
                .join(", ")
            : "No roles assigned",
      },
      actions: {
        label: USER_FIELD_LABEL_LEGEND["actions"] || "Actions",
        tdContent: (user) =>
          user.id === admin?.id ? ( // Prevent admin from deleting/editing self
            <>None</>
          ) : (
            <div className="d-flex gap-2">
              {canEditUser && (
                <EditBtnLink linkTo={`${user.id}/edit`} title="edit user" />
              )}
              {canDeleteUser && (
                <DeleteBtn
                  title="delete user"
                  onClick={() =>
                    setModal((prev) => ({ ...prev, userIdToDelete: user.id }))
                  }
                />
              )}
            </div>
          ),
        getCsvVal: () => null,
      },
    }),
    [admin?.id, canDeleteUser, canEditUser, getRoleSync]
  );

  const [process, setProcess] = useState<Process>({
    isProcessing: true,
    isFetching: true,
    isExportingList: false,
  });
  const [apiErr, setApiErr] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUserListResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [searchForm, setSearchForm] = useState<SearchForm>(
    DEFAULT_SEARCH_FORM
  );

  const [selectedUserIds, setSelectedUserIds] = useState<string[] | "all">([]);
  const [selectionToastId, setSelectionToastId] = useState<
    typeof SELECTION_TOAST_ID | null
  >(null);

  const [modal, setModal] = useState<Modal>({
    configDisplay: false,
    userIdToDelete: null,
    userIdsToDelete: null,
  });

  const tableRef = useRef<HTMLTableElement | null>(null);

  // Fetch set initial when first load or searchParams change or refreshSignal
  useEffect(() => {
    const handleFetchSetInitialData = async () => {
      setProcess((prev) => ({ ...prev, isProcessing: true, isFetching: true }));
      setApiErr(null);

      try {
        await fetchRoles(); // Pre-fetch roles to use getRoleSync for display

        const [
          urlLimit,
          urlOffset,
          urlSearchTerm,
          urlIsEmailVerified,
          urlIsPhoneNumberVerified,
          urlIsLocked,
          urlSortBy,
        ] = [
          searchParams.get("limit"),
          searchParams.get("offset"),
          searchParams.get("searchTerm"),
          searchParams.get("isEmailVerified"),
          searchParams.get("isPhoneNumberVerified"),
          searchParams.get("isLocked"),
          searchParams.get("sortBy"),
        ];

        const newSearchForm: SearchForm = {
          ...searchForm,
          limit: urlLimit || DEFAULT_SEARCH_FORM.limit,
          offset: urlOffset || "0",
          searchTerm: urlSearchTerm || "",
          isEmailVerified:
            urlIsEmailVerified && isValidBooleanString(urlIsEmailVerified)
              ? urlIsEmailVerified
              : undefined,
          isPhoneNumberVerified:
            urlIsPhoneNumberVerified &&
            isValidBooleanString(urlIsPhoneNumberVerified)
              ? urlIsPhoneNumberVerified
              : undefined,
          isLocked:
            urlIsLocked && isValidBooleanString(urlIsLocked)
              ? urlIsLocked
              : undefined,
          sortBy: USER_SEARCH_SORT_OPTIONS.includes(
            urlSortBy as (typeof USER_SEARCH_SORT_OPTIONS)[number]
          )
            ? (urlSortBy as SearchForm["sortBy"])
            : undefined,
        };

        setSelectedUserIds([]);
        setSelectionToastId(null);
        setSearchForm(newSearchForm);
        setUsers(await fetchUsers(newSearchForm));
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
    if (!users) return;

    const selectedCount =
      selectedUserIds === "all" ? users.users.total : selectedUserIds.length;

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
                setSelectedUserIds([]);
                toast.dismiss(selectionToastId || undefined);
              }}
            />
            <div className="fw-bold">{selectedCount} user(s) selected</div>
          </div>

          <button
            type="button"
            className="text-danger border-0 bg-transparent p-0"
            onClick={() => {
              setModal((prev) => ({
                ...prev,
                userIdsToDelete:
                  selectedUserIds === "all"
                    ? users.users.users.map((u) => u.id)
                    : selectedUserIds,
              }));
              setSelectedUserIds([]);
              toast.dismiss(selectionToastId || undefined);
            }}
          >
            Delete selected users
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
  }, [selectedUserIds]);

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
        [name]: [
          "isEmailVerified",
          "isPhoneNumberVerified",
          "isLocked",
        ].includes(name)
          ? value || undefined
          : value,
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
        isEmailVerified,
        isPhoneNumberVerified,
        isLocked,
        sortBy,
      } = searchForm;

      setSearchParams((prev) => {
        prev.set("limit", limit);
        prev.set("offset", "0");

        const formattedSearchTerm = removeOddSpaces(searchTerm);
        if (formattedSearchTerm) prev.set("searchTerm", formattedSearchTerm);
        else prev.delete("searchTerm");

        if (isEmailVerified !== undefined)
          prev.set("isEmailVerified", isEmailVerified);
        else prev.delete("isEmailVerified");

        if (isPhoneNumberVerified !== undefined)
          prev.set("isPhoneNumberVerified", isPhoneNumberVerified);
        else prev.delete("isPhoneNumberVerified");

        if (isLocked !== undefined) prev.set("isLocked", isLocked);
        else prev.delete("isLocked");

        if (sortBy) prev.set("sortBy", sortBy);
        else prev.delete("sortBy");

        return prev;
      });
    },
    [process.isProcessing, searchForm, setSearchParams]
  );

  const handleClearFilters = useCallback((): void => {
    if (process.isProcessing) return;

    // Case when url hasn't changed but user wants to clear filters -> reset form state
    setSearchForm(DEFAULT_SEARCH_FORM);

    // setSearchParams((prev) => {
    //   prev.delete("searchTerm");
    //   prev.delete("isEmailVerified");
    //   prev.delete("isPhoneNumberVerified");
    //   prev.delete("isLocked");

    //   prev.set("limit", DEFAULT_SEARCH_FORM.limit);
    //   prev.set("offset", "0");

    //   return prev;
    // });
    setSearchParams({
      limit: DEFAULT_SEARCH_FORM.limit,
      offset: "0",
    });
  }, [process.isProcessing, setSearchParams]);

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

  const handleSelectUser = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      if (process.isProcessing || !users) return;

      const { checked, name } = e.target;

      const userId = name.split("select-user-")[1];
      if (userId === "all") {
        setSelectedUserIds(checked ? "all" : []);
        return;
      }

      setSelectedUserIds((prev) => {
        let updatedSelectedUserIds: string[] | "all" = [];

        /*
          Logic:
            - If "all" was previously selected and now deselecting one, switch to selecting all except this one.
            - If individually selecting/deselecting, update the list accordingly.
            - If all items are selected individually, switch to "all".
        */

        if (prev === "all") {
          if (!checked) {
            updatedSelectedUserIds = users.users.users
              .filter((user) => user.id !== userId)
              .map((user) => user.id);
          } else {
            // This case shouldn't happen as all are already selected, but as fallback
            updatedSelectedUserIds = "all";
          }
        } else {
          updatedSelectedUserIds = [...prev];

          if (checked) {
            updatedSelectedUserIds.push(userId);
          } else {
            updatedSelectedUserIds = updatedSelectedUserIds.filter(
              (id) => id !== userId
            );
          }
        }

        return updatedSelectedUserIds.length === users.users.total
          ? "all"
          : updatedSelectedUserIds;
      });
    },
    [process.isProcessing, users]
  );

  // Also handle loading effects
  const genTable = useCallback((): JSX.Element => {
    // Generate table headers based on displayFields
    const tableHeaders: JSX.Element[] = [
      <th key="th-select-all">
        <label htmlFor="select-user-all" hidden aria-hidden>
          Select all users
        </label>
        <input
          type="checkbox"
          id="select-user-all"
          name="select-user-all"
          className="form-check-input"
          checked={selectedUserIds === "all"}
          onChange={handleSelectUser}
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
          <Loading loadingMsg="Searching users..." />
        </td>
      </tr>
    ) : apiErr ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg={apiErr} />
        </td>
      </tr>
    ) : !users ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <ApiError errMsg="Users data not found." />
        </td>
      </tr>
    ) : users.total === 0 ? (
      <tr>
        <td colSpan={colSpan} className="p-4">
          <p className="mb-0 text-muted text-center">
            Uh oh! No users found matching your criteria. Try adjust some
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
        {users.users.users.map((user) => (
          <tr key={user.id}>
            <td>
              <label htmlFor={`select-user-${user.id}`} hidden aria-hidden>
                Select this user
              </label>
              <input
                type="checkbox"
                id={`select-user-${user.id}`}
                name={`select-user-${user.id}`}
                className="form-check-input"
                checked={
                  selectedUserIds === "all" || selectedUserIds.includes(user.id)
                }
                onChange={handleSelectUser}
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
                  {colDisplay.tdContent(user)}
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
    handleSelectUser,
    handleSort,
    process.isFetching,
    process.isProcessing,
    searchForm.sortBy,
    selectedUserIds,
    users,
  ]);

  const handleApplyConfigDisplay = useCallback(
    (fields: UserDisplayField[]): void => {
      setUserManagementDisplayFields(fields);
      toast.success("Config display has been updated.");
    },
    [setUserManagementDisplayFields]
  );

  const handleResetConfigDisplay = useCallback((): void => {
    resetUserManagementDisplayFields();
    toast.success("Config display has been reset to default.");
  }, [resetUserManagementDisplayFields]);

  const closeModal = useCallback((): void => {
    setModal({
      configDisplay: false,
      userIdToDelete: null,
      userIdsToDelete: null,
    });
  }, []);

  const handleExportList = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!users || users.total === 0) {
      toast("No users available to export.", { icon: WARNING_EMOJI });
      return;
    }

    setProcess((prev) => ({
      ...prev,
      isProcessing: true,
      isExportingList: true,
    }));

    try {
      // Fetch all users matching the current filters, ignoring pagination
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { limit, offset, ...exportQuery } = searchForm;
      const usersToExport = (
        await fetchUsers({
          ...exportQuery,
          limit: users.total.toString(), // By default limit will be set to 9 at the BackEnd if not provided
        })
      ).users;

      if (usersToExport.total === 0) {
        toast("No users found to export.", { icon: WARNING_EMOJI });
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
        user: AdminUserResponse
      ): (string | number | boolean | null)[] => {
        return exportableFields.map((field) =>
          TABLE_COL_DISPLAY[field.name].getCsvVal(user)
        );
      };

      exportToCsv<AdminUserResponse>(
        `${PROJECT_NAME.toLowerCase()}-users-exports-${new Date().toISOString()}.csv`,
        headers,
        usersToExport.users,
        getVals
      );

      toast.success(`Exported ${usersToExport.users.length} users successfully.`);
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
    fetchUsers,
    process.isProcessing,
    searchForm,
    users,
  ]);

  const handleSubmitDeleteUser = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteUser) {
      toast.error("You do not have permission to delete users.");
      return;
    }
    if (!modal.userIdToDelete) {
      toast.error("User ID to delete not found.");
      return;
    }

    try {
      await deleteUser(modal.userIdToDelete);
      toast.success("User deleted successfully.");

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger the effect
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteUser,
    deleteUser,
    modal.userIdToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  const handleSubmitDeleteUserBulk = useCallback(async (): Promise<void> => {
    if (process.isProcessing) {
      toast("Another action is in progress. Please wait.", {
        icon: WAITING_EMOJI,
      });
      return;
    }
    if (!canDeleteUser) {
      toast.error("You do not have permission to delete users.");
      return;
    }
    if (!modal.userIdsToDelete || modal.userIdsToDelete.length === 0) {
      toast.error("No selected users to delete.");
      return;
    }

    try {
      await deleteUserBulk({ userIds: modal.userIdsToDelete });
      toast.success(
        `${modal.userIdsToDelete.length} users deleted successfully.`
      );

      // Refresh list by re-triggering the useEffect
      // Create a new URLSearchParams object from the previous one to trigger the effect
      setSearchParams((prev) => new URLSearchParams(prev));
    } catch (error) {
      toast.error(formatError(error));
    }
  }, [
    canDeleteUser,
    deleteUserBulk,
    modal.userIdsToDelete,
    process.isProcessing,
    setSearchParams,
  ]);

  return (
    <>
      {/* Heading */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h2">User management</h1>
        <div className="d-flex gap-3">
          <Link
            to="create"
            className="text-decoration-none border-0 p-0 bg-transparent text-primary"
          >
            <FontAwesomeIcon icon={faPlus} size="sm" className="me-2" />
            Create new user
          </Link>
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
            <div className="row g-2">
              <div className="col-lg-3 col-md-6">
                <div className="input-group">
                  <label htmlFor="searchTerm" hidden aria-hidden>
                    Search users
                  </label>
                  <input
                    type="text"
                    id="searchTerm"
                    name="searchTerm"
                    className="form-control rounded"
                    placeholder="Search by name, email, ID..."
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
                  <label htmlFor="isEmailVerified" className="input-group-text">
                    Email
                  </label>
                  <select
                    id="isEmailVerified"
                    name="isEmailVerified"
                    className="form-select"
                    value={searchForm.isEmailVerified || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Verified</option>
                    <option value="false">Not verified</option>
                  </select>
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label
                    htmlFor="isPhoneNumberVerified"
                    className="input-group-text"
                  >
                    Phone
                  </label>
                  <select
                    id="isPhoneNumberVerified"
                    name="isPhoneNumberVerified"
                    className="form-select"
                    value={searchForm.isPhoneNumberVerified || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="true">Verified</option>
                    <option value="false">Not verified</option>
                  </select>
                </div>
              </div>
              <div className="col-lg-2 col-md-6">
                <div className="input-group">
                  <label htmlFor="isLocked" className="input-group-text">
                    Status
                  </label>
                  <select
                    id="isLocked"
                    name="isLocked"
                    className="form-select"
                    value={searchForm.isLocked || ""}
                    onChange={handleSearchChange}
                    disabled={process.isProcessing}
                  >
                    <option value="">All</option>
                    <option value="false">Active</option>
                    <option value="true">Locked</option>
                  </select>
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
                disabled={process.isProcessing || !users}
              >
                {DATA_DISPLAY_ROWS_PER_PAGE.map((rowOption) => {
                  if (users && users.total < rowOption) return null;

                  return (
                    <option key={rowOption} value={rowOption}>
                      {rowOption}
                    </option>
                  );
                })}
              </select>
            </div>
            <p className="mb-0 text-muted">
              {users && users.total > 0
                ? `${Number.parseInt(searchForm.offset, 10) + 1}-${
                    Number.parseInt(searchForm.offset, 10) + users.users.total
                  } of ${users.total}`
                : `0-0 of 0`}
            </p>
            {users && (
              <Pagination
                totalItems={users.total}
                itemsPerPage={users.limit}
                currentOffset={users.offset}
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
        legend={USER_FIELD_LABEL_LEGEND}
        onClose={closeModal}
        onReset={handleResetConfigDisplay}
        onApply={handleApplyConfigDisplay}
      />

      <ConfirmSubmitModal
        show={modal.userIdToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteUser}
        custom={{
          action: "delete",
          title: `Delete user ID ${modal.userIdToDelete || "N/A"}`,
          body: "Are you sure you want to delete this user? This action cannot be undone.",
          cancelText: "Cancel",
          submitText: "Delete user",
        }}
      />

      <ConfirmSubmitModal
        show={modal.userIdsToDelete !== null}
        onHide={closeModal}
        onSubmit={handleSubmitDeleteUserBulk}
        custom={{
          action: "delete",
          title: `Delete selected users (${
            modal.userIdsToDelete?.length || "N/A"
          })`,
          body: `Are you sure you want to all the selected users? This action will delete ${
            modal.userIdsToDelete?.length || "N/A"
          } user(s) in the system and cannot be undone.`,
          cancelText: "Cancel",
          submitText: "Delete users",
        }}
      />
    </>
  );
}
