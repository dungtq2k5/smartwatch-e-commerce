import mongoose from "mongoose";
import connectDB from "./db/connectDB";
import dotenv from "dotenv";
import { randNum } from "../common/utils.common";
import { faker } from "@faker-js/faker";
import { PRODUCT_MOCK_OPTIONS } from "../common/configs.common";

dotenv.config();

// Add "username" field to all user documents with the value of their fullName in lowercase without spaces
async function addUsernameFieldToUsers(
  db: mongoose.mongo.Db,
  session: mongoose.ClientSession,
  type: "up" | "down"
): Promise<void> {
  try {
    if (type === "up") {
      console.log("▶️ ", "Adding username field to users...");

      await db.collection("users").updateMany(
        { username: { $exists: false } },
        [
          {
            $set: {
              username: {
                $toLower: {
                  $replaceAll: {
                    input: "$fullName",
                    find: " ",
                    replacement: "",
                  },
                },
              },
            },
          },
        ],
        { session }
      );

      console.log("✅ ", "Added username field to all users.");
      return;
    }

    console.log("▶️ ", "Removing username field from users...");
    await db.collection("users").updateMany(
      {},
      {
        $unset: { username: "" },
      },
      { session }
    );
    console.log("✅ ", "Removed username field from all users.");
  } catch (error) {
    console.error("❌ ", "Error in addUsernameFieldToUsers migration:", error);
    throw error;
  }
}

// Add "stockAdditionalPriceCents" field to all model variation documents with the random value from 0 to their "additionalPriceCents"
async function addStockAdditionalPriceCentsToModelVariations(
  db: mongoose.mongo.Db,
  session: mongoose.ClientSession,
  type: "up" | "down"
): Promise<void> {
  try {
    if (type === "up") {
      console.log(
        "▶️ ",
        "Adding stockAdditionalPriceCents to model variations..."
      );

      const variationsToUpdate = await db
        .collection("modelvariations")
        .find({ stockAdditionalPriceCents: { $exists: false } }, { session })
        .project({ _id: 1, additionalPriceCents: 1 })
        .toArray();

      if (variationsToUpdate.length === 0) {
        console.log(
          "✅ ",
          "All model variations already have stockAdditionalPriceCents field. No updates needed."
        );
        return;
      }

      const bulkOps = variationsToUpdate.map((variation) => {
        const maxPrice = variation.additionalPriceCents || 0;
        const randomStockPrice = randNum(0, maxPrice + 100);

        return {
          updateOne: {
            filter: { _id: variation._id },
            update: { $set: { stockAdditionalPriceCents: randomStockPrice } },
          },
        };
      });

      await db.collection("modelvariations").bulkWrite(bulkOps, { session });

      console.log(
        "✅ ",
        "Added stockAdditionalPriceCents to all model variations."
      );
      return;
    }

    console.log(
      "▶️ ",
      "Removing stockAdditionalPriceCents from model variations..."
    );
    await db.collection("modelvariations").updateMany(
      {},
      {
        $unset: { stockAdditionalPriceCents: "" },
      },
      { session }
    );
    console.log(
      "✅ ",
      "Removed stockAdditionalPriceCents from all model variations."
    );
  } catch (error) {
    console.error(
      "❌ ",
      "Error in addStockAdditionalPriceCentsToModelVariations migration:",
      error
    );
    throw error;
  }
}

// Add "refreshRateHz" field to all product model documents with random value from the set [30, 60, 90, 120]
async function addRefreshRateHzToProductModels(
  db: mongoose.mongo.Db,
  session: mongoose.ClientSession,
  type: "up" | "down"
): Promise<void> {
  try {
    if (type === "up") {
      console.log("▶️ ", "Adding refreshRateHz to product models...");

      const modelsToUpdate = await db
        .collection("productmodels")
        .find({ "screen.refreshRateHz": { $exists: false } }, { session })
        .project({ _id: 1 })
        .toArray();
      if (modelsToUpdate.length === 0) {
        console.log(
          "✅ ",
          "All product models already have refreshRateHz field. No updates needed."
        );
        return;
      }

      const bulkOps = modelsToUpdate.map((model) => {
        return {
          updateOne: {
            filter: { _id: model._id },
            update: {
              $set: {
                "screen.refreshRateHz": faker.helpers.arrayElement(
                  PRODUCT_MOCK_OPTIONS.MODEL_SCREEN_REFRESH_RATE_OPTIONS
                ),
              },
            },
          },
        };
      });

      await db.collection("productmodels").bulkWrite(bulkOps, { session });
      console.log("✅ ", "Added refreshRateHz to all product models.");
      return;
    }

    console.log("▶️ ", "Removing refreshRateHz from product models...");
    await db
      .collection("productmodels")
      .updateMany({}, { $unset: { "screen.refreshRateHz": "" } }, { session });
    console.log("✅ ", "Removed refreshRateHz from all product models.");
  } catch (error) {
    console.error(
      "❌ ",
      "Error in addRefreshRateHzToProductModels migration:",
      error
    );
    throw error;
  }
}

console.log("🚀 ", "Starting migration script...");
await connectDB();

const db = mongoose.connection.db;
if (!db) {
  console.error(
    "❌ ",
    "You need to connect to the database first before running migrations!"
  );
  process.exit(1);
}

const session = mongoose.connection.getClient().startSession();
try {
  await session.withTransaction(async () => {
    // Run migrations here, passing the session to each function
    await addRefreshRateHzToProductModels(db, session, "up");
  });

  console.log("🎉 ", "Migrations completed!");
} catch (error) {
  console.error("❌ ", "Migration failed:", error);
} finally {
  await session.endSession();
  process.exit(0);
}
