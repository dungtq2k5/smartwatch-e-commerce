import { create } from "zustand";
import type {
  AdminVariationInstanceDetailsResponse,
  SortOption,
  VariationInstanceCreate,
  VariationInstanceListResponse,
  VariationInstanceResponse,
  VariationInstanceSearchQuery,
  VariationInstanceUpdate,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { VARIATION_INSTANCE_URL } from "../../../configs";
import { patch, post, retrieve } from "../../../utils/utils";

type InstanceState = {
  fetchInstance: (id: string) => Promise<VariationInstanceResponse>;
  fetchInstances: (
    query?: VariationInstanceSearchQuery,
  ) => Promise<VariationInstanceListResponse>;
  fetchInstanceDetails: (
    id: string,
    sortMovements?: SortOption,
  ) => Promise<AdminVariationInstanceDetailsResponse>;

  createInstance: (
    instance: VariationInstanceCreate,
  ) => Promise<VariationInstanceResponse>;

  updateInstance: (
    id: string,
    instance: VariationInstanceUpdate,
  ) => Promise<VariationInstanceResponse>;
};

const useInstanceStore = create<InstanceState>(() => ({
  async fetchInstance(id: string): Promise<VariationInstanceResponse> {
    try {
      const res = await retrieve(`${VARIATION_INSTANCE_URL}/${id}`);
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchInstances(
    query?: VariationInstanceSearchQuery,
  ): Promise<VariationInstanceListResponse> {
    const queryString = new URLSearchParams();
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryString.set("searchTerm", query.searchTerm);
      }
      if (query.conditionId) queryString.set("conditionId", query.conditionId);
      if (query.isActive) queryString.set("isActive", query.isActive);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${VARIATION_INSTANCE_URL}/admin?${queryString.toString()}`,
      );
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchInstanceDetails(
    id: string,
    sortMovements?: SortOption,
  ): Promise<AdminVariationInstanceDetailsResponse> {
    // DEV temp for designing UI
    // const testInstanceDetail: AdminVariationInstanceDetailsResponse = {
    //   id: "68e52b787b5e0e47b3ca675f",
    //   sku: "05e31900-7c80-4fcd-8d03-e98becc0b778",
    //   modelVariationId: "68e52b787b5e0e47b3ca6710",
    //   supplierSerialNumber: "8e781a52-095d-4632-a731-ba9c7b880c21",
    //   supplierImeiNumber: null,
    //   conditionId: "68e52b4863777389f70d14fa",
    //   isActive: true,
    //   inactiveAt: null,
    //   createdAt: "2025-10-07T15:02:16.215Z",
    //   updatedAt: "2025-10-07T15:02:16.215Z",
    //   inventoryMovements: {
    //     total: 5,
    //     movements: [
    //       {
    //         id: "68e52b787b5e0e47b3ca6a9d",
    //         inventoryMovementTypeId: "68e52b4763777389f70d14ca",
    //         createdBy: {
    //           id: "68e52b3163777389f70d14be",
    //           fullName: "System User",
    //         },
    //         movementDate: "2025-10-07T15:02:16.524Z",
    //         quantity: 1,
    //         notes: "created for mock data",
    //         createdAt: "2025-10-07T15:02:16.554Z",
    //         grn: {
    //           id: "68e52b787b5e0e47b3ca6b2f",
    //           name: "GRN-001",
    //           provider: {
    //             id: "68e52b3163777389f70d14c5",
    //             fullName: "Default Supplier",
    //           },
    //         },
    //       },
    //       {
    //         id: "68e52b787b5e0e47b3ca6aa0",
    //         inventoryMovementTypeId: "68e52b4763777389f70d14ca",
    //         createdBy: {
    //           id: "68e52b3163777389f70d14be",
    //           fullName: "System User",
    //         },
    //         movementDate: "2025-10-07T15:02:16.524Z",
    //         quantity: 1,
    //         notes: "created for mock data",
    //         createdAt: "2025-10-07T15:02:16.554Z",
    //         grn: {
    //           id: "68e52b787b5e0e47b3ca6b30",
    //           name: "GRN-002",
    //           provider: {
    //             id: "68e52b3163777389f70d14c5",
    //             fullName: "Default Supplier",
    //           },
    //         },
    //       },
    //       {
    //         id: "68e52b787b5e0e47b3ca6aa1",
    //         inventoryMovementTypeId: "68e52b4763777389f70d14ca",
    //         createdBy: {
    //           id: "68e52b3163777389f70d14be",
    //           fullName: "System User",
    //         },
    //         movementDate: "2025-10-07T15:02:16.524Z",
    //         quantity: 1,
    //         notes: "created for mock data",
    //         createdAt: "2025-10-07T15:02:16.554Z",
    //         grn: {
    //           id: "68e52b787b5e0e47b3ca6b31",
    //           name: "GRN-003",
    //           provider: {
    //             id: "68e52b3163777389f70d14c5",
    //             fullName: "Default Supplier",
    //           },
    //         },
    //       },
    //       {
    //         id: "68e52b787b5e0e47b3ca6aa2",
    //         inventoryMovementTypeId: "68e52b4763777389f70d14ca",
    //         createdBy: {
    //           id: "68e52b3163777389f70d14be",
    //           fullName: "System User",
    //         },
    //         movementDate: "2025-10-07T15:02:16.524Z",
    //         quantity: -1,
    //         notes: "created for mock data",
    //         createdAt: "2025-10-07T15:02:16.554Z",
    //         grn: {
    //           id: "68e52b787b5e0e47b3ca6b32",
    //           name: "GRN-004",
    //           provider: {
    //             id: "68e52b3163777389f70d14c5",
    //             fullName: "Default Supplier",
    //           },
    //         },
    //       },
    //       {
    //         id: "68e52b787b5e0e47b3ca6aa3",
    //         inventoryMovementTypeId: "68e52b4763777389f70d14ca",
    //         createdBy: {
    //           id: "68e52b3163777389f70d14be",
    //           fullName: "System User",
    //         },
    //         movementDate: "2025-10-07T15:02:16.524Z",
    //         quantity: -1,
    //         notes: "created for mock data",
    //         createdAt: "2025-10-07T15:02:16.554Z",
    //         grn: {
    //           id: "68e52b787b5e0e47b3ca6b33",
    //           name: "GRN-005",
    //           provider: {
    //             id: "68e52b3163777389f70d14c5",
    //             fullName: "Default Supplier",
    //           },
    //         },
    //       },
    //     ],
    //   },
    // };

    try {
      const res = await retrieve(
        `${VARIATION_INSTANCE_URL}/${id}/details/admin`,
      );
      if (!res.success) throw new Error(res.message);

      const data = res.data as AdminVariationInstanceDetailsResponse;
      // const data = testInstanceDetail;
      if (sortMovements) {
        data.inventoryMovements.movements.sort((a, b) => {
          const dateA = new Date(a.movementDate).getTime();
          const dateB = new Date(b.movementDate).getTime();

          return sortMovements === "asc" ? dateA - dateB : dateB - dateA;
        });
      }

      return data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createInstance(
    instance: VariationInstanceCreate,
  ): Promise<VariationInstanceResponse> {
    try {
      const res = await post(VARIATION_INSTANCE_URL, instance);
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateInstance(
    id: string,
    instance: VariationInstanceUpdate,
  ): Promise<VariationInstanceResponse> {
    try {
      const res = await patch(VARIATION_INSTANCE_URL, id, instance);
      if (!res.success) throw new Error(res.message);

      return res.data as VariationInstanceResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useInstanceStore;
