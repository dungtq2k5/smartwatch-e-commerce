import { create } from "zustand";
import type {
  UserCartCreate,
  UserCartResponse,
  UserCartResponseList,
} from "../../../common/types.common";
import { formatError, post, retrieve } from "../utils/utils";
import { SELF_CART_URL } from "../configs";

type UserCartState = {
  carts?: UserCartResponseList;
  isFetching?: true;
  fetchErr?: string;
  isLoading?: true;

  fetchCarts: () => Promise<void>;
  createCart: (data: UserCartCreate) => Promise<void>;
};

export const useUserCartStore = create<UserCartState>((set, get) => ({
  carts: undefined,
  isFetching: undefined,
  fetchErr: undefined,
  isLoading: undefined,

  async fetchCarts(): Promise<void> {
    const { carts } = get();
    if (carts) return;

    set({ isFetching: true, fetchErr: undefined });
    try {
      const res = await retrieve(SELF_CART_URL);
      if (!res.success) {
        set({ fetchErr: res.message });
        return;
      }

      set({ carts: res.data as UserCartResponseList });
    } catch (error) {
      set({ fetchErr: formatError(error) });
    } finally {
      set({ isFetching: undefined });
    }
  },

  async createCart(data: UserCartCreate): Promise<void> {
    set({ isLoading: true });
    try {
      const res = await post(SELF_CART_URL, data);
      if (!res.success) throw new Error(res.message);

      const newCart = res.data as UserCartResponse;
      const { carts } = get();
      if (carts) {
        set({
          carts: {
            total: carts.total + 1,
            carts: [...carts.carts, newCart],
          },
        });
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },
}));
