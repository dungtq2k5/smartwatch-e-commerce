import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import { errorHandler } from "../../utils/errorHandler";
import ProductBrand from "../../models/product/productBrand.model";
import {
  ProductBrandCreate,
  ProductBrandListResponse,
  ProductBrandResponse,
  ProductBrandUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { formatProductBrandResponse } from "../../utils/utils";
import { Types } from "mongoose";
import Product from "../../models/product/product.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product brand...");
  const { name } = req.body as ProductBrandCreate;

  try {
    // Check brand exists
    const existingBrand = await ProductBrand.findOne({
      isDeleted: false,
      name,
    });
    if (existingBrand) {
      return next(errorHandler(404, "Product brand already exists."));
    }

    // Create brand
    const { userId } = req["auth"] as RequestAuth;
    const brand = new ProductBrand({
      name,
      createdBy: userId,
    });

    await brand.save();

    res.status(201).json({
      success: true,
      message: "Product brand created successfully.",
      data: formatProductBrandResponse(brand),
    } as SuccessResponse<ProductBrandResponse>);
    console.log("✅ ", "Product brand created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all product brands...");

  try {
    const brands = await ProductBrand.find({ isDeleted: false });

    res.status(200).json({
      success: true,
      message: "Product brands fetched successfully.",
      data: {
        total: brands.length,
        brands: brands.map(formatProductBrandResponse),
        offset: 0, // No pagination for this endpoint
        limit: brands.length, // Return all brands
      },
    } as SuccessResponse<ProductBrandListResponse>);
    console.log("✅ ", "Product brands fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product brand...");
  const { id } = req.params;

  try {
    // Check brand exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product brand not found."));
    }
    const brand = await ProductBrand.findById(id);
    if (!brand || brand.isDeleted) {
      return next(errorHandler(404, "Product brand not found."));
    }

    // Check if name is updated and exists
    const { name } = req.body as ProductBrandUpdate;
    if (name && name !== brand.name) {
      const existingBrand = await ProductBrand.findOne({
        isDeleted: false,
        name,
      });
      if (existingBrand) {
        return next(errorHandler(404, "Product brand already exists."));
      }
      brand.name = name;
    }

    await brand.save();

    res.status(200).json({
      success: true,
      message: "Product brand updated successfully.",
      data: formatProductBrandResponse(brand),
    } as SuccessResponse<ProductBrandResponse>);
    console.log("✅ ", "Product brand updated successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting product brand...");
  const { id } = req.params;

  try {
    // Check brand exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product brand not found."));
    }
    const brand = await ProductBrand.findById(id);
    if (!brand || brand.isDeleted) {
      return next(errorHandler(404, "Product brand not found."));
    }

    const userId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(brand, userId);

    res.status(200).json({
      success: true,
      message: "Product brand deleted successfully."
    } as SuccessResponse);
    console.log("✅ ", "Product brand deleted successfully.");
  } catch (error) {
    return next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(brandId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking brand constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - Products (brandId)
    */
    const constraintChecks = [Product.exists({ brandId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for brand: ${brandId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for brand: ${brandId}. Hard delete allowed.`
      );
    }
    return hasConstraints;
  } catch (error) {
    throw error;
  }
}

async function executeDeletion(
  brandToDelete: any,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(brandToDelete._id)) {
      // Soft delete
      brandToDelete.isDeleted = true;
      brandToDelete.deletedAt = new Date();
      brandToDelete.deletedBy = deletedBy;
      await brandToDelete.save();
      return;
    }

    await brandToDelete.deleteOne();
  } catch (error) {
    throw error;
  }
}
