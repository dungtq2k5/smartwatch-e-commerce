import { memo } from "react";
import type {
  OrderResponse,
  OrderReturnResponse,
} from "../../../../../common/types.common";
import defaultProductImg from "../../../assets/default-product.webp";
import useOrderStore from "../../../store/user/orderStore";
import SlashColor from "../../common/SlashColor";
import { centsToUSD } from "../../../../../common/utils.common";

const PurchaseItem = memo(
  ({
    type,
    item,
    option = {
      fadedForReturned: true,
    },
  }: Readonly<
    (
      | {
          type: "order";
          item: OrderResponse["items"][0];
        }
      | {
          type: "return";
          item: OrderReturnResponse["items"][0];
        }
    ) & {
      option?: {
        fadedForReturned: boolean;
      };
    }
  >) => {
    const { checkItemIsReturned } = useOrderStore();

    const isReturned =
      type === "order" && option?.fadedForReturned
        ? checkItemIsReturned(item)
        : false;

    const displayName = `${item.variation.productModel.product.name} - ${item.variation.productModel.name}`;

    return (
      <div className="d-flex">
        <img
          src={item.variation.imageUrls[0] || defaultProductImg}
          alt={displayName}
          loading="lazy"
          className={`purchase-item-img--g me-3 rounded ${
            isReturned ? "opacity-50" : ""
          }`}
        />
        <div className="flex-grow-1">
          <p className="mb-1 fw-semibold">
            <span className={`${isReturned ? "opacity-50" : ""}`}>
              {displayName}
            </span>
            {isReturned && (
              <span className="badge bg-primary ms-2 uppercase">
                Returned/Refunded
              </span>
            )}
          </p>
          <div
            className={`d-flex align-items-center small text-muted mb-2 ${
              isReturned ? "opacity-50" : ""
            }`}
          >
            <SlashColor
              hexColor={item.variation.color.hex}
              size="big"
              className="me-1"
            />
            <span>{`${item.variation.name} - ${item.variation.color.name}`}</span>
          </div>
          <p className={`small mb-0 ${isReturned ? "opacity-50" : ""}`}>
            x{item.quantity}
          </p>
        </div>
        <p
          className={`mb-0 text-muted small text-end align-self-center ${
            isReturned ? "opacity-50" : ""
          }`}
        >
          {centsToUSD(item.totalCents / item.quantity)} for each
        </p>
      </div>
    );
  }
);

export default PurchaseItem;
