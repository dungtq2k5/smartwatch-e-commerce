import type {
  InventoryMovementTypeListResponse,
  InventoryMovementTypeResponse,
} from "../../../../../common/types.common";
import { retrieve } from "../../../utils/utils";
import { INVENTORY_MOVEMENT_TYPES_URL } from "../../../configs";
import { formatError } from "../../../../../common/utils.common";
import { create } from "zustand";

type MovementTypeState = {
  movementTypes: InventoryMovementTypeListResponse | null;

  fetchMovementTypes: () => Promise<InventoryMovementTypeListResponse>;

  getMovementType: (id: string) => InventoryMovementTypeResponse | undefined;
};

const useInventoryMovementTypeStore = create<MovementTypeState>((set, get) => ({
  movementTypes: null,

  async fetchMovementTypes(): Promise<InventoryMovementTypeListResponse> {
    const { movementTypes } = get();
    if (movementTypes) return structuredClone(movementTypes);

    try {
      const res = await retrieve(INVENTORY_MOVEMENT_TYPES_URL);
      if (!res.success) throw new Error(res.message);

      const types = res.data as InventoryMovementTypeListResponse;
      set({ movementTypes: types });
      return structuredClone(types);
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  getMovementType(id: string): InventoryMovementTypeResponse | undefined {
    return get().movementTypes?.types.find((type) => type.id === id);
  },
}));

export default useInventoryMovementTypeStore;
