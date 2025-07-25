import { memo } from "react";

const ProductCardSkeleton = memo(() => {
  return (
    <div className="card h-100 shadow--g border-0" aria-hidden="true">
      <div
        className="card-img-top product-img--g mt-2 placeholder"
        style={{ height: "12em", width: "100%" }}
      ></div>
      <div className="card-body d-flex flex-column placeholder-glow">
        <p className="card-title">
          <span className="placeholder col-8"></span>
        </p>
        <p className="card-text small">
          <span className="placeholder col-12"></span>
          <span className="placeholder col-10"></span>
        </p>
        <p className="card-text fw-bold mt-auto">
          <span className="placeholder col-4"></span>
        </p>
      </div>
    </div>
  );
});

export default ProductCardSkeleton;
