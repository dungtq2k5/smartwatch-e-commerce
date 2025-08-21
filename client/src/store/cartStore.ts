import { create } from "zustand";
import type {
  UserCartCreate,
  UserCartResponse,
  UserCartListResponse,
} from "../../../common/types.common";
import { formatError, patch, post, remove, retrieve } from "../utils/utils";
import { SELF_CART_URL } from "../configs";
import type { UserCartUpdate } from "../utils/types";

type UserCartState = {
  cart?: UserCartListResponse;
  isFetching?: true;
  fetchErr?: string;
  isLoading?: true;
  modifyingItemId?: string; // Store variationId of the item being updated or removed

  // Derived state
  totalCents: number;
  isAllItemAvailable: boolean;

  fetchCart: () => Promise<void>;
  createCart: (data: UserCartCreate) => Promise<void>;
  updateCartItem: (data: UserCartUpdate) => Promise<void>;
  removeCartItem: (variationId: string) => Promise<void>;
  clearCart: () => void;
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
  // DEV temp data for testing
  // cart: {
  //   total: 2,
  //   items: [
  //     {
  //       quantity: 1,
  //       totalCents: 80617,
  //       stopSelling: false,
  //       createdAt: "2025-08-14T10:32:21.665Z",
  //       updatedAt: "2025-08-14T10:32:21.665Z",
  //       variation: {
  //         id: "689d602b7631ccf8606dbcf7",
  //         name: "Intelligent Rubber Gloves",
  //         color: {
  //           hex: "#924d1c",
  //           name: "black",
  //         },
  //         imageUrls: [
  //           "https://picsum.photos/seed/Uirzj/600/696?grayscale&blur=3",
  //           "https://picsum.photos/seed/dcbqf/600/696?grayscale&blur=3",
  //           "https://picsum.photos/seed/5JfKQ/600/696?grayscale&blur=3",
  //           "https://picsum.photos/seed/HEpWudziJR/600/696",
  //         ],
  //         additionalPriceCents: 674,
  //         stockQuantity: 39,
  //         productModel: {
  //           id: "689d602b7631ccf8606dbcc4",
  //           name: "Tasty Bamboo Cheese iGTVR",
  //           priceCents: 79943,
  //           product: {
  //             id: "689d602b7631ccf8606dbcac",
  //             name: "Licensed Plastic Gloves ZtPfx",
  //             type: "band",
  //             brand: {
  //               id: "689d602b7631ccf8606dbc96",
  //               name: "Erdman LLC j1ymt",
  //               logoUrl: "https://avatars.githubusercontent.com/u/33325766",
  //             },
  //             category: {
  //               id: "689d602b7631ccf8606dbc9c",
  //               name: "Automotive xULiD",
  //             },
  //           },
  //         },
  //       },
  //     },
  //     {
  //       quantity: 2,
  //       totalCents: 126158,
  //       stopSelling: false,
  //       createdAt: "2025-08-14T10:32:10.814Z",
  //       updatedAt: "2025-08-14T10:34:22.878Z",
  //       variation: {
  //         id: "689d602b7631ccf8606dbcd9",
  //         name: "Gorgeous Gold Shoes",
  //         color: {
  //           hex: "#44eceb",
  //           name: "purple",
  //         },
  //         imageUrls: [
  //           "https://picsum.photos/seed/zlyVJ/600/696?grayscale&blur=10",
  //           "https://picsum.photos/seed/rxuRR/600/696?blur=3",
  //           "https://picsum.photos/seed/lMRKHNJX/600/696?blur=8",
  //         ],
  //         additionalPriceCents: 6017,
  //         stockQuantity: 30,
  //         productModel: {
  //           id: "689d602b7631ccf8606dbcb6",
  //           name: "Handmade Bronze Chips 2RkZr",
  //           priceCents: 57062,
  //           product: {
  //             id: "689d602b7631ccf8606dbca8",
  //             name: "Fresh Aluminum Bike Ftkb9",
  //             type: "watch",
  //             brand: {
  //               id: "689d602b7631ccf8606dbc94",
  //               name: "Casper Inc ncyb8",
  //               logoUrl:
  //                 "https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/female/512/58.jpg",
  //             },
  //             category: {
  //               id: "689d602b7631ccf8606dbc99",
  //               name: "Shoes SMI1I",
  //             },
  //           },
  //         },
  //       },
  //     },
  //   ],
  // },
  // totalCents: 99,
  cart: undefined,
  isFetching: undefined,
  fetchErr: undefined,
  isLoading: undefined,
  modifyingItemId: undefined,
  totalCents: 0,
  isAllItemAvailable: true,

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

      const cart = res.data as UserCartListResponse;
      set({ cart, ...calculateDerivedState(cart) });
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

      const { cart } = get();
      if (cart) {
        const newItem = res.data as UserCartResponse;
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

      const { cart } = get();
      if (cart) {
        // If updatedItem is undefined, remove it from the cart, otherwise update it
        const updatedItem = res.data as UserCartResponse | undefined; // Undefined means the item was removed (quantity 0)
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
    } finally {
      set({ modifyingItemId: undefined });
    }
  },

  clearCart(): void {
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
