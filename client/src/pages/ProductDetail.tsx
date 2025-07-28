import type { ProductResponse } from "../../../common/types.common";
import { centsToUSD } from "../../../common/utils.common";

export default function ProductDetail() {
  // DEV temp for design UI
  const product: ProductResponse = {
    id: "6882537c4daf8e6859d6ece6",
    name: "Handmade Metal Mouse HdqnP",
    brandId: "6882537b4daf8e6859d6eccb",
    categoryId: "6882537b4daf8e6859d6ecd0",
    imageUrls: [
      "https://picsum.photos/seed/VjMKW/600/696?grayscale",
      "https://picsum.photos/seed/3Dx3gKT/600/696?grayscale",
    ],
    description:
      "Absque vestrum ars alienus tabgo absque cimentarius. Architecto sonitus artificiose averto aegrus adsidue templum caelum. Utilis auditor amiculum.",
    createdBy: "688253704daf8e6859d6ebf1",
    createdAt: "2025-07-24T15:38:36.122Z",
    updatedAt: "2025-07-24T15:38:36.122Z",
    stopSelling: false,
    basePriceCents: 27276,
  };

  // TODO skeleton loading for product details
  // TODO fetch product details by id in productStore
  // TODO handle if stop selling is true
  // TODO next...
  return (
    <main className="container--g">
      {/* Top section */}
      <div>
        {/* Left box - Images */}
        <div>
          {/* Images list picker */}
          <ul>
            {product.imageUrls.map((url, i) => (
              <li key={i++}>
                <img src={url} alt="product"/>
              </li>
            ))}
          </ul>
          {/* Main image */}
          <img src={product.imageUrls[0]} alt="product"/>
        </div>
        {/* Right box */}
        <div>
          {/* General info */}
          <div>
            <h1>{product.name}</h1>
            <p>{centsToUSD(product.basePriceCents)}</p>
            <p>{product.description}</p>
          </div>
          {/* Models picker */}
          <div>
            <p>Watch size</p>
            <ul>
              <li>38mm</li>
              <li>40mm</li>
              <li>42mm</li>
              <li>44mm</li>
            </ul>
          </div>
          {/* Colors picker */}
          <div>
            <p>Color</p>
            <ul>
              <li>Black</li>
              <li>White</li>
              <li>Red</li>
              <li>Blue</li>
            </ul>
          </div>
          {/* Bands */}
          <div>
            {/* Bands picker */}
            <div>
              <p>Band</p>
              <ul>
                <li>Leather</li>
                <li>Metal</li>
                <li>Silicone</li>
              </ul>
            </div>
            {/* display  */}
            <div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
