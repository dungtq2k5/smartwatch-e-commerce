import { create } from "zustand";
import type { ProductOsListResponse } from "../../../../common/types.common";
import { PRODUCT_OS_URL } from "../../configs";
import { retrieve } from "../../utils/utils";
import { formatError } from "../../../../common/utils.common";

type ProductOsState = {
  oses: ProductOsListResponse | null;

  fetchOses: () => Promise<ProductOsListResponse>;
};

export const useProductOsStore = create<ProductOsState>((set, get) => ({
  oses: null,

  async fetchOses(): Promise<ProductOsListResponse> {
    const { oses } = get();
    if (oses) return oses;

    try {
      const res = await retrieve(PRODUCT_OS_URL);
      if (!res.success) throw new Error(res.message);

      const oses = res.data as ProductOsListResponse;
      set({ oses });
      return oses;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
