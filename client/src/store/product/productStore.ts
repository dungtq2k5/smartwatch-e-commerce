import { create } from "zustand";
import type {
  ProductDetailQuery,
  ProductDetailResponse,
  ProductListResponse,
  ProductSearchQuery,
} from "../../../../common/types.common";
import { formatError, retrieve } from "../../utils/utils";
import { PRODUCT_SEARCH_URL, PRODUCT_URL } from "../../configs";
import { removeOddSpaces } from "../../../../common/utils.common";

type ProductState = {
  fetchProducts: (query?: ProductSearchQuery) => Promise<ProductListResponse>;

  fetchProductDetail: (
    productId: string,
    query?: ProductDetailQuery
  ) => Promise<ProductDetailResponse>;
};

export const useProductStore = create<ProductState>(() => ({
  async fetchProducts(
    query?: ProductSearchQuery
  ): Promise<ProductListResponse> {
    const queryString = new URLSearchParams();

    if (query) {
      if (query.limit) queryString.set("limit", query.limit);
      if (query.offset) queryString.set("offset", query.offset);
      if (query.searchTerm && removeOddSpaces(query.searchTerm))
        queryString.set("searchTerm", query.searchTerm);
      if (query.brandId) queryString.set("brandId", query.brandId);
      if (query.categoryId) queryString.set("categoryId", query.categoryId);
      if (query.stopSelling)
        queryString.set("stopSelling", query.stopSelling);
      if (query.priceCentsMin)
        queryString.set("priceCentsMin", query.priceCentsMin);
      if (query.priceCentsMax)
        queryString.set("priceCentsMax", query.priceCentsMax);
      if (query.sortBy) queryString.set("sortBy", query.sortBy);
    }

    try {
      const res = await retrieve(
        `${PRODUCT_SEARCH_URL}?${queryString.toString()}`
      );
      if (!res.success) throw new Error(res.message);

      return res.data;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },

  async fetchProductDetail(
    productId: string,
    query?: ProductDetailQuery
  ): Promise<ProductDetailResponse> {
    try {
      const queryString = new URLSearchParams();

      if (query) {
        if (query.modelStopSelling) {
          queryString.set("modelStopSelling", query.modelStopSelling);
        }
        if (query.variationStopSelling) {
          queryString.set("variationStopSelling", query.variationStopSelling);
        }
      }

      const res = await retrieve(
        `${PRODUCT_URL}/${productId}/details?${queryString.toString()}`
      );
      // Temp for design UI
      // const res: SuccessResponse = {
      //   success: true,
      //   message: "Product details fetched successfully",
      //   data: {
      //     id: "688f27afab9f07e6683202fa",
      //     name: "Generic Wooden Shoes vlBi3",
      //     type: "band",
      //     brand: {
      //       id: "688f27aeab9f07e6683202e8",
      //       name: "Doyle, Muller and Johns IviPj",
      //       description:
      //         "Adamo compono summisse tenax velociter quaerat vigilo textilis.",
      //       createdBy: "688f27a5ab9f07e66832020a",
      //       createdAt: "2025-08-03T09:11:10.512Z",
      //       updatedAt: "2025-08-03T09:11:10.512Z",
      //       logoUrl:
      //         "https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/female/512/45.jpg",
      //     },
      //     category: {
      //       id: "688f27aeab9f07e6683202ec",
      //       name: "Garden t1TtE",
      //       description: "Undique contra vicinus.",
      //       createdBy: "688f27a5ab9f07e66832020a",
      //       createdAt: "2025-08-03T09:11:10.717Z",
      //       updatedAt: "2025-08-03T09:11:10.717Z",
      //     },
      //     imageUrls: [
      //       "https://picsum.photos/seed/jUKqs/600/696?grayscale&blur=10",
      //       "https://picsum.photos/seed/96bSXIk/600/696?grayscale&blur=1",
      //       "https://picsum.photos/seed/yuB7O/600/696?blur=10",
      //       "https://picsum.photos/seed/3KNYMh/600/696?blur=5",
      //     ],
      //     basePriceCents: 14928,
      //     description:
      //       "Amiculum ipsum pax adficio verus tabernus vulariter taedium comburo depraedor. Veniam adfero tempora accusantium alias terreo dapifer abundans studio asperiores. Numquam auctus defessus ventito conitor vestigium absens acerbitas.",
      //     createdBy: "688f27a5ab9f07e66832020a",
      //     createdAt: "2025-08-03T09:11:11.127Z",
      //     updatedAt: "2025-08-03T09:11:11.127Z",
      //     stopSelling: false,
      //     models: {
      //       total: 3,
      //       models: [
      //         {
      //           id: "688f27afab9f07e668320308",
      //           productId: "688f27afab9f07e6683202fa",
      //           name: "Bespoke Gold Hat rkBbc",
      //           priceCents: 104227,
      //           stockPriceCents: 99910,
      //           imageUrls: [
      //             "https://picsum.photos/seed/uaxXanviw/600/696?grayscale&blur=1",
      //             "https://picsum.photos/seed/M5oytiXOJ/600/696?grayscale&blur=1",
      //             "https://picsum.photos/seed/xWeyg/600/696?blur=7",
      //             "https://picsum.photos/seed/Y9P5LJS3L/600/696?blur=4",
      //             "https://picsum.photos/seed/jsTDb8RH1/600/696?blur=1",
      //           ],
      //           feature: {
      //             speakerAndMicrophone: false,
      //             waterResistance: null,
      //             utilities: {
      //               healths: [
      //                 "Blood Oxygen Monitoring",
      //                 "Fitness Age",
      //                 "Body Composition Analysis",
      //               ],
      //               sports: ["Gym Workouts", "Pilates", "Walking"],
      //               specials: [
      //                 "Find My Phone",
      //                 "Contactless Payments",
      //                 "Music Playback",
      //               ],
      //               others: [],
      //             },
      //             supportedAppsForNotifications: ["Telegram", "Spotify"],
      //           },
      //           config: {
      //             connectivities: ["GPS"],
      //             camera: {
      //               resolutionMp: 18,
      //               features: ["HDR", "Burst Mode"],
      //             },
      //             chipset: "Snapdragon",
      //             memory: {
      //               ramBytes: 1400371924,
      //               storageBytes: 6715989588,
      //             },
      //             compatiblePhoneOs: ["Android", "KaiOS", "iOS"],
      //             appsConnect: ["Samsung Health"],
      //             sensors: ["Barometer", "GPS", "Heart Rate"],
      //             os: {
      //               id: "688f27aeab9f07e6683202f6",
      //               name: "Frozen LsR1Q",
      //               description: "Cariosus vulticulus ratione tero comminor.",
      //               createdBy: "688f27a5ab9f07e66832020a",
      //               createdAt: "2025-08-03T09:11:10.916Z",
      //               updatedAt: "2025-08-03T09:11:10.916Z",
      //               logoUrl: "https://avatars.githubusercontent.com/u/15830652",
      //             },
      //           },
      //           battery: {
      //             capacityMah: 507,
      //             timeOnline: {
      //               aodOnMin: 171,
      //               aodOffMin: 183,
      //               typicalUsageMin: 222,
      //               standByMin: 183,
      //             },
      //             timeFullChargeMin: 114,
      //             chargingType: "Magnetic Charging",
      //           },
      //           screen: {
      //             display: {
      //               diagonalSizeInch: 2.37708993885283,
      //               displayType: "Retina",
      //             },
      //             brightness: {
      //               minNits: 295,
      //               maxNits: 1573,
      //             },
      //             resolution: {
      //               wPx: 3686,
      //               hPx: 1615,
      //             },
      //             glassMaterial: "Gorilla Glass",
      //             bezelMaterial: "plastic",
      //             isCircular: false,
      //             diameterMm: null,
      //             dimension: {
      //               wMm: 38,
      //               hMm: 32,
      //               thicknessMm: 13,
      //             },
      //             shape: "rectangular",
      //           },
      //           caseMaterial: "titanium",
      //           watchWeightMg: 59,
      //           compatibleBandLugWidthMm: 20,
      //           releaseDate: "2025-06-09T14:37:20.720Z",
      //           createdBy: "688f27a5ab9f07e66832020a",
      //           createdAt: "2025-08-03T09:11:11.356Z",
      //           updatedAt: "2025-08-03T09:11:11.356Z",
      //           stopSelling: false,
      //           variations: {
      //             total: 1,
      //             variations: [
      //               {
      //                 id: "688f27afab9f07e66832032c",
      //                 productModelId: "688f27afab9f07e668320308",
      //                 name: "Sleek Bamboo Shirt",
      //                 color: {
      //                   hex: "#fbc9e1",
      //                   name: "cyan",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/OIIwnXOXW/600/696?grayscale&blur=4",
      //                   "https://picsum.photos/seed/Aw4zBT/600/696",
      //                   "https://picsum.photos/seed/paPT2/600/696?blur=7",
      //                   "https://picsum.photos/seed/KD8zYK/600/696?grayscale&blur=6",
      //                 ],
      //                 additionalPriceCents: 1939,
      //                 band: {
      //                   widthMm: 20,
      //                   lugWidthMm: 20,
      //                   material: "metal",
      //                   colors: [
      //                     {
      //                       hex: "#44cbe0",
      //                       name: "mint green",
      //                     },
      //                   ],
      //                   claspType: "magnetic",
      //                   adjustableRange: {
      //                     minMm: 150,
      //                     maxMm: 208,
      //                   },
      //                   style: "sport",
      //                   quickRelease: true,
      //                   waterResistance: true,
      //                   hypoallergenic: true,
      //                   weightMg: 21,
      //                 },
      //                 stockQuantity: 15,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.598Z",
      //                 updatedAt: "2025-08-03T09:11:11.598Z",
      //                 stopSelling: false,
      //               },
      //             ],
      //           },
      //         },
      //         {
      //           id: "688f27afab9f07e668320306",
      //           productId: "688f27afab9f07e6683202fa",
      //           name: "Fresh Bamboo Soap oaUbD",
      //           priceCents: 43008,
      //           stockPriceCents: 39110,
      //           imageUrls: [
      //             "https://picsum.photos/seed/2TFCeZ6d/600/696?blur=5",
      //             "https://picsum.photos/seed/Ng5JL4Gg/600/696?blur=6",
      //           ],
      //           feature: {
      //             speakerAndMicrophone: false,
      //             waterResistance: null,
      //             utilities: null,
      //             supportedAppsForNotifications: ["Spotify"],
      //           },
      //           config: {
      //             connectivities: ["Bluetooth"],
      //             camera: null,
      //             chipset: "Snapdragon",
      //             memory: {
      //               ramBytes: 1779388415,
      //               storageBytes: 22997150552,
      //             },
      //             compatiblePhoneOs: ["Windows Phone"],
      //             appsConnect: ["Apple Health", "Runkeeper"],
      //             sensors: ["Gyroscope"],
      //             os: {
      //               id: "688f27aeab9f07e6683202f7",
      //               name: "Sleek qPYOq",
      //               description:
      //                 "Clam ambulo uberrime cognomen adsuesco derideo.",
      //               createdBy: "688f27a5ab9f07e66832020a",
      //               createdAt: "2025-08-03T09:11:10.916Z",
      //               updatedAt: "2025-08-03T09:11:10.916Z",
      //               logoUrl:
      //                 "https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/female/512/23.jpg",
      //             },
      //           },
      //           battery: {
      //             capacityMah: 3561,
      //             timeOnline: {
      //               aodOnMin: 99,
      //               aodOffMin: 79,
      //               typicalUsageMin: 109,
      //               standByMin: 116,
      //             },
      //             timeFullChargeMin: 171,
      //             chargingType: "Solar Charging",
      //           },
      //           screen: {
      //             display: {
      //               diagonalSizeInch: 2.035770432818711,
      //               displayType: "OLED",
      //             },
      //             brightness: {
      //               minNits: 688,
      //               maxNits: 1770,
      //             },
      //             resolution: {
      //               wPx: 2533,
      //               hPx: 864,
      //             },
      //             glassMaterial: "Plastic",
      //             bezelMaterial: "ceramic",
      //             isCircular: false,
      //             diameterMm: null,
      //             dimension: {
      //               wMm: 36,
      //               hMm: 48,
      //               thicknessMm: 5,
      //             },
      //             shape: "rectangular",
      //           },
      //           caseMaterial: "stainless steel",
      //           watchWeightMg: 80,
      //           compatibleBandLugWidthMm: 18,
      //           releaseDate: "2025-01-28T21:41:13.827Z",
      //           createdBy: "688f27a5ab9f07e66832020a",
      //           createdAt: "2025-08-03T09:11:11.355Z",
      //           updatedAt: "2025-08-03T09:11:11.355Z",
      //           stopSelling: false,
      //           variations: {
      //             total: 3,
      //             variations: [
      //               {
      //                 id: "688f27afab9f07e668320329",
      //                 productModelId: "688f27afab9f07e668320306",
      //                 name: "Small Cotton Fish",
      //                 color: {
      //                   hex: "#14961a",
      //                   name: "orange",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/CLRfHZm/600/696?grayscale&blur=2",
      //                   "https://picsum.photos/seed/gDjsE6nbV/600/696?blur=4",
      //                   "https://picsum.photos/seed/Kmb7AKy/600/696?blur=7",
      //                   "https://picsum.photos/seed/sC0IH0/600/696?blur=3",
      //                   "https://picsum.photos/seed/xBtsflLT8M/600/696?grayscale&blur=7",
      //                 ],
      //                 additionalPriceCents: 840,
      //                 band: {
      //                   widthMm: 18,
      //                   lugWidthMm: 18,
      //                   material: "silicone",
      //                   colors: [
      //                     {
      //                       hex: "#2fea88",
      //                       name: "violet",
      //                     },
      //                   ],
      //                   claspType: "snap",
      //                   adjustableRange: {
      //                     minMm: 144,
      //                     maxMm: 177,
      //                   },
      //                   style: "luxury",
      //                   quickRelease: true,
      //                   waterResistance: true,
      //                   hypoallergenic: false,
      //                   weightMg: 31,
      //                 },
      //                 stockQuantity: 17,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.597Z",
      //                 updatedAt: "2025-08-03T09:11:11.597Z",
      //                 stopSelling: false,
      //               },
      //               {
      //                 id: "688f27afab9f07e668320328",
      //                 productModelId: "688f27afab9f07e668320306",
      //                 name: "Modern Gold Chicken",
      //                 color: {
      //                   hex: "#60df03",
      //                   name: "olive",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/PI89s/600/696?blur=2",
      //                 ],
      //                 additionalPriceCents: 4308,
      //                 band: {
      //                   widthMm: 18,
      //                   lugWidthMm: 18,
      //                   material: "leather",
      //                   colors: [
      //                     {
      //                       hex: "#5a2dae",
      //                       name: "orange",
      //                     },
      //                   ],
      //                   claspType: "deployant",
      //                   adjustableRange: {
      //                     minMm: 141,
      //                     maxMm: 206,
      //                   },
      //                   style: "smart",
      //                   quickRelease: true,
      //                   waterResistance: false,
      //                   hypoallergenic: true,
      //                   weightMg: 29,
      //                 },
      //                 stockQuantity: 27,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.597Z",
      //                 updatedAt: "2025-08-03T09:11:11.597Z",
      //                 stopSelling: false,
      //               },
      //               {
      //                 id: "688f27afab9f07e668320327",
      //                 productModelId: "688f27afab9f07e668320306",
      //                 name: "Handcrafted Wooden Bike",
      //                 color: {
      //                   hex: "#c8bdf7",
      //                   name: "pink",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/FCdSP/600/696?blur=4",
      //                 ],
      //                 additionalPriceCents: 7005,
      //                 band: {
      //                   widthMm: 18,
      //                   lugWidthMm: 18,
      //                   material: "metal",
      //                   colors: [
      //                     {
      //                       hex: "#ddd2e0",
      //                       name: "violet",
      //                     },
      //                   ],
      //                   claspType: "velcro",
      //                   adjustableRange: {
      //                     minMm: 160,
      //                     maxMm: 199,
      //                   },
      //                   style: "casual",
      //                   quickRelease: false,
      //                   waterResistance: false,
      //                   hypoallergenic: false,
      //                   weightMg: 37,
      //                 },
      //                 stockQuantity: 5,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.597Z",
      //                 updatedAt: "2025-08-03T09:11:11.597Z",
      //                 stopSelling: false,
      //               },
      //             ],
      //           },
      //         },
      //         {
      //           id: "688f27afab9f07e668320307",
      //           productId: "688f27afab9f07e6683202fa",
      //           name: "Recycled Aluminum Sausages Ua8N1",
      //           priceCents: 77427,
      //           stockPriceCents: 67533,
      //           imageUrls: [
      //             "https://picsum.photos/seed/uVedmvXsSv/600/696?grayscale&blur=7",
      //             "https://picsum.photos/seed/rXq91/600/696?blur=10",
      //           ],
      //           feature: {
      //             speakerAndMicrophone: false,
      //             waterResistance: {
      //               rating: "IP68",
      //               description:
      //                 "Taedium admoneo canis depraedor degero depono tenax.",
      //             },
      //             utilities: null,
      //             supportedAppsForNotifications: [
      //               "Telegram",
      //               "Email",
      //               "Facebook",
      //             ],
      //           },
      //           config: {
      //             connectivities: ["Cellular"],
      //             camera: null,
      //             chipset: "Kirin",
      //             memory: {
      //               ramBytes: 602650104,
      //               storageBytes: 18999781212,
      //             },
      //             compatiblePhoneOs: ["HarmonyOS", "Windows Phone", "iOS"],
      //             appsConnect: ["Samsung Health"],
      //             sensors: ["Heart Rate", "Barometer"],
      //             os: {
      //               id: "688f27aeab9f07e6683202f5",
      //               name: "Refined ZALAZ",
      //               description:
      //                 "Saepe ager cura odio veritatis carcer totidem ventus labore.",
      //               createdBy: "688f27a5ab9f07e66832020a",
      //               createdAt: "2025-08-03T09:11:10.916Z",
      //               updatedAt: "2025-08-03T09:11:10.916Z",
      //               logoUrl: "https://avatars.githubusercontent.com/u/84471072",
      //             },
      //           },
      //           battery: {
      //             capacityMah: 2362,
      //             timeOnline: {
      //               aodOnMin: 81,
      //               aodOffMin: 107,
      //               typicalUsageMin: 105,
      //               standByMin: 68,
      //             },
      //             timeFullChargeMin: 151,
      //             chargingType: "Wireless Charging",
      //           },
      //           screen: {
      //             display: {
      //               diagonalSizeInch: 1.6529770233100787,
      //               displayType: "Super AMOLED",
      //             },
      //             brightness: {
      //               minNits: 271,
      //               maxNits: 1692,
      //             },
      //             resolution: {
      //               wPx: 2192,
      //               hPx: 924,
      //             },
      //             glassMaterial: "Dragontrail Glass",
      //             bezelMaterial: "plastic",
      //             isCircular: false,
      //             diameterMm: null,
      //             dimension: {
      //               wMm: 39,
      //               hMm: 37,
      //               thicknessMm: 12,
      //             },
      //             shape: "rectangular",
      //           },
      //           caseMaterial: "plastic",
      //           watchWeightMg: 82,
      //           compatibleBandLugWidthMm: 18,
      //           releaseDate: "2025-04-26T13:26:44.211Z",
      //           createdBy: "688f27a5ab9f07e66832020a",
      //           createdAt: "2025-08-03T09:11:11.356Z",
      //           updatedAt: "2025-08-03T09:11:11.356Z",
      //           stopSelling: false,
      //           variations: {
      //             total: 2,
      //             variations: [
      //               {
      //                 id: "688f27afab9f07e66832032a",
      //                 productModelId: "688f27afab9f07e668320307",
      //                 name: "Tasty Bamboo Towels",
      //                 color: {
      //                   hex: "#8ceefb",
      //                   name: "maroon",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/VNUI24EL/600/696?grayscale&blur=6",
      //                   "https://picsum.photos/seed/2Sl1wS631/600/696?blur=2",
      //                   "https://picsum.photos/seed/Ml4TUCe7f0/600/696?blur=2",
      //                   "https://picsum.photos/seed/S9ksVAmiW7/600/696?grayscale",
      //                   "https://picsum.photos/seed/0XNKV/600/696?blur=7",
      //                 ],
      //                 additionalPriceCents: 2187,
      //                 band: {
      //                   widthMm: 18,
      //                   lugWidthMm: 18,
      //                   material: "plastic",
      //                   colors: [
      //                     {
      //                       hex: "#7c511d",
      //                       name: "turquoise",
      //                     },
      //                   ],
      //                   claspType: "magnetic",
      //                   adjustableRange: {
      //                     minMm: 152,
      //                     maxMm: 171,
      //                   },
      //                   style: "sport",
      //                   quickRelease: true,
      //                   waterResistance: false,
      //                   hypoallergenic: true,
      //                   weightMg: 44,
      //                 },
      //                 stockQuantity: 8,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.597Z",
      //                 updatedAt: "2025-08-03T09:11:11.597Z",
      //                 stopSelling: false,
      //               },
      //               {
      //                 id: "688f27afab9f07e66832032b",
      //                 productModelId: "688f27afab9f07e668320307",
      //                 name: "Refined Bamboo Ball",
      //                 color: {
      //                   hex: "#fba84b",
      //                   name: "grey",
      //                 },
      //                 imageUrls: [
      //                   "https://picsum.photos/seed/V6cA1d3T/600/696?blur=4",
      //                   "https://picsum.photos/seed/CA6Ij/600/696?grayscale&blur=4",
      //                   "https://picsum.photos/seed/WoOqR6Ca/600/696?blur=2",
      //                   "https://picsum.photos/seed/njrda9cEE/600/696?blur=4",
      //                 ],
      //                 additionalPriceCents: 3460,
      //                 band: {
      //                   widthMm: 18,
      //                   lugWidthMm: 18,
      //                   material: "metal",
      //                   colors: [
      //                     {
      //                       hex: "#ebcedc",
      //                       name: "teal",
      //                     },
      //                   ],
      //                   claspType: "magnetic",
      //                   adjustableRange: {
      //                     minMm: 142,
      //                     maxMm: 208,
      //                   },
      //                   style: "luxury",
      //                   quickRelease: true,
      //                   waterResistance: false,
      //                   hypoallergenic: true,
      //                   weightMg: 29,
      //                 },
      //                 stockQuantity: 41,
      //                 createdBy: "688f27a5ab9f07e66832020a",
      //                 createdAt: "2025-08-03T09:11:11.598Z",
      //                 updatedAt: "2025-08-03T09:11:11.598Z",
      //                 stopSelling: false,
      //               },
      //             ],
      //           },
      //         },
      //       ],
      //     },
      //   },
      // };

      if (!res.success) {
        throw new Error(res.message);
      }

      return res.data as ProductDetailResponse;
    } catch (error) {
      throw new Error(formatError(error));
    }
  },
}));
