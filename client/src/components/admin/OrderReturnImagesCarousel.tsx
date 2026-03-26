import { memo, useCallback, useMemo, useState } from "react";
import type { JSX } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import defaultProductImg from "../../assets/default-product.webp";

type OrderReturnImagesCarouselProps = Readonly<{
  imageUrls?: string[] | null;
  defaultImage?: string;
  className?: string;
}>;

const OrderReturnImagesCarousel = memo(
  ({
    imageUrls = [],
    defaultImage = defaultProductImg,
    className = "",
  }: OrderReturnImagesCarouselProps) => {
    const [mainImgIdx, setMainImgIdx] = useState<number>(0);

    // Use provided images or default
    const imgs = useMemo((): string[] => {
      return imageUrls && imageUrls.length > 0 ? imageUrls : [defaultImage];
    }, [defaultImage, imageUrls]);

    const handlePrevImage = useCallback((): void => {
      setMainImgIdx((prev) => (prev === 0 ? imgs.length - 1 : prev - 1));
    }, [imgs.length]);

    const handleNextImage = useCallback((): void => {
      setMainImgIdx((prev) => (prev === imgs.length - 1 ? 0 : prev + 1));
    }, [imgs.length]);

    const genThumbnails = useCallback((): JSX.Element[] => {
      return imgs.map((url, i) => (
        <button
          key={`${url}-${i}`}
          type="button"
          className="border-0 bg-transparent p-0 flex-shrink-0 position-relative"
          onClick={() => setMainImgIdx(i)}
          style={{
            width: "60px",
            height: "70px",
          }}
          title={`Image ${i + 1}`}
        >
          <img
            src={url}
            alt={`thumbnail-${i}`}
            className={`w-100 h-100 object-fit-cover rounded ${
              mainImgIdx === i ? "border border-2 border-primary" : ""
            }`}
          />
          {/* Image count badge on last thumbnail */}
          {i === imgs.length - 1 && imgs.length > 1 && (
            <span
              className="badge bg-dark position-absolute bottom-0 end-0"
              style={{ fontSize: "0.7rem", transform: "translate(2px, 2px)" }}
            >
              {mainImgIdx + 1}/{imgs.length}
            </span>
          )}
        </button>
      ));
    }, [imgs, mainImgIdx]);

    return (
      <div className={`d-flex flex-column gap-2 ${className}`}>
        {/* Main Image Display */}
        <div
          className="position-relative rounded"
          style={{
            backgroundColor: "#f0f0f0",
            aspectRatio: "2/3",
            overflow: "hidden",
          }}
        >
          <img
            src={imgs[mainImgIdx]}
            alt="main"
            className="w-100 h-100 object-fit-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultImage;
            }}
          />

          {/* Navigation arrows - only show if multiple images */}
          {imgs.length > 1 && (
            <>
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute start-0 top-50 translate-middle-y ms-2"
                onClick={handlePrevImage}
                title="Previous image"
              >
                <FontAwesomeIcon icon={faChevronLeft} size="sm" />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light position-absolute end-0 top-50 translate-middle-y me-2"
                onClick={handleNextImage}
                title="Next image"
              >
                <FontAwesomeIcon icon={faChevronRight} size="sm" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Selector */}
        {imgs.length > 1 && (
          <div className="d-flex flex-row gap-1 overflow-auto pb-1">
            {genThumbnails()}
          </div>
        )}
      </div>
    );
  },
);

OrderReturnImagesCarousel.displayName = "OrderReturnImagesCarousel";

export default OrderReturnImagesCarousel;
