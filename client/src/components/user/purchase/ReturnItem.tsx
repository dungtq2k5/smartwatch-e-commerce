import { memo } from "react";
import type { OrderReturnResponse } from "../../../../../common/types.common";
import defaultProductImg from "../../../assets/default-product.webp";
import SlashColor from "../../common/SlashColor";
import { centsToUSD } from "../../../../../common/utils.common";

const ReturnItem = memo(
  ({
    item,
  }: Readonly<{
    item: OrderReturnResponse["items"][0];
  }>) => {
    const displayName = `${item.variation.productModel.product.name} - ${item.variation.productModel.name}`;

    return (
      <div className="d-flex">
        <img
          src={item.variation.imageUrls[0] || defaultProductImg}
          alt={displayName}
          loading="lazy"
          className={`purchase-item-img--g me-3 rounded`}
        />
        <div className="flex-grow-1">
          <p className="mb-1 fw-semibold">{displayName}</p>
          <div className={`d-flex align-items-center small text-muted mb-2`}>
            <SlashColor
              hexColor={item.variation.color.hex}
              size="big"
              className="me-1"
            />
            <span>{`${item.variation.name} - ${item.variation.color.name}`}</span>
          </div>
          <p className={`small mb-0`}>x{item.quantity}</p>
        </div>
        <p className={`mb-0 text-muted small text-end align-self-center`}>
          {centsToUSD(item.totalCents / item.quantity)} for each
        </p>
      </div>
    );
  }
);

export default ReturnItem;
