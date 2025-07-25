import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../../utils/types";
import { errorHandler } from "../../utils/errorHandler";
import ProductOs from "../../models/product/productOs.model";
import {
  ProductOsCreate,
  ProductOsListResponse,
  ProductOsResponse,
  ProductOsUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { formatProductOsResponse } from "../../utils/utils";
import { Types } from "mongoose";
import ProductModel from "../../models/product/productModel.model";
import { deleteFileFromFirebaseStorage } from "../../utils/firebase";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product os...");
  const { name, logoUrl, description } = req.body as ProductOsCreate;

  try {
    // Check os exists
    const existingOs = await ProductOs.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingOs) {
      return next(errorHandler(409, "Product os already exists."));
    }

    // Create os
    const { userId } = req["auth"] as RequestAuth;
    const os = new ProductOs({
      name,
      logoUrl: logoUrl || undefined,
      description: description || undefined,
      createdBy: userId,
    });

    await os.save();

    res.status(201).json({
      success: true,
      message: "Product os created successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os created successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all product os...");

  try {
    const os = await ProductOs.find({ isDeleted: false });

    res.status(200).json({
      success: true,
      message: "Product os fetched successfully.",
      data: {
        osList: {
          total: os.length,
          osList: os.map(formatProductOsResponse),
        },
        offset: 0, // No pagination for this endpoint
        limit: os.length, // Return all os
        total: os.length,
      },
    } as SuccessResponse<ProductOsListResponse>);
    console.log("✅ ", "Product os fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating product os...");
  const { id } = req.params;

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product os not found."));
    }
    const os = await ProductOs.findById(id);
    if (!os || os.isDeleted) {
      return next(errorHandler(404, "Product os not found."));
    }

    // Check if name is updated and exists
    const updateData = req.body as ProductOsUpdate;

    const updatedName = updateData.name || os.name;
    const updatedLogoUrl =
      updateData.logoUrl === null
        ? undefined
        : updateData.logoUrl || (os.logoUrl as string | undefined);
    const updatedDescription =
      updateData.description || (os.description as string | undefined);

    if (updatedName !== os.name) {
      const existingOs = await ProductOs.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingOs) {
        return next(errorHandler(409, "Product os already exists."));
      }
    }

    if (updatedLogoUrl !== os.logoUrl && os.logoUrl) {
      await deleteFileFromFirebaseStorage(os.logoUrl, "product-image");
    }

    os.name = updatedName;
    os.logoUrl = updatedLogoUrl;
    os.description = updatedDescription;

    await os.save();

    res.status(200).json({
      success: true,
      message: "Product os updated successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os updated successfully.");
  } catch (error) {
    return next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting product os...");
  const { id } = req.params;

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Product os not found."));
    }
    const os = await ProductOs.findById(id);
    if (!os || os.isDeleted) {
      return next(errorHandler(404, "Product os not found."));
    }

    const userId = new Types.ObjectId((req["auth"] as RequestAuth).userId);
    await executeDeletion(os, userId);

    res.status(200).json({
      success: true,
      message: "Product os deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product os deleted successfully.");
  } catch (error) {
    return next(error);
  }
}

// --- HELPER FUNCTIONS ---
async function hasConstraints(osId: Types.ObjectId): Promise<boolean> {
  console.log("▶️ ", "Checking os constraints...");

  try {
    /**
      None-blocking constraints: none
      Blocking constraints:
        - ProductModel (osId)
    */
    const constraintChecks = [ProductModel.exists({ osId })];

    const results = await Promise.all(constraintChecks);
    const hasConstraints = results.some((result) => result !== null);

    if (hasConstraints) {
      console.log(
        `▶️ `,
        `Critical constraints found for os: ${osId}. Soft delete required.`
      );
    } else {
      console.log(
        `✅ `,
        `No critical constraints found for os: ${osId}. Hard delete allowed.`
      );
    }
    return hasConstraints;
  } catch (error) {
    throw new Error(error);
  }
}

async function executeDeletion(
  osToDelete: any,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(osToDelete._id)) {
      // Soft delete
      osToDelete.isDeleted = true;
      osToDelete.deletedAt = new Date();
      osToDelete.deletedBy = deletedBy;
      await osToDelete.save();
      return;
    }

    if (osToDelete.logoUrl) {
      await deleteFileFromFirebaseStorage(osToDelete.logoUrl, "product-image");
    }
    await osToDelete.deleteOne();
  } catch (error) {
    throw new Error(error);
  }
}
