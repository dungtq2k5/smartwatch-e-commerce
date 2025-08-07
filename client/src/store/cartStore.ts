import { create } from "zustand";
import type {
  UserCartCreate,
  UserCartResponse,
  UserCartResponseList,
} from "../../../common/types.common";
import { formatError, patch, post, remove, retrieve } from "../utils/utils";
import { SELF_CART_URL } from "../configs";
import type { UserCartUpdate } from "../utils/types";

type UserCartState = {
  cart?: UserCartResponseList;
  isFetching?: true;
  fetchErr?: string;
  isLoading?: true;
  modifyingItemId?: string; // Store variationId of the item being updated or removed

  fetchCart: () => Promise<void>;
  createCart: (data: UserCartCreate) => Promise<void>;
  updateCartItem: (data: UserCartUpdate) => Promise<void>;
  removeCartItem: (variationId: string) => Promise<void>;
};

export const useUserCartStore = create<UserCartState>((set, get) => ({
  cart: undefined,
  isFetching: undefined,
  fetchErr: undefined,
  isLoading: undefined,
  modifyingItemId: undefined,

  async fetchCart(): Promise<void> {
    const { cart } = get();
    if (cart) return;

    set({ isFetching: true, fetchErr: undefined });
    try {
      const res = await retrieve(SELF_CART_URL);
      if (!res.success) {
        set({ fetchErr: res.message });
        return;
      }

      set({ cart: res.data as UserCartResponseList });
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

      const newItem = res.data as UserCartResponse;
      const { cart } = get();
      if (cart) {
        const existingItemIdx = cart.items.findIndex(
          (item) => item.variation.id === newItem.variation.id
        );

        // If the item already exists in the cart, update it, otherwise add it
        const updatedItem = [...cart.items];
        if (existingItemIdx !== -1) {
          updatedItem[existingItemIdx] = newItem;
        } else {
          // Push at the top of the cart items since they are sort by most recent
          updatedItem.unshift(newItem);
        }

        set({
          cart: {
            ...cart,
            total: updatedItem.length,
            items: updatedItem,
          },
        });
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ isLoading: undefined });
    }
  },

  async updateCartItem(data: UserCartUpdate): Promise<void> {
    set({ modifyingItemId: data.variationId });
    try {
      const res = await patch(SELF_CART_URL, data.variationId, {
        quantity: data.quantity,
      });
      if (!res.success) throw new Error(res.message);

      const updatedItem = res.data as UserCartResponse | undefined; // Undefined means the item was removed (quantity 0)
      const { cart } = get();
      if (cart) {
        // If updatedItem is undefined, remove it from the cart, otherwise update it
        const updatedItems = [...cart.items];
        const existingItemIdx = cart.items.findIndex(
          (item) => item.variation.id === data.variationId
        );

        if (existingItemIdx !== -1) {
          if (updatedItem) {
            updatedItems[existingItemIdx] = updatedItem;
          } else {
            updatedItems.splice(existingItemIdx, 1);
          }

          set({
            cart: {
              ...cart,
              total: updatedItems.length,
              items: updatedItems,
            },
          });
        }
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ modifyingItemId: undefined });
    }
  },

  async removeCartItem(variationId: string): Promise<void> {
    set({ modifyingItemId: variationId });
    try {
      const res = await remove(SELF_CART_URL, variationId);
      if (!res.success) throw new Error(res.message);

      const { cart } = get();
      if (cart) {
        const updatedItems = cart.items.filter(
          (item) => item.variation.id !== variationId
        );
        set({
          cart: {
            ...cart,
            total: updatedItems.length,
            items: updatedItems,
          },
        });
      }
    } catch (error) {
      throw new Error(formatError(error));
    } finally {
      set({ modifyingItemId: undefined });
    }
  },
}));
