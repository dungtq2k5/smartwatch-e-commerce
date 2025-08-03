import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  AUTH_PROVIDER_OPTIONS,
  IMMUTABILITY_USER_EMAILS,
  PRODUCT_MOCK_OPTIONS,
  PROTECTED_USER_EMAILS,
  USER_GENDER_OPTIONS,
  VN_COUNTRY_CODE,
  PRODUCT_IMAGE_BEST_HEIGHT,
  PRODUCT_IMAGE_BEST_WIDTH,
  PRODUCT_TYPES,
} from "../../common/configs.common";
import { appCache } from "../configs/cache";
import { HASH_SALT } from "../configs/configs";
import { provinces } from "../../common/vnAddresses";
import {
  formatAddress,
  getDistrictsByProvinceCode,
  getWardsByDistrictCode,
  isValidVnPhoneNumber,
  randNum,
} from "../../common/utils.common";
import User from "../models/user/user.model";
import UserAddress from "../models/user/userAddress.model";
import ProductBrand from "../models/product/productBrand.model";
import ProductCategory from "../models/product/productCategory.model";
import ProductOs from "../models/product/productOs.model";
import Product from "../models/product/product.model";
import ProductModel from "../models/product/productModel.model";
import ModelVariation from "../models/product/modelVariation.model";
import VariationInstance from "../models/product/variationInstance.model";
import InventoryMovement from "../models/inventory/inventoryMovement.model";
import type { KeyObjectId } from "./types";

// --- USERS ---

// Clean up existing non-protected users, first 2 users are admins
async function mockUsers(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
    buyerRoleId: mongoose.Types.ObjectId;
    adminRoleId: mongoose.Types.ObjectId;
  },
  count: number = 10
): Promise<any> {
  console.log("⏳ ", `Mocking ${count} users...`);

  try {
    // Clean up existing non-protected users and their addresses
    const protectedEmails = [
      ...IMMUTABILITY_USER_EMAILS,
      ...PROTECTED_USER_EMAILS,
    ];
    const usersToDelete = await User.find({
      email: { $nin: protectedEmails },
    })
      .select("_id")
      .session(session)
      .lean();

    if (usersToDelete.length > 0) {
      const idsToDelete = usersToDelete.map((user) => user._id);
      await User.deleteMany({ _id: { $in: idsToDelete } }).session(session);
    }

    // Generate mock users
    const usersToCreate: any = [];
    for (let i = 0; i < count; i++) {
      const user = {
        fullName: faker.person.fullName(),
        email: faker.internet.email().toLowerCase(), // unique
        password: bcrypt.hashSync(faker.internet.password(), HASH_SALT),
        birth: faker.date.birthdate(),
        gender: faker.helpers.arrayElement(USER_GENDER_OPTIONS),
        avatarUrl: faker.image.avatar(),
        isEmailVerified: faker.datatype.boolean(),
        authProvider: faker.helpers.arrayElement(AUTH_PROVIDER_OPTIONS),
        roles: [
          {
            id: i < 2 ? appCache.adminRoleId : appCache.buyerRoleId, // First 2 are admins
            assignedBy: appCache.systemUserId,
          },
        ],
      };

      usersToCreate.push(user);
    }

    const createdUsers = await User.insertMany(usersToCreate, { session });
    console.log("✅ Mocked users successfully.");
    return createdUsers;
  } catch (error) {
    throw new Error(`Error mocking users: ${error}`);
  }
}

// Clean up existing addresses and mock new ones, first address is default
async function mockUserAddresses(
  session: mongoose.mongo.ClientSession,
  users: any[],
  rand: {
    min: number;
    max: number;
  } = {
    min: 1,
    max: 4,
  }
): Promise<any> {
  console.log("⏳ ", `Mocking user addresses...`);

  if (users.length === 0) {
    throw new Error("Users must be mocked before addresses.");
  }

  try {
    // Clear existing addresses
    const protectedEmails = [
      ...IMMUTABILITY_USER_EMAILS,
      ...PROTECTED_USER_EMAILS,
    ];
    const protectedUsers = await User.find({
      email: { $in: protectedEmails },
    })
      .select("_id")
      .lean();
    const protectedUserIds = protectedUsers.map((user) => user._id);

    await UserAddress.deleteMany({
      userId: { $nin: protectedUserIds },
    }).session(session);

    // Mock addresses for each user
    const addressesToCreate: any = [];

    for (const user of users) {
      const count = randNum(rand.min, rand.max);
      for (let i = 0; i < count; i++) {
        let randProvince: any, randDistrict: any, randWard: any;
        let districtsInProvince: { total: number; data: any[] },
          wardsInDistrict: { total: number; data: any[] };

        // Loop to ensure we get a valid province, district, and ward
        do {
          // Pick a random province
          randProvince = provinces.data[randNum(0, provinces.total - 1)];

          // Pick a random district from the province
          districtsInProvince = getDistrictsByProvinceCode(randProvince.code);
          if (districtsInProvince.total > 0) {
            randDistrict =
              districtsInProvince.data[
                randNum(0, districtsInProvince.total - 1)
              ];

            // Pick a random ward code from the district
            wardsInDistrict = getWardsByDistrictCode(randDistrict.code);
            if (wardsInDistrict.total > 0) {
              randWard =
                wardsInDistrict.data[randNum(0, wardsInDistrict.total - 1)];
            }
          }
        } while (!randWard); // Continue until a valid ward is found

        const addressDetails = {
          street: faker.location.streetAddress(),
          apartmentNumber: faker.location.buildingNumber(),
          wardCode: randWard.code,
          districtCode: randDistrict.code,
          cityProvinceCode: randProvince.code,
        };

        // Generate valid Vietnamese phone number
        let phoneNumber = "0" + faker.string.numeric(9);
        while (!isValidVnPhoneNumber(phoneNumber)) {
          phoneNumber = "0" + faker.string.numeric(9);
        }

        const address = {
          userId: user._id,
          name: faker.person.fullName(),
          ...addressDetails,
          countryCode: VN_COUNTRY_CODE,
          phoneNumber,
          fullAddress: formatAddress(addressDetails),
          location: {
            locationType: "point",
            coordinates: [
              parseFloat(faker.location.longitude().toFixed(6)),
              parseFloat(faker.location.latitude().toFixed(6)),
            ],
          },
          isDefault: i === 0, // First address is default
        };

        addressesToCreate.push(address);
      }
    }

    const createdAddrs = await UserAddress.insertMany(addressesToCreate, {
      session,
    });
    console.log("✅ Mocked user addresses successfully.");
    return createdAddrs;
  } catch (error) {
    throw new Error(`Error mocking user addresses: ${error}`);
  }
}

// --- PRODUCTS ---
async function mockProductBrands(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product brands...");

  try {
    // Clear existing brands
    await ProductBrand.deleteMany().session(session);

    // Check cache
    if (!appCache.systemUserId) {
      throw new Error(
        "System user ID not found in cache. Please initialize the cache first."
      );
    }

    // Generate mock brands
    const brandsToCreate: any = [];
    for (let i = 0; i < count; i++) {
      const brand = {
        name: `${faker.company.name()} ${faker.string.alphanumeric(5)}`, // unique
        logoUrl: faker.image.avatar(),
        description: faker.lorem.sentence(),
        createdBy: appCache.systemUserId,
      };

      brandsToCreate.push(brand);
    }

    const createdBrands = await ProductBrand.insertMany(brandsToCreate, {
      session,
    });
    console.log("✅ Mocked product brands successfully.");
    return createdBrands;
  } catch (error) {
    throw new Error(`Error mocking product brands: ${error}`);
  }
}

async function mockProductCategories(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product categories...");

  try {
    // Clear existing categories
    await ProductCategory.deleteMany().session(session);

    // Generate mock categories
    const categoriesToCreate: any = [];
    for (let i = 0; i < count; i++) {
      const category = {
        name: `${faker.commerce.department()} ${faker.string.alphanumeric(5)}`, // unique
        description: faker.lorem.sentence(),
        createdBy: appCache.systemUserId,
      };

      categoriesToCreate.push(category);
    }

    const createdCates = await ProductCategory.insertMany(categoriesToCreate, {
      session,
    });
    console.log("✅ Mocked product categories successfully.");
    return createdCates;
  } catch (error) {
    throw new Error(`Error mocking product categories: ${error}`);
  }
}

async function mockProductOs(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product operating systems...");

  try {
    // Clear existing OS
    await ProductOs.deleteMany().session(session);

    // Mock operating systems
    const osToCreate: any = [];
    for (let i = 0; i < count; i++) {
      const os = {
        name: `${faker.commerce.productAdjective()} ${faker.string.alphanumeric(
          5
        )}`, // unique
        logoUrl: faker.image.avatar(),
        description: faker.lorem.sentence(),
        createdBy: appCache.systemUserId,
      };

      osToCreate.push(os);
    }

    const createdOs = await ProductOs.insertMany(osToCreate, { session });
    console.log("✅ Mocked product operating systems successfully.");
    return createdOs;
  } catch (error) {
    throw new Error(`Error mocking product operating systems: ${error}`);
  }
}

async function mockProduct(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  brands: any[],
  categories: any[],
  count: number = 10
): Promise<any> {
  console.log("⏳ ", "Mocking products...");

  if (brands.length === 0 || categories.length === 0) {
    throw new Error(
      "Brands, categories, and OS must be mocked before products."
    );
  }

  try {
    // Clear existing products
    await Product.deleteMany().session(session);

    // Generate mock products
    const productsToCreate: any = [];
    const imgSpecs = {
      width: PRODUCT_IMAGE_BEST_WIDTH,
      height: PRODUCT_IMAGE_BEST_HEIGHT,
      category: "watch",
    };

    for (let i = 0; i < count; i++) {
      const product = {
        name: `${faker.commerce.productName()} ${faker.string.alphanumeric(5)}`, // unique
        type: faker.helpers.arrayElement(PRODUCT_TYPES),
        brandId: brands[randNum(0, brands.length - 1)]._id,
        categoryId: categories[randNum(0, categories.length - 1)]._id,
        description: faker.lorem.paragraph(),
        imageUrls: genRandImgUrls(randNum(1, 5), imgSpecs),
        basePriceCents: faker.number.int({ min: 100_00, max: 1000_00 }),
        createdBy: appCache.systemUserId,
      };

      productsToCreate.push(product);
    }

    const createdProducts = await Product.insertMany(productsToCreate, {
      session,
    });
    console.log("✅ Mocked products successfully.");
    return createdProducts;
  } catch (error) {
    throw new Error(`Error mocking products: ${error}`);
  }
}

async function mockProductModels(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  products: any[],
  osId: any[],
  rand: {
    min: number;
    max: number;
  } = {
    min: 1,
    max: 4,
  }
): Promise<any> {
  console.log("⏳ ", "Mocking product models...");

  if (products.length === 0 || osId.length === 0) {
    throw new Error("Products and OS must be mocked before models.");
  }

  try {
    // Clear existing product models
    await ProductModel.deleteMany().session(session);

    // Generate mock product models
    const modelsToCreate: any = [];
    const imgSpecs = {
      width: PRODUCT_IMAGE_BEST_WIDTH,
      height: PRODUCT_IMAGE_BEST_HEIGHT,
      category: "watch",
    };

    for (const product of products) {
      const count = randNum(rand.min, rand.max);

      for (let i = 0; i < count; i++) {
        const stockPriceCents = faker.number.int({ min: 100_00, max: 1000_00 });

        const feature = {
          speakAndMicroPhone: faker.datatype.boolean(),
          waterResistance: faker.helpers.arrayElement([
            null,
            {
              rating: faker.helpers.arrayElement(
                PRODUCT_MOCK_OPTIONS.MODEL_WATER_RESISTANCE_OPTIONS
              ),
              description: faker.helpers.arrayElement([
                null,
                faker.lorem.sentence()
              ]),
            },
          ]),
          utilities: faker.helpers.arrayElement([
            null,
            {
              healths: genArrayWithRandEles(
                PRODUCT_MOCK_OPTIONS.MODEL_HEALTH_FEATURES_OPTIONS as any,
                randNum(1, 3)
              ),
              sports: genArrayWithRandEles(
                PRODUCT_MOCK_OPTIONS.MODEL_SPORTS_FEATURES_OPTIONS as any,
                randNum(1, 3)
              ),
              specials: genArrayWithRandEles(
                PRODUCT_MOCK_OPTIONS.MODEL_SPECIAL_FEATURES_OPTIONS as any,
                randNum(1, 3)
              ),
            },
          ]),
          supportedAppsForNotifications: genArrayWithRandEles(
            PRODUCT_MOCK_OPTIONS.MODEL_SUPPORTED_APPS_FOR_NOTIFICATIONS_OPTIONS as any,
            randNum(1, 3)
          ),
        };

        const config = {
          connectivities: genArrayWithRandEles(
            PRODUCT_MOCK_OPTIONS.MODEL_CONNECTIVITY_OPTIONS as any,
            randNum(1, 3)
          ),
          camera: faker.helpers.arrayElement([
            null,
            {
              resolutionMp: faker.number.int({ min: 0, max: 108 }),
              features: genArrayWithRandEles(
                PRODUCT_MOCK_OPTIONS.MODEL_CAMERA_FEATURES_OPTIONS as any,
                randNum(1, 3)
              ),
            },
          ]),
          chipset: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_CHIPSET_OPTIONS
          ),
          memory: {
            ramBytes: faker.number.int({
              min: 512_000_000,
              max: 2_000_000_000,
            }), // 512MB to 2GB
            storageBytes: faker.number.int({
              min: 4_000_000_000,
              max: 32_000_000_000,
            }), // 4GB to 32GB
          },
          osId: osId[randNum(0, osId.length - 1)]._id,
          compatiblePhoneOs: genArrayWithRandEles(
            PRODUCT_MOCK_OPTIONS.MODEL_COMPATIBLE_PHONE_OS_OPTIONS as any,
            randNum(1, 3)
          ),
          appsConnect: genArrayWithRandEles(
            PRODUCT_MOCK_OPTIONS.MODEL_APPS_CONNECT_OPTIONS as any,
            randNum(1, 3)
          ),
          sensors: genArrayWithRandEles(
            PRODUCT_MOCK_OPTIONS.MODEL_SENSORS_OPTIONS as any,
            randNum(1, 3)
          ),
        };

        const battery = {
          capacityMah: faker.number.int({ min: 200, max: 5000 }),
          timeOnline: {
            aodOnMin: faker.number.int({ min: 60, max: 240 }),
            aodOffMin: faker.number.int({ min: 60, max: 240 }),
            typicalUsageMin: faker.number.int({ min: 60, max: 240 }),
            standByMin: faker.number.int({ min: 60, max: 240 }),
          },
          timeFullChargeMin: faker.number.int({ min: 30, max: 180 }),
          chargingType: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_BATTERY_CHARGE_TYPE_OPTIONS
          ),
        };

        const isCircular = faker.datatype.boolean();
        const screen = {
          display: {
            diagonalSizeInch: faker.number.float({
              min: 1.5,
              max: 2.5,
            }),
            displayType: faker.helpers.arrayElement(
              PRODUCT_MOCK_OPTIONS.MODEL_DISPLAY_TYPE_OPTIONS
            ),
          },
          brightness: {
            minNits: faker.number.int({ min: 100, max: 1000 }),
            maxNits: faker.number.int({ min: 1000, max: 2000 }),
          },
          resolution: {
            hPx: faker.number.int({ min: 720, max: 2160 }),
            wPx: faker.number.int({ min: 1280, max: 3840 }),
          },
          glassMaterial: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_SCREEN_GLASS_MATERIAL_OPTIONS
          ),
          bezelMaterial: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_BEZEL_MATERIAL_OPTIONS
          ),
          isCircular,
          diameterMm: isCircular
            ? faker.number.int({ min: 30, max: 50 })
            : null,
          dimension: !isCircular
            ? {
                wMm: faker.number.int({ min: 30, max: 50 }),
                hMm: faker.number.int({ min: 30, max: 50 }),
                thicknessMm: faker.number.int({ min: 5, max: 15 }),
              }
            : null,
          shape: isCircular ? "round" : "rectangular",
        };

        const model = {
          productId: product._id,
          name: `${faker.commerce.productName()} ${faker.string.alphanumeric(
            5
          )}`, // unique
          priceCents:
            stockPriceCents + faker.number.int({ min: 10_00, max: 100_00 }),
          stockPriceCents,
          imageUrls: genRandImgUrls(randNum(1, 5), imgSpecs),
          feature,
          config,
          battery,
          screen,
          caseMaterial: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_CASE_MATERIAL_OPTIONS
          ),
          watchWeightMg: faker.number.int({ min: 50, max: 200 }),
          compatibleBandLugWidthMm: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_COMPATIBLE_BAND_LUG_WIDTH_MM_OPTIONS
          ),
          releaseDate: faker.date.past(),
          createdBy: appCache.systemUserId,
        };

        modelsToCreate.push(model);
      }
    }

    const createdModels = await ProductModel.insertMany(modelsToCreate, {
      session,
    });
    console.log("✅ Mocked product models successfully.");
    return createdModels;
  } catch (error) {
    throw new Error(`Error mocking product models: ${error}`);
  }
}

async function mockModelVariations(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
  },
  productModels: any[],
  rand: {
    min: number;
    max: number;
  } = {
    min: 1,
    max: 4,
  }
): Promise<any> {
  console.log("⏳ ", "Mocking product model variations...");

  if (productModels.length === 0) {
    throw new Error("Product models must be mocked before variations.");
  }

  try {
    // Clear existing variations
    await ModelVariation.deleteMany().session(session);

    // Generate mock model variations
    const variationsToCreate: any = [];
    const imgSpecs = {
      width: PRODUCT_IMAGE_BEST_WIDTH,
      height: PRODUCT_IMAGE_BEST_HEIGHT,
      category: "watch",
    };

    for (const model of productModels) {
      const count = randNum(rand.min, rand.max);
      const usedColorHexes = new Set<string>(); // Track used color hexes to ensure uniqueness
      const usedColorNames = new Set<string>(); // Track used color names to ensure uniqueness

      for (let i = 0; i < count; i++) {
        let colorHex: string;
        do {
          colorHex = faker.color.rgb({ format: "hex" });
        } while (usedColorHexes.has(colorHex));
        usedColorHexes.add(colorHex);

        let colorName: string;
        do {
          colorName = faker.color.human().toLowerCase();
        } while (usedColorNames.has(colorName));
        usedColorNames.add(colorName);

        const band = {
          widthMm: model.compatibleBandLugWidthMm,
          lugWidthMm: model.compatibleBandLugWidthMm,
          material: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.VARIATION_BAND_MATERIAL_OPTIONS
          ),
          colors: [
            {
              hex: faker.color.rgb({ format: "hex" }),
              name: faker.color.human().toLowerCase(),
            },
          ],
          claspType: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.VARIATION_BAND_CLASP_TYPE_OPTIONS
          ),
          adjustableRange: {
            minMm: faker.number.int({ min: 130, max: 160 }),
            maxMm: faker.number.int({ min: 170, max: 210 }),
          },
          style: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.VARIATION_BAND_STYLE_OPTIONS
          ),
          quickRelease: faker.datatype.boolean(),
          waterResistance: faker.datatype.boolean(),
          hypoallergenic: faker.datatype.boolean(),
          weightMg: faker.number.int({ min: 20, max: 50 }),
        };

        const variation = {
          productModelId: model._id,
          name: faker.commerce.productName(),
          color: {
            hex: colorHex,
            name: colorName,
          }, // unique
          imageUrls: genRandImgUrls(randNum(1, 5), imgSpecs),
          additionalPriceCents: faker.number.int({ min: 0, max: 100_00 }),
          band,
          stockQuantity: faker.number.int({ min: 0, max: 50 }),
          createdBy: appCache.systemUserId,
        };

        variationsToCreate.push(variation);
      }
    }

    const createdVariations = await ModelVariation.insertMany(
      variationsToCreate,
      { session }
    );
    console.log("✅ Mocked product model variations successfully.");
    return createdVariations;
  } catch (error) {
    throw new Error(`Error mocking product model variations: ${error}`);
  }
}

async function mockVariationInstances(
  session: mongoose.mongo.ClientSession,
  appCache: {
    instanceConditions: KeyObjectId;
  },
  modelVariations: any[]
): Promise<any> {
  console.log("⏳ ", "Mocking product model variation instances...");

  if (modelVariations.length === 0) {
    throw new Error("Model variations must be mocked before instances.");
  }

  try {
    // Clear existing instances
    await VariationInstance.deleteMany().session(session);

    // Generate mock variation instances
    const instancesToCreate: any = [];
    for (const variation of modelVariations) {
      const isImeiUndefined =
        variation.type === "band" ? false : faker.datatype.boolean();

      for (let i = 0; i < variation.stockQuantity; i++) {
        const instance = {
          sku: faker.string.uuid(), // unique
          modelVariationId: variation._id,
          supplierSerialNumber: faker.string.uuid(), // unique
          supplierImeiNumber: isImeiUndefined ? null : faker.string.uuid(), // unique
          conditionId: appCache.instanceConditions["new"],
        };

        instancesToCreate.push(instance);
      }
    }

    const createdInstances = await VariationInstance.insertMany(
      instancesToCreate,
      { session }
    );
    console.log("✅ Mocked product model variation instances successfully.");
    return createdInstances;
  } catch (error) {
    throw new Error(
      `Error mocking product model variation instances: ${error}`
    );
  }
}

async function mockInventoryMovements(
  session: mongoose.mongo.ClientSession,
  appCache: {
    systemUserId: mongoose.Types.ObjectId;
    inventoryMovementTypes: KeyObjectId;
  },
  variationInstances: any[]
): Promise<any> {
  console.log("⏳ ", "Mocking inventory movements...");

  if (variationInstances.length === 0) {
    throw new Error(
      "Variation instances must be mocked before inventory movements."
    );
  }

  try {
    // Clear existing inventory movements
    await InventoryMovement.deleteMany().session(session);

    // Generate mock inventory movements
    const movementsToCreate: any = [];
    for (const instance of variationInstances) {
      const movement = {
        variationInstanceId: instance._id,
        sku: instance.sku,
        movementTypeId: appCache.inventoryMovementTypes["stock adjustment"],
        createdBy: appCache.systemUserId,
        quantity: 1,
        notes: "created for mock data",
      };

      movementsToCreate.push(movement);
    }

    await InventoryMovement.insertMany(movementsToCreate, { session });
    console.log("✅ Mocked inventory movements successfully.");
    return movementsToCreate;
  } catch (error) {
    throw new Error(`Error mocking inventory movements: ${error}`);
  }
}

// Order is matter
export async function mockAllData(): Promise<void> {
  console.log("⏳ ", "Mocking all data...");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Ensure appCache is initialized
    if (!appCache.systemUserId) {
      throw new Error(
        "System user ID not found in cache. Please initialize the cache first."
      );
    }
    if (!appCache.buyerRoleId) {
      throw new Error(
        "Buyer role ID not found in cache. Please initialize the cache first."
      );
    }
    if (!appCache.adminRoleId) {
      throw new Error(
        "Admin role ID not found in cache. Please initialize the cache first."
      );
    }
    if (!appCache.instanceConditions) {
      throw new Error(
        "Instance conditions not found in cache. Please initialize the cache first."
      );
    }
    if (!appCache.inventoryMovementTypes) {
      throw new Error(
        "Inventory movement types not found in cache. Please initialize the cache first."
      );
    }

    const cache = {
      systemUserId: appCache.systemUserId,
      buyerRoleId: appCache.buyerRoleId,
      adminRoleId: appCache.adminRoleId,
      instanceConditions: appCache.instanceConditions,
      inventoryMovementTypes: appCache.inventoryMovementTypes,
    };

    // User
    const users = await mockUsers(session, cache);
    await mockUserAddresses(session, users);

    // Product
    const brands = await mockProductBrands(session, cache);
    const categories = await mockProductCategories(session, cache);
    const os = await mockProductOs(session, cache);
    const products = await mockProduct(session, cache, brands, categories);
    const productModels = await mockProductModels(session, cache, products, os);
    const modelVariations = await mockModelVariations(
      session,
      cache,
      productModels
    );
    const variationInstances = await mockVariationInstances(
      session,
      cache,
      modelVariations
    );

    // Inventory
    await mockInventoryMovements(session, cache, variationInstances);

    await session.commitTransaction();
    console.log("✅ ", "All data mocked successfully.");
  } catch (error) {
    await session.abortTransaction();
    console.log("❌ ", "Error mocking all data:", error);
    process.exit(1);
  } finally {
    await session.endSession();
  }
}

// --- HELPER FUNCTIONS ---
function genRandImgUrls(
  count: number,
  specs: {
    width: number;
    height: number;
    category: string;
  }
): string[] {
  const urls: string[] = [];

  for (let i = 0; i < count; i++) {
    urls.push(
      faker.image.urlPicsumPhotos({
        width: specs.width,
        height: specs.height,
      })
    );
  }
  return urls;
}

function genArrayWithRandEles(eles: any[], count: number): any[] {
  const shuffled = eles.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
