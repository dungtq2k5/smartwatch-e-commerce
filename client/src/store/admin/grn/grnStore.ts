import { create } from "zustand";
import type {
  GrnCreate,
  GrnResponse,
} from "../../../../../common/types.common";
import { formatError } from "../../../../../common/utils.common";
import { post } from "../../../utils/utils";
import { GRN_URL } from "../../../configs";

type GrnState = {
  createGrn: (grn: GrnCreate) => Promise<GrnResponse>;
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
}));

export default useGrnStore;
