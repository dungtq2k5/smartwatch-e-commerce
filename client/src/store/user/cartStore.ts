import { create } from "zustand";
import type {
  UserCartCreate,
  UserCartResponse,
  UserCartListResponse,
  UserCartBulkCreate,
} from "../../../../common/types.common";
import { patch, post, remove, retrieve } from "../../utils/utils";
import { SELF_CART_URL } from "../../configs";
import type { UserCartUpdate } from "../../utils/types";
import { formatError } from "../../../../common/utils.common";

type UserCartState = {
  cart: UserCartListResponse | null;

  // Derived state
  totalCents: number;
  isAllItemAvailable: boolean;

  fetchCart: (oblige?: boolean) => Promise<UserCartListResponse>;
  createCart: (data: UserCartCreate) => Promise<UserCartResponse>;
  createManyCart: (data: UserCartBulkCreate) => Promise<void>;
  updateCartItem: (data: UserCartUpdate) => Promise<UserCartResponse | void>;
  removeCartItem: (variationId: string) => Promise<void>;
  clearCartCache: () => void;
};

const calculateDerivedState = (
  cart: UserCartListResponse | undefined
): {
  totalCents: number;
  isAllItemAvailable: boolean;
} => {
  if (!cart) return { totalCents: 0, isAllItemAvailable: true };

  const totalCents = cart.items.reduce((total, item) => {
    if (item.variation.stockQuantity > 0 && !item.stopSelling) {
      return total + item.totalCents;
    }
    return total;
  }, 0);

  const isAllItemAvailable = cart.items.every(
    (item) => item.variation.stockQuantity > 0 && !item.stopSelling
  );

  return { totalCents, isAllItemAvailable };
};

export const useUserCartStore = create<UserCartState>((set, get) => ({
  cart: null,
  totalCents: 0,
  isAllItemAvailable: true,

  async fetchCart(oblige = false): Promise<UserCartListResponse> {
    if (!oblige) {
      const { cart } = get();
      if (cart) return cart;
    }

    try {
      const res = await retrieve(SELF_CART_URL);
      if (!res.success) throw new Error(res.message);

      const cart = res.data as UserCartListResponse;
      set({ cart, ...calculateDerivedState(cart) });
      return cart;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createCart(data: UserCartCreate): Promise<UserCartResponse> {
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
        const updatedItems = [...cart.items];
        if (existingItemIdx !== -1) {
          updatedItems[existingItemIdx] = newItem;
        } else {
          // Push at the top of the cart items since they are sort by most recent
          updatedItems.unshift(newItem);
        }

        const updatedCart = {
          ...cart,
          total: updatedItems.length,
          items: updatedItems,
        };
        set({
          cart: updatedCart,
          ...calculateDerivedState(updatedCart),
        });
      }

      return newItem;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async createManyCart(data: UserCartBulkCreate): Promise<void> {
    try {
      const res = await post(`${SELF_CART_URL}/many`, data);
      if (!res.success) throw new Error(res.message);

      // Re-fetch the cart to ensure consistency
      await get().fetchCart(true);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async updateCartItem(data: UserCartUpdate): Promise<UserCartResponse | void> {
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

          const updatedCart = {
            ...cart,
            total: updatedItems.length,
            items: updatedItems,
          };
          set({
            cart: updatedCart,
            ...calculateDerivedState(updatedCart),
          });
        }
      }

      if (updatedItem) return updatedItem;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async removeCartItem(variationId: string): Promise<void> {
    try {
      const res = await remove(SELF_CART_URL, variationId);
      if (!res.success) throw new Error(res.message);

      const { cart } = get();
      if (cart) {
        const updatedItems = cart.items.filter(
          (item) => item.variation.id !== variationId
        );

        const updatedCart = {
          ...cart,
          total: updatedItems.length,
          items: updatedItems,
        };
        set({
          cart: updatedCart,
          ...calculateDerivedState(updatedCart),
        });
      }
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  clearCartCache(): void {
    set({
      cart: {
        total: 0,
        items: [],
      },
      totalCents: 0,
      isAllItemAvailable: true,
    });
  },
}));
