import { create } from "zustand";
import type {
  OrderReturnCreate,
  OrderReturnDetailResponse,
  OrderReturnListResponse,
  OrderReturnResponse,
  OrderReturnUpdateSelf,
  UserAddressListResponse,
} from "../../../../common/types.common";
import type { OrderReturnSearchQueryCli } from "../../utils/types";
import { patch, post, retrieve } from "../../utils/utils";
import { ORDER_URL, RETURN_URL, SELF_RETURN_URL } from "../../configs";
import {
  compareUserAddress,
  formatError,
} from "../../../../common/utils.common";

type ReturnState = {
  returnCache: OrderReturnResponse | null;
  returnDetailCache: OrderReturnDetailResponse | null;

  fetchReturns: (
    query?: OrderReturnSearchQueryCli,
    signal?: AbortSignal
  ) => Promise<OrderReturnListResponse>;
  getReturn: (returnId: string) => Promise<OrderReturnResponse>;
  getReturnDetail: (returnId: string) => Promise<OrderReturnDetailResponse>;
  createReturn: (
    orderId: string,
    data: OrderReturnCreate
  ) => Promise<OrderReturnResponse>;
  updateReturn: (
    returnId: string,
    data: OrderReturnUpdateSelf
  ) => Promise<OrderReturnResponse>;
  canUpdateReturn: (returnStateLookupId: string) => boolean;

  getUserAddressIdFromReturn: (
    returnPickupAddress: OrderReturnResponse["pickupAddress"],
    userAddresses: UserAddressListResponse["addresses"]
  ) => string | undefined;
};

export const useReturnStore = create<ReturnState>((set, get) => ({
  returnCache: null,
  returnDetailCache: null,

  async fetchReturns(
    query?: OrderReturnSearchQueryCli,
    signal?: AbortSignal
  ): Promise<OrderReturnListResponse> {
    const queryString = new URLSearchParams();

    let url: string = `${RETURN_URL}`;
    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.userId) {
        queryString.set("userId", query.userId);
      } else if (query.orderId) {
        queryString.set("orderId", query.orderId);
        url = `${ORDER_URL}/${query.orderId}/returns?${queryString.toString()}`;
      }
    }

    try {
      const res = await retrieve(url, signal);
      if (!res.success) throw new Error(res.message);

      return res.data as OrderReturnListResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getReturn(returnId: string): Promise<OrderReturnResponse> {
    const { returnCache } = get();
    if (returnCache && returnCache.id === returnId) return returnCache;

    try {
      const res = await retrieve(`${RETURN_URL}/${returnId}`);
      if (!res.success) throw new Error(res.message);

      const returnData = res.data as OrderReturnResponse;
      set({ returnCache: returnData });
      return returnData;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async getReturnDetail(returnId: string): Promise<OrderReturnDetailResponse> {
    const { returnDetailCache } = get();
    if (returnDetailCache?.id === returnId) {
      return returnDetailCache;
    }

    try {
      const res = await retrieve(`${RETURN_URL}/${returnId}/details`);
      if (!res.success) throw new Error(res.message);

      const returnDetail = res.data as OrderReturnDetailResponse;
      set({ returnDetailCache: returnDetail });
      return returnDetail;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createReturn(
    orderId: string,
    data: OrderReturnCreate
  ): Promise<OrderReturnResponse> {
    try {
      const res = await post(`${ORDER_URL}/${orderId}/returns`, data);
      if (!res.success) throw new Error(res.message);

      const returnData = res.data as OrderReturnResponse;
      set({ returnCache: returnData });
      return returnData;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturn(
    returnId: string,
    data: OrderReturnUpdateSelf
  ): Promise<OrderReturnResponse> {
    try {
      const res = await patch(
        `${SELF_RETURN_URL}/${returnId}`,
        undefined,
        data
      );
      if (!res.success) throw new Error(res.message);

      const updatedReturn = res.data as OrderReturnResponse;
      set({ returnCache: updatedReturn });

      const { returnDetailCache } = get();
      if (returnDetailCache?.id === returnId) {
        set({ returnDetailCache: null });
      }

      return updatedReturn;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  canUpdateReturn(returnStateLookupId: string): boolean {
    return returnStateLookupId === "1"; // pending approval
  },

  getUserAddressIdFromReturn(
    returnPickupAddress: OrderReturnResponse["pickupAddress"],
    userAddresses: UserAddressListResponse["addresses"]
  ): string | undefined {
    return userAddresses.find((addr) =>
      compareUserAddress(addr, returnPickupAddress)
    )?.id;
  },
}));
