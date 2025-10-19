import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../utils/errorHandler";
import ProductOs, { IProductOs } from "../../models/product/productOs.model";
import {
  ProductOsCreate,
  ProductOsListResponse,
  ProductOsResponse,
  ProductOsUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import { formatProductOsResponse, isPresent } from "../../utils/utils";
import { Types } from "mongoose";
import ProductModel from "../../models/product/productModel.model";
import { deleteFileFromFirebaseStorage } from "../../utils/firebase";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating product os...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { name, logoUrl, description } = req.body as ProductOsCreate;

  try {
    // Check os exists
    const existingOs = await ProductOs.findOne({
      isDeleted: false,
      name,
    }).lean();
    if (existingOs) {
      throw new HttpError(409, "Product os already exists.");
    }

    // Create os
    const os = new ProductOs({
      name,
      logoUrl,
      description,
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

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching product os...");
  const { osId } = req.params;

  try {
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId).lean();
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }
    res.status(200).json({
      success: true,
      message: "Product os fetched successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os fetched successfully.");
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
    const oses = await ProductOs.find({ isDeleted: false }).lean();

    res.status(200).json({
      success: true,
      message: "Product oses fetched successfully.",
      data: {
        oses: {
          total: oses.length,
          oses: oses.map(formatProductOsResponse),
        },
        offset: 0,
        limit: oses.length,
        total: oses.length,
      },
    } as SuccessResponse<ProductOsListResponse>);
    console.log("✅ ", "Product oses fetched successfully.");
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
  const { osId } = req.params;

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId);
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }

    // Check if name is updated and exists
    const updateData = req.body as ProductOsUpdate;

    const updatedName = updateData.name || os.name;
    if (updatedName !== os.name) {
      const existingOs = await ProductOs.findOne({
        isDeleted: false,
        name: updatedName,
      }).lean();
      if (existingOs) {
        throw new HttpError(409, "Product os already exists.");
      }
    }

    const updatedLogoUrl =
      updateData.logoUrl === null ? null : updateData.logoUrl || os.logoUrl;
    if (updatedLogoUrl !== os.logoUrl && os.logoUrl) {
      await deleteFileFromFirebaseStorage(os.logoUrl, "product-image");
    }

    os.name = updatedName;
    os.logoUrl = updatedLogoUrl;
    os.description =
      updateData.description === null
        ? null
        : updateData.description || os.description;

    await os.save();

    res.status(200).json({
      success: true,
      message: "Product os updated successfully.",
      data: formatProductOsResponse(os),
    } as SuccessResponse<ProductOsResponse>);
    console.log("✅ ", "Product os updated successfully.");
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting product os...");

  const userId = req["auth"]?.userId;
  if (!isPresent(userId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled in middlewares."
      )
    );
  }
  const { osId } = req.params;

  try {
    // Check os exists
    if (!Types.ObjectId.isValid(osId)) {
      throw new HttpError(404, "Product os not found.");
    }
    const os = await ProductOs.findById(osId);
    if (!os || os.isDeleted) {
      throw new HttpError(404, "Product os not found.");
    }

    await executeDeletion(os, new Types.ObjectId(userId));

    res.status(200).json({
      success: true,
      message: "Product os deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Product os deleted successfully.");
  } catch (error) {
    next(error);
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
    const constraintChecks = [ProductModel.exists({ "config.osId": osId })];

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
    console.error("❌ ", "Error checking os constraints:", error);
    throw error;
  }
}

async function executeDeletion(
  osToDelete: IProductOs,
  deletedBy: Types.ObjectId
): Promise<void> {
  try {
    if (await hasConstraints(osToDelete._id)) {
      // Soft delete
      await ProductOs.findByIdAndUpdate(osToDelete._id, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      });
      return;
    }

    if (osToDelete.logoUrl) {
      await deleteFileFromFirebaseStorage(osToDelete.logoUrl, "product-image");
    }

    await ProductOs.findByIdAndDelete(osToDelete._id);
  } catch (error) {
    console.error("❌ ", "Error deleting product os:", error);
    throw error;
  }
}
