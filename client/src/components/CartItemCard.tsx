import { memo } from "react";
import type { UserCartResponse } from "../../../common/types.common";
import defaultProductImage from "../assets/default-product.webp";
import { Link } from "react-router-dom";
import SlashColor from "./SlashColor";
import { centsToUSD } from "../../../common/utils.common";
import SmallSpinner from "./SmallSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { MAX_CART_ITEM_QUANTITY_SELECT } from "../configs";

const CartItemCard = memo(
  ({
    item,
    isLoading,
    onUpdate,
    onRemove,
  }: Readonly<{
    item: UserCartResponse;
    isLoading: boolean;
    onUpdate: (
      e: React.ChangeEvent<HTMLSelectElement>,
      variationId: string
    ) => void;
    onRemove: (variationId: string) => void;
  }>) => {
    const isItemAvailable =
      item.variation.stockQuantity > 0 && !item.stopSelling;
    const productDisplayName = `${item.variation.productModel.product.name} - ${item.variation.productModel.name}`;
    const variationDisplayName = `${item.variation.name} - ${item.variation.color.name}`;

    return (
      <div className="card shadow-sm" key={item.variation.id}>
        <div className="card-body">
          <div className="row g-3">
            {/* Image */}
            <div className="col-md-3">
              <img
                src={item.variation.imageUrls[0] || defaultProductImage}
                alt={productDisplayName}
                className="img-fluid rounded cart-item-img--g"
                loading="lazy"
              />
            </div>
            {/* Info */}
            <div className="col-md-9">
              <div className="d-flex justify-content-between">
                <div>
                  <p className="card-title h5 mb-1">
                    {isItemAvailable ? (
                      <Link
                        to={`/products/${item.variation.productModel.product.id}?modelId=${item.variation.productModel.id}&variationId=${item.variation.id}`}
                        className="text-decoration-none text-dark"
                      >
                        {productDisplayName}
                      </Link>
                    ) : (
                      productDisplayName
                    )}
                  </p>
                  <p className="card-text small text-muted mb-2">
                    <SlashColor
                      hexColor={item.variation.color.hex}
                      size="big"
                      className="me-1"
                    />
                    {variationDisplayName}
                  </p>
                  <p className="card-text fw-bold">
                    {centsToUSD(
                      item.variation.additionalPriceCents +
                        item.variation.productModel.priceCents
                    )}{" "}
                    USD
                  </p>
                </div>
                <div>
                  {isLoading ? (
                    <SmallSpinner />
                  ) : (
                    <button
                      type="button"
                      className="btn border-0"
                      aria-label="Remove item"
                      onClick={() => onRemove(item.variation.id)}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  )}
                </div>
              </div>

              {!isItemAvailable ? (
                <div className="alert alert-danger small p-2 mt-2">
                  We are sorry that this item is{" "}
                  {item.stopSelling ? "no longer available" : "out of stock"}.
                </div>
              ) : (
                <div className="d-flex align-items-center mt-2">
                  <label
                    htmlFor={`quantity-${item.variation.id}`}
                    className="form-label me-2 mb-0 small"
                  >
                    Quantity
                  </label>
                  {isLoading ? (
                    <SmallSpinner />
                  ) : (
                    <>
                      <select
                        className="form-select form-select-sm w-auto"
                        id={`quantity-${item.variation.id}`}
                        name={`quantity-${item.variation.id}`}
                        value={item.quantity}
                        onChange={(e) => onUpdate(e, item.variation.id)}
                        disabled={item.variation.stockQuantity === 1}
                      >
                        {Array.from(
                          {
                            length: Math.min(
                              item.variation.stockQuantity,
                              MAX_CART_ITEM_QUANTITY_SELECT
                            ),
                          },
                          (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          )
                        )}
                      </select>
                      {item.variation.stockQuantity === 1 && (
                        <p className="mb-0 ms-2 text-danger small">
                          (only one item left)
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default CartItemCard;
