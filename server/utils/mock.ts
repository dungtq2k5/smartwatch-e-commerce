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
  ESTIMATE_PICKUP_TIME_GAP,
} from "../../common/configs.common";
import { HASH_SALT } from "../configs/configs";
import { provinces } from "../../common/vnAddresses";
import {
  formatAddress,
  getDistrictsByProvinceCode,
  getWardsByDistrictCode,
  isValidVnPhoneNumber,
  randNum,
} from "../../common/utils.common";
import User, { IUser } from "../models/user/user.model";
import UserAddress from "../models/user/userAddress.model";
import ProductBrand, {
  IProductBrand,
} from "../models/product/productBrand.model";
import ProductCategory, {
  IProductCategory,
} from "../models/product/productCategory.model";
import ProductOs, { IProductOs } from "../models/product/productOs.model";
import Product, { IProduct } from "../models/product/product.model";
import ProductModel, {
  IProductModel,
} from "../models/product/productModel.model";
import ModelVariation, {
  IModelVariation,
} from "../models/product/modelVariation.model";
import VariationInstance, {
  IVariationInstance,
} from "../models/product/variationInstance.model";
import InventoryMovement from "../models/inventory/inventoryMovement.model";
import OrderReturn, {
  IOrderReturn,
} from "../models/returnRefund/orderReturn.model";
import ReturnReason from "../models/returnRefund/returnReason.model";
import {
  getAdminRoleId,
  getBuyerRoleId,
  getDeliveryStateId,
  getInstanceConditionId,
  getMovementTypeId,
  getOrderStateId,
  getOrderStateLookupId,
  getPaymentMethodId,
  getPaymentStateId,
  getPickupStateId,
  getRefundStateId,
  getReturnStateId,
  getSysUserId,
} from "./utils";
import Order, { IOrder } from "../models/order/order.model";

// --- USERS ---

// Clean up existing non-protected users, first 2 users are admins
async function mockUsers(
  session: mongoose.mongo.ClientSession,
  count: number = 10
): Promise<any[]> {
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
    const adminRoleId = getAdminRoleId();
    const buyerRoleId = getBuyerRoleId();
    const sysUserId = getSysUserId();
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
            id: i < 2 ? adminRoleId : buyerRoleId, // First 2 are admins
            assignedBy: sysUserId,
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
  users: IUser[],
  rand: {
    min: number;
    max: number;
  } = {
    min: 1,
    max: 4,
  },
  deleteExisting: boolean = true
): Promise<any[]> {
  console.log("⏳ ", `Mocking user addresses...`);

  if (users.length === 0) {
    throw new Error("Users must be mocked before addresses.");
  }

  try {
    // Clear existing addresses
    if (deleteExisting) {
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
    }

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
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product brands...");

  try {
    // Clear existing brands
    await ProductBrand.deleteMany().session(session);

    // Generate mock brands
    const brandsToCreate: any = [];
    const sysUserId = getSysUserId();
    for (let i = 0; i < count; i++) {
      const brand = {
        name: `${faker.company.name()} ${faker.string.alphanumeric(5)}`, // unique
        logoUrl: faker.image.avatar(),
        description: faker.lorem.sentence(),
        createdBy: sysUserId,
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
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product categories...");

  try {
    // Clear existing categories
    await ProductCategory.deleteMany().session(session);

    // Generate mock categories
    const categoriesToCreate: any = [];
    const sysUserId = getSysUserId();
    for (let i = 0; i < count; i++) {
      const category = {
        name: `${faker.commerce.department()} ${faker.string.alphanumeric(5)}`, // unique
        description: faker.lorem.sentence(),
        createdBy: sysUserId,
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
  count: number = 5
): Promise<any> {
  console.log("⏳ ", "Mocking product operating systems...");

  try {
    // Clear existing OS
    await ProductOs.deleteMany().session(session);

    // Mock operating systems
    const osToCreate: any = [];
    const sysUserId = getSysUserId();
    for (let i = 0; i < count; i++) {
      const os = {
        name: `${faker.commerce.productAdjective()} ${faker.string.alphanumeric(
          5
        )}`, // unique
        logoUrl: faker.image.avatar(),
        description: faker.lorem.sentence(),
        createdBy: sysUserId,
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
  brands: IProductBrand[],
  categories: IProductCategory[],
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
    const sysUserId = getSysUserId();

    for (let i = 0; i < count; i++) {
      const product = {
        name: `${faker.commerce.productName()} ${faker.string.alphanumeric(5)}`, // unique
        type: faker.helpers.arrayElement(PRODUCT_TYPES),
        brandId: brands[randNum(0, brands.length - 1)]._id,
        categoryId: categories[randNum(0, categories.length - 1)]._id,
        description: faker.lorem.paragraph(),
        imageUrls: genRandImgUrls(randNum(1, 5), imgSpecs),
        basePriceCents: faker.number.int({ min: 100_00, max: 1000_00 }),
        createdBy: sysUserId,
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
  products: IProduct[],
  osId: IProductOs[],
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
    const sysUserId = getSysUserId();

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
                faker.lorem.sentence(),
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
          refreshRateHz: faker.helpers.arrayElement(
            PRODUCT_MOCK_OPTIONS.MODEL_SCREEN_REFRESH_RATE_OPTIONS
          ),
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
          createdBy: sysUserId,
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
  productModels: IProductModel[],
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
    const sysUserId = getSysUserId();

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
          additionalPriceCents: faker.number.int({ min: 0, max: 10_000 }),
          stockAdditionalPriceCents: faker.number.int({ min: 0, max: 5_000 }),
          band,
          stockQuantity: faker.number.int({ min: 1, max: 20 }),
          createdBy: sysUserId,
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
  modelVariations: IModelVariation[]
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
    const newInstanceConditionId = getInstanceConditionId("1"); // new
    for (const variation of modelVariations) {
      for (let i = 0; i < variation.stockQuantity; i++) {
        const instance = {
          sku: faker.string.uuid(), // unique
          modelVariationId: variation._id,
          supplierSerialNumber: faker.string.uuid(), // unique
          supplierImeiNumber: faker.helpers.arrayElement([
            null,
            faker.string.uuid(),
          ]), // unique
          conditionId: newInstanceConditionId,
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
  variationInstances: IVariationInstance[]
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
    const stockAdjustInventoryMovementTypeId = getMovementTypeId("4");
    const sysUserId = getSysUserId();
    for (const instance of variationInstances) {
      const movement = {
        variationInstanceId: instance._id,
        sku: instance.sku,
        inventoryMovementTypeId: stockAdjustInventoryMovementTypeId,
        createdBy: sysUserId,
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

// --- ORDERS ---
// Mock buyer profile and two addresses
async function mockBuyerMe(
  session: mongoose.mongo.ClientSession,
  user: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    birth: Date;
    gender: (typeof USER_GENDER_OPTIONS)[number];
  }
): Promise<IUser> {
  console.log("⏳ ", "Mocking buyer...");

  try {
    // Make the function idempotent by cleaning up existing buyer
    // await User.deleteOne({ email: user.email }).session(session);

    const existingUser = await User.findOne({ email: user.email })
      .session(session)
      .lean();
    if (existingUser) {
      console.log("✅ Buyer already exists, skipping creation.");
      console.log(existingUser._id);
      return existingUser;
    }

    const userToCreate = {
      ...user,
      isEmailVerified: true,
      isPhoneNumberVerified: true,
      password: bcrypt.hashSync(user.password, HASH_SALT),
      roles: [
        {
          id: getBuyerRoleId(),
          assignedBy: getSysUserId(),
        },
      ],
    };

    const createdUsers = await User.create([userToCreate], { session });
    await mockUserAddresses(session, createdUsers, { min: 2, max: 2 }, false);
    console.log("✅ Mocked buyer successfully.");
    return createdUsers[0];
  } catch (error) {
    throw new Error(`Error mocking buyer: ${error}`);
  }
}

async function mockCompleteOrder(
  session: mongoose.mongo.ClientSession,
  userId: mongoose.Types.ObjectId
): Promise<IOrder> {
  console.log("⏳ ", "Mocking complete order...");

  try {
    // Cleaning up existing orders for the user to make idempotent
    await Order.deleteMany({ userId }).session(session);

    // Ensure user has at least one address
    const userAddress = await UserAddress.findOne({ userId })
      .session(session)
      .lean();
    if (!userAddress) {
      throw new Error("User must have at least one address.");
    }

    // Prepare data
    const paymentMethodId = getPaymentMethodId("1"); // COD
    const now = new Date();
    const sysUserId = getSysUserId();

    const completePaymentStates = [
      {
        id: getPaymentStateId("1"), // pending
        notes: "Order created, payment pending.",
        createdBy: sysUserId,
        createdAt: now,
      },
      {
        id: getPaymentStateId("2"), // paid
        notes: "Payment received via COD.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 1 * 60 * 1000), // +1 minute
      },
    ];
    const completeDeliveryStates = [
      {
        id: getDeliveryStateId("1"), // pending
        notes: "Order created, delivery pending.",
        createdBy: sysUserId,
        createdAt: now,
      },
      {
        id: getDeliveryStateId("2"), // processing
        notes: "Order is being processed.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 2 * 60 * 1000), // +2 minutes
      },
      {
        id: getDeliveryStateId("3"), // shipped
        notes: "Order has been shipped.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 3 * 60 * 1000), // +3 minutes
      },
      {
        id: getDeliveryStateId("4"), // in transit
        notes: "Order is in transit.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 4 * 60 * 1000), // +4 minutes
      },
      {
        id: getDeliveryStateId("5"), // out for delivery
        notes: "Order is out for delivery.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 5 * 60 * 1000), // +5 minutes
      },
      {
        id: getDeliveryStateId("6"), // delivered
        notes: "Order has been delivered.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 6 * 60 * 1000), // +6 minutes
      },
    ];
    const completeOrderStates = [
      {
        id: getOrderStateId("1"), // pending
        notes: "Order created, pending confirmation.",
        createdBy: sysUserId,
        createdAt: now,
      },
      {
        id: getOrderStateId("2"), // confirmed
        notes: "Order confirmed.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 1 * 60 * 1000), // +1 minute
      },
      {
        id: getOrderStateId("3"), // placed
        notes: "Order has been placed.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 2 * 60 * 1000), // +2 minutes
      },
      {
        id: getOrderStateId("4"), // delivering
        notes: "Order is out for delivery.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 3 * 60 * 1000), // +3 minutes
      },
      {
        id: getOrderStateId("5"), // delivered
        notes: "Order has been delivered.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 4 * 60 * 1000), // +4 minutes
      },
      {
        id: getOrderStateId("6"), // completed
        notes: "Order has been completed.",
        createdBy: sysUserId,
        createdAt: new Date(now.getTime() + 5 * 60 * 1000), // +5 minutes
      },
    ];

    // Find two random variations with at least 2 stockQuantity
    const variations = await ModelVariation.aggregate([
      { $match: { stockQuantity: { $gte: 2 } } },
      { $sample: { size: 2 } },
    ]).session(session);
    if (variations.length < 2) {
      throw new Error(
        "Not enough variations with stockQuantity >= 2 to create a complete order."
      );
    }
    // For each variation, find 1 instance for first variation, 2 for second.
    const instances1 = await VariationInstance.aggregate([
      { $match: { modelVariationId: variations[0]._id, isActive: true } },
      { $sample: { size: 1 } },
    ]).session(session);
    const instances2 = await VariationInstance.aggregate([
      { $match: { modelVariationId: variations[1]._id, isActive: true } },
      { $sample: { size: 2 } },
    ]).session(session);

    if (instances1.length < 1 || instances2.length < 2) {
      throw new Error("Not enough instances to create a complete order.");
    }

    // Prepare all database write operations
    const allInstanceIdsToUpdate = [
      instances1[0]._id,
      ...instances2.map((inst) => inst._id),
    ];

    const variationStockUpdates = [
      {
        updateOne: {
          filter: { _id: variations[0]._id },
          update: { $inc: { stockQuantity: -1 } },
        },
      },
      {
        updateOne: {
          filter: { _id: variations[1]._id },
          update: { $inc: { stockQuantity: -2 } },
        },
      },
    ];

    const inventoryMovementsToCreate = [
      {
        variationInstanceId: instances1[0]._id,
        sku: instances1[0].sku,
        inventoryMovementTypeId: getMovementTypeId("3"), // sales out
        createdBy: sysUserId,
        quantity: 1, // Corrected from -1 to 1
        notes: "Sold in mock complete order",
      },
      ...instances2.map((inst) => ({
        variationInstanceId: inst._id,
        sku: inst.sku,
        inventoryMovementTypeId: getMovementTypeId("3"), // sales out
        createdBy: sysUserId,
        quantity: 1, // Corrected from -1 to 1
        notes: "Sold in mock complete order",
      })),
    ];

    // Create order
    const items = [
      {
        variationId: variations[0]._id,
        quantity: 1,
        totalCents: randNum(10_000, 20_000),
        instances: [
          {
            id: instances1[0]._id,
            sku: instances1[0].sku,
            state: "ordered",
          },
        ],
      },
      {
        variationId: variations[1]._id,
        quantity: 2,
        totalCents: randNum(20_000, 40_000),
        instances: instances2.map((inst) => ({
          id: inst._id,
          sku: inst.sku,
          state: "ordered",
        })),
      },
    ];

    const finalAmountCents = randNum(30_000, 6000);
    const completeOrder = {
      userId,
      items,
      deliveryAddress: userAddress,
      paymentSummary: {
        subtotalCents: finalAmountCents - 3000,
        appliedBalanceCents: 3000,
        finalAmountCents,
      },
      paymentMethodId,
      paymentStates: completePaymentStates,
      deliveryStates: completeDeliveryStates,
      states: completeOrderStates,
      orderDate: now,
      estimateReceivedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
      receivedDate: new Date(now.getTime() + 6 * 60 * 1000), // +6 minutes
      fulfilledBy: sysUserId,
      fulfillAt: now,
    };

    // Execute all write operations in parallel
    const [, , , createdOrders] = await Promise.all([
      ModelVariation.bulkWrite(variationStockUpdates, { session }),
      VariationInstance.updateMany(
        { _id: { $in: allInstanceIdsToUpdate } },
        { $set: { isActive: false } },
        { session }
      ),
      InventoryMovement.insertMany(inventoryMovementsToCreate, { session }),
      Order.create([completeOrder], { session }),
    ]);

    console.log("✅ Mocked complete order successfully.");
    return createdOrders[0];
  } catch (error) {
    throw new Error(`Error mocking complete order: ${error}`);
  }
}

export async function mockPendingOrder(
  session: mongoose.mongo.ClientSession,
  userId: mongoose.Types.ObjectId
): Promise<IOrder> {
  console.log("⏳ ", "Mocking pending order...");

  try {
    // Cleaning up existing orders for the user to make idempotent
    // await Order.deleteMany({ userId }).session(session);

    // Ensure user has at least one address
    const userAddress = await UserAddress.findOne({ userId })
      .session(session)
      .lean();
    if (!userAddress) {
      throw new Error("User must have at least one address.");
    }

    // Prepare data
    const paymentMethodId = getPaymentMethodId("1"); // COD
    const now = new Date();
    const sysUserId = getSysUserId();
    const pendingPaymentStates = [
      {
        id: getPaymentStateId("1"), // pending
        notes: "Order created, payment pending.",
        createdBy: sysUserId,
        createdAt: now,
      },
    ];
    const pendingDeliveryStates = [
      {
        id: getDeliveryStateId("1"), // pending
        notes: "Order created, delivery pending.",
        createdBy: sysUserId,
        createdAt: now,
      },
    ];
    const pendingOrderStates = [
      {
        id: getOrderStateId("1"), // pending
        notes: "Order created, pending confirmation.",
        createdBy: sysUserId,
        createdAt: now,
      },
    ];

    // Find two random variations with at least 1 stockQuantity
    const variations = await ModelVariation.aggregate([
      { $match: { stockQuantity: { $gte: 1 } } },
      { $sample: { size: 2 } },
    ]).session(session);
    if (variations.length < 2) {
      throw new Error(
        "Not enough variations with stockQuantity >= 1 to create a pending order."
      );
    }
    // For each variation, find 1 instance.
    const instances1 = await VariationInstance.aggregate([
      { $match: { modelVariationId: variations[0]._id, isActive: true } },
      { $sample: { size: 1 } },
    ]).session(session);
    const instances2 = await VariationInstance.aggregate([
      { $match: { modelVariationId: variations[1]._id, isActive: true } },
      { $sample: { size: 1 } },
    ]).session(session);
    if (instances1.length < 1 || instances2.length < 1) {
      throw new Error("Not enough instances to create a pending order.");
    }
    // Prepare all database write operations
    const allInstanceIdsToUpdate = [instances1[0]._id, instances2[0]._id];
    const variationStockUpdates = [
      {
        updateOne: {
          filter: { _id: variations[0]._id },
          update: { $inc: { stockQuantity: -1 } },
        },
      },
      {
        updateOne: {
          filter: { _id: variations[1]._id },
          update: { $inc: { stockQuantity: -1 } },
        },
      },
    ];
    const inventoryMovementsToCreate = [
      {
        variationInstanceId: instances1[0]._id,
        sku: instances1[0].sku,
        inventoryMovementTypeId: getMovementTypeId("3"), // sales out
        createdBy: sysUserId,
        quantity: 1, // Corrected from -1 to 1
        notes: "Sold in mock pending order",
      },
      {
        variationInstanceId: instances2[0]._id,
        sku: instances2[0].sku,
        inventoryMovementTypeId: getMovementTypeId("3"), // sales out
        createdBy: sysUserId,
        quantity: 1, // Corrected from -1 to 1
        notes: "Sold in mock pending order",
      },
    ];
    // Create order
    const items = [
      {
        variationId: variations[0]._id,
        quantity: 1,
        totalCents: randNum(10_000, 20_000),
        instances: [
          {
            id: instances1[0]._id,
            sku: instances1[0].sku,
            state: "ordered",
          },
        ],
      },
      {
        variationId: variations[1]._id,
        quantity: 1,
        totalCents: randNum(10_000, 20_000),
        instances: [
          {
            id: instances2[0]._id,
            sku: instances2[0].sku,
            state: "ordered",
          },
        ],
      },
    ];
    const finalAmountCents = randNum(20_000, 40_000);
    const pendingOrder = {
      userId,
      items,
      deliveryAddress: userAddress,
      paymentSummary: {
        subtotalCents: finalAmountCents,
        appliedBalanceCents: 0,
        finalAmountCents,
      },
      paymentMethodId,
      paymentStates: pendingPaymentStates,
      deliveryStates: pendingDeliveryStates,
      states: pendingOrderStates,
      orderDate: now,
      estimateReceivedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
    };
    // Execute all write operations in parallel
    const [, , , createdOrders] = await Promise.all([
      ModelVariation.bulkWrite(variationStockUpdates, { session }),
      VariationInstance.updateMany(
        { _id: { $in: allInstanceIdsToUpdate } },
        { $set: { isActive: false } },
        { session }
      ),
      InventoryMovement.insertMany(inventoryMovementsToCreate, { session }),
      Order.create([pendingOrder], { session }),
    ]);
    console.log("✅ Mocked pending order successfully.");
    return createdOrders[0];
  } catch (error) {
    throw new Error(`Error mocking pending order: ${error}`);
  }
}

// mock return at the beginning of return process
async function mockOrderReturn(
  session: mongoose.mongo.ClientSession,
  orderId: mongoose.Types.ObjectId
): Promise<IOrderReturn> {
  console.log("⏳ ", "Mocking order return...");

  try {
    // Cleaning up existing return requests for idempotency
    await OrderReturn.deleteMany({ orderId }).session(session);

    // Fetch the order
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new Error("Order not found.");
    }
    // Ensure order is completed
    const latestState = order.states.at(-1);
    if (!latestState) {
      throw new Error("Order doesn't have an states!");
    }
    const latestStateLookupId = getOrderStateLookupId(latestState.id);
    if (!["5", "6"].includes(latestStateLookupId)) {
      throw new Error("Only delivered or completed orders can be returned.");
    }

    // Get some items from the order to return -> update their states to "return pending"
    const itemsToReturn: any = [];
    const firstItem = order.items[0];
    const firstItemInstance = firstItem.instances[0];
    itemsToReturn.push({
      variationId: firstItem.variationId,
      quantity: 1,
      totalCents: Math.floor(firstItem.totalCents / firstItem.quantity),
      instances: [
        {
          id: firstItemInstance.id,
          sku: firstItemInstance.sku,
        },
      ],
    });
    firstItem.instances[0].state = "return pending";

    // Fetch a return reason
    const returnReasonId = await ReturnReason.findOne().session(session).lean();
    if (!returnReasonId) {
      throw new Error(
        "No return reasons found. Please mock return reasons first."
      );
    }

    // Prepare order return data
    const sysUserId = getSysUserId();
    const orderReturn = {
      orderId: order._id,
      items: itemsToReturn,
      pickupAddress: order.deliveryAddress,
      refundSummary: {
        toCardCents: 9900,
        toBalanceCents: 0,
        finalRefundAmountCents: 9900,
      },
      refundStates: [
        {
          id: getRefundStateId("1"),
          notes: "Return requested nby mock function.",
          createdBy: sysUserId,
        },
      ],
      pickupStates: [
        {
          id: getPickupStateId("1"),
          notes: "Return pickup requested by mock function.",
          createdBy: sysUserId,
        },
      ],
      states: [
        {
          id: getReturnStateId("1"),
          notes: "Return requested by mock function.",
          createdBy: sysUserId,
        },
      ],
      estimatePickupDate: new Date(Date.now() + ESTIMATE_PICKUP_TIME_GAP),
      reasonId: returnReasonId._id,
      imageUrls: genRandImgUrls(3, {
        width: 800,
        height: 800,
        category: "return",
      }),
      buyerReason: "The product is defective.",
    };

    const [, createdOrderReturns] = await Promise.all([
      order.save({ session }),
      OrderReturn.create([orderReturn], { session }),
    ]);

    console.log("✅ Mocked order return successfully.");
    return createdOrderReturns[0];
  } catch (error) {
    throw new Error(`Error mocking order return: ${error}`);
  }
}

export async function mockAllData(): Promise<void> {
  console.log("⏳ ", "Mocking all data...");

  const session = await mongoose.startSession();

  try {
    // Order is matter

    // User
    session.startTransaction();
    const users = await mockUsers(session, 3);
    await mockUserAddresses(session, users);
    await session.commitTransaction();
    console.log("✅ User data committed.");

    // Product
    session.startTransaction();
    const brands = await mockProductBrands(session);
    const categories = await mockProductCategories(session);
    const os = await mockProductOs(session);
    const products = await mockProduct(session, brands, categories);
    const productModels = await mockProductModels(session, products, os);
    const modelVariations = await mockModelVariations(session, productModels);
    const variationInstances = await mockVariationInstances(
      session,
      modelVariations
    );
    await session.commitTransaction();
    console.log("✅ Product data committed.");

    // Inventory
    session.startTransaction();
    await mockInventoryMovements(session, variationInstances);
    await session.commitTransaction();
    console.log("✅ Inventory data committed.");

    // Actual buyerMe and order
    session.startTransaction();
    const buyerMe = await mockBuyerMe(session, {
      fullName: "Dung Tran Quang",
      email: "dungtranquang2005@gmail.com",
      phoneNumber: "0901234567",
      password: "password123456789",
      birth: new Date("2005-11-26"),
      gender: "male",
    });
    const completeOrder = await mockCompleteOrder(session, buyerMe._id);
    await mockOrderReturn(session, completeOrder._id);
    await session.commitTransaction();
    console.log("✅ Order data committed.");

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
