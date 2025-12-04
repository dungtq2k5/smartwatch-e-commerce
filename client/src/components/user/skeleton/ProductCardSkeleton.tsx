import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const ProductCardSkeleton = memo(() => {
  return (
    <div className="card h-100 shadow--g border-0" aria-hidden="true">
      <Placeholder
        as="div"
        animation="glow"
        className="card-img-top product-img--g"
      >
        <Placeholder style={{ height: "12em", width: "100%" }} />
      </Placeholder>
      <Placeholder
        as="div"
        animation="glow"
        className="card-body d-flex flex-column"
      >
        <Placeholder as="p" className="card-title">
          <Placeholder xs={8} />
        </Placeholder>
        <Placeholder as="p" className="card-text small">
          <Placeholder xs={12} />
          <Placeholder xs={10} />
        </Placeholder>
        <Placeholder as="p" className="card-text fw-bold mt-auto">
          <Placeholder xs={4} />
        </Placeholder>
      </Placeholder>
    </div>
  );
});

export default ProductCardSkeleton;
