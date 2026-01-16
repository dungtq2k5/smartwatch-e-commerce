import { create } from "zustand";
import type {
  OrderReturnCreate,
  OrderReturnDetailsResponse,
  OrderReturnListResponse,
  OrderReturnResponse,
  OrderReturnSelfUpdate,
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
  returnDetailCache: OrderReturnDetailsResponse | null;

  fetchReturns: (
    query?: OrderReturnSearchQueryCli,
    signal?: AbortSignal
  ) => Promise<OrderReturnListResponse>;
  fetchReturn: (returnId: string) => Promise<OrderReturnResponse>;
  fetchReturnDetail: (returnId: string) => Promise<OrderReturnDetailsResponse>;

  createReturn: (
    orderId: string,
    data: OrderReturnCreate
  ) => Promise<OrderReturnResponse>;

  updateReturn: (
    returnId: string,
    data: OrderReturnSelfUpdate
  ) => Promise<OrderReturnResponse>;

  canUpdateReturn: (returnStateLookupId: string) => boolean;

  getUserAddressIdFromReturn: (
    returnPickupAddress: OrderReturnResponse["pickupAddress"],
    userAddresses: UserAddressListResponse["addresses"]
  ) => string | undefined;
};

const useReturnStoreInternal = create<ReturnState>((set, get) => ({
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

  async fetchReturn(returnId: string): Promise<OrderReturnResponse> {
    const { returnCache } = get();
    if (returnCache?.id === returnId) return structuredClone(returnCache);

    try {
      const res = await retrieve(`${RETURN_URL}/${returnId}`);
      if (!res.success) throw new Error(res.message);

      const returnData = res.data as OrderReturnResponse;
      set({ returnCache: returnData });
      return structuredClone(returnData);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchReturnDetail(
    returnId: string
  ): Promise<OrderReturnDetailsResponse> {
    const { returnDetailCache } = get();
    if (returnDetailCache?.id === returnId) {
      return structuredClone(returnDetailCache);
    }

    try {
      const res = await retrieve(`${RETURN_URL}/${returnId}/details`);
      if (!res.success) throw new Error(res.message);

      const returnDetail = res.data as OrderReturnDetailsResponse;
      set({ returnDetailCache: returnDetail });
      return structuredClone(returnDetail);
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
      return structuredClone(returnData);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateReturn(
    returnId: string,
    data: OrderReturnSelfUpdate
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

      return structuredClone(updatedReturn);
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
    return structuredClone(
      userAddresses.find((addr) =>
        compareUserAddress(addr, returnPickupAddress)
      )?.id
    );
  },
}));

export default function useReturnStore() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { returnCache, returnDetailCache, ...actions } =
    useReturnStoreInternal();
  return actions;
}
