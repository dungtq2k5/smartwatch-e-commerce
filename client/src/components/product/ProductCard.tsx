import { memo } from "react";
import type { ProductResponse } from "../../../../common/types.common";
import defaultProductImg from "../../assets/default-product.webp";
import { centsToUSD } from "../../../../common/utils.common";

const ProductCard = memo(({
  product,
}: Readonly<{ product: ProductResponse }>) => {
  return (
    <div className="card h-100 shadow--g border-0">
      <img
        src={product.imageUrls[0] || defaultProductImg}
        className="card-img-top product-img--g mt-2"
        alt={product.name}
        loading="lazy"
      />
      <div className="card-body d-flex flex-column justify-content-between">
        <p className="card-title">{product.name}</p>
        <p className="card-text small text-muted product-description--g">
          {product.description}
        </p>
        <p className="card-text fw-bold">{centsToUSD(product.basePriceCents)}</p>
      </div>
    </div>
  );
});

export default ProductCard;