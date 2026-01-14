import { create } from "zustand";
import type {
  GrnCreate,
  GrnListResponse,
  GrnResponse,
  GrnSearchQuery,
  GrnUpdate,
} from "../../../../../common/types.common";
import {
  formatError,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { patch, post, retrieve } from "../../../utils/utils";
import { GRN_URL } from "../../../configs";

type GrnState = {
  createGrn: (grn: GrnCreate) => Promise<GrnResponse>;

  fetchGrn: (id: string) => Promise<GrnResponse>;
  fetchGrns: (query?: GrnSearchQuery) => Promise<GrnListResponse>;

  updateGrn: (id: string, grn: GrnUpdate) => Promise<GrnResponse>;
};

const useGrnStore = create<GrnState>(() => ({
  async createGrn(grn: GrnCreate): Promise<GrnResponse> {
    try {
      const formData = new FormData();

      formData.append("modelVariationId", grn.modelVariationId);
      formData.append("providerId", grn.providerId);

      formData.append("grn", JSON.stringify(grn.grn));
      formData.append("file", grn.file);

      const res = await post(GRN_URL, formData);
      if (!res.success) throw new Error(res.message);

      return res.data as GrnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchGrn(id: string): Promise<GrnResponse> {
    // DEV temp for designing UI
    return {
      id: "1",
      name: "GRN 1",
      providerId: "69627ba35ee956bed423966f",
      totalPriceCents: 150000,
      stateId: "69627a9a21123eac35b5947a",
      quantity: 10,
      notes: "First GRN",
      createdBy: {
        id: "69627a9721123eac35b59477",
        fullName: "System",
      },
      createdAt: "2024-10-01T10:00:00Z",
      reversedByGrnId: null,
      reversedAt: null,
    };

    try {
      const res = await retrieve(`${GRN_URL}/${id}`);
      if (!res.success) throw new Error(res.message);

      return res.data as GrnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchGrns(query?: GrnSearchQuery): Promise<GrnListResponse> {
    // return {
    //   total: 5,
    //   grns: {
    //     total: 5,
    //     grns: [
    //       {
    //         id: "1",
    //         name: "GRN 1",
    //         provider: {
    //           id: "69627ba35ee956bed423966f",
    //           fullName: "Provider A",
    //         },
    //         createdBy: {
    //           id: "69627a9721123eac35b59477",
    //           fullName: "System",
    //         },
    //         totalPriceCents: 150000,
    //         quantity: 10,
    //         notes: "First GRN",
    //         createdAt: "2024-10-01T10:00:00Z",
    //         reversedByGrnId: null,
    //         reversedAt: null,
    //         stateId: "69627a9a21123eac35b5947a",
    //       },
    //       {
    //         id: "2",
    //         name: "GRN 2",
    //         provider: {
    //           id: "69627ba35ee956bed423966f",
    //           fullName: "Provider B",
    //         },
    //         createdBy: {
    //           id: "69627a9721123eac35b59477",
    //           fullName: "Admin User",
    //         },
    //         totalPriceCents: 250000,
    //         quantity: 20,
    //         notes: "Second GRN",
    //         createdAt: "2024-10-02T11:30:00Z",
    //         reversedByGrnId: null,
    //         reversedAt: null,
    //         stateId: "69627a9a21123eac35b5947a",
    //       },
    //       {
    //         id: "3",
    //         name: "GRN 3",
    //         provider: {
    //           id: "69627ba35ee956bed423966f",
    //           fullName: "Provider C",
    //         },
    //         createdBy: {
    //           id: "69627a9721123eac35b59477",
    //           fullName: "System",
    //         },
    //         totalPriceCents: 300000,
    //         quantity: 15,
    //         notes: "Third GRN",
    //         createdAt: "2024-10-03T09:15:00Z",
    //         reversedByGrnId: null,
    //         reversedAt: null,
    //         stateId: "69627a9a21123eac35b5947a",
    //       },
    //       {
    //         id: "4",
    //         name: "GRN 4",
    //         provider: {
    //           id: "69627ba35ee956bed423966f",
    //           fullName: "Provider D",
    //         },
    //         createdBy: {
    //           id: "69627a9721123eac35b59477",
    //           fullName: "Admin User",
    //         },
    //         totalPriceCents: 400000,
    //         quantity: 25,
    //         notes: "Fourth GRN",
    //         createdAt: "2024-10-04T14:45:00Z",
    //         reversedByGrnId: null,
    //         reversedAt: null,
    //         stateId: "69627a9a21123eac35b5947a",
    //       },
    //       {
    //         id: "5",
    //         name: "GRN 5",
    //         provider: {
    //           id: "69627ba35ee956bed423966f",
    //           fullName: "Provider E",
    //         },
    //         createdBy: {
    //           id: "69627a9721123eac35b59477",
    //           fullName: "System",
    //         },
    //         totalPriceCents: 500000,
    //         quantity: 30,
    //         notes: "Fifth GRN",
    //         createdAt: "2024-10-05T16:20:00Z",
    //         reversedByGrnId: null,
    //         reversedAt: null,
    //         stateId: "69627a9a21123eac35b5947a",
    //       },
    //     ],
    //   },
    //   limit: 5,
    //   offset: 0,
    // };

    const queryParams = new URLSearchParams();
    if (query) {
      if (query.limit) queryParams.set("limit", query.limit);
      if (query.offset) queryParams.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm)) {
        queryParams.set("searchTerm", query.searchTerm);
      }
      if (query.totalPriceCentsMin) {
        queryParams.set("totalPriceCentsMin", query.totalPriceCentsMin);
      }
      if (query.totalPriceCentsMax) {
        queryParams.set("totalPriceCentsMax", query.totalPriceCentsMax);
      }
      if (query.createdAtFrom) {
        queryParams.set("createdAtFrom", query.createdAtFrom);
      }
      if (query.createdAtTo) {
        queryParams.set("createdAtTo", query.createdAtTo);
      }
      if (query.stateId) {
        queryParams.set("stateId", query.stateId);
      }
    }

    try {
      const res = await retrieve(`${GRN_URL}?${queryParams.toString()}`);
      if (!res.success) throw new Error(res.message);

      return res.data as GrnListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateGrn(id: string, grn: GrnUpdate): Promise<GrnResponse> {
    try {
      const res = await patch(GRN_URL, id, grn);
      if (!res.success) throw new Error(res.message);

      return res.data as GrnResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));

export default useGrnStore;
