import { Request, Response, NextFunction } from "express";
import {
  RoleCreate,
  RoleListResponse,
  RoleResponse,
  RoleUpdate,
  SuccessResponse,
} from "../../common/types.common";
import Role from "../models/role/role.model";
import mongoose, { Types } from "mongoose";
import { formatRoleResponse, isPresent } from "../utils/utils";
import { HttpError } from "../utils/errorHandler";
import Permission from "../models/role/permission.model";
import User from "../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating a new role...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { name, permissionIds } = req.body as RoleCreate;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check role exists
    const existingRole = await Role.findOne({ name }).lean().session(session);
    if (existingRole) {
      throw new HttpError(409, `Role with name '${name}' already exists.`);
    }

    // Check permissions exist and create permission list
    const reqUserIdObjId = new Types.ObjectId(reqUserId);
    let permissions: { id: Types.ObjectId; assignedBy: Types.ObjectId }[] = [];
    if (permissionIds) {
      if (permissionIds.length > 0) {
        const permissionCount = await Permission.countDocuments({
          _id: { $in: permissionIds },
        }).session(session);
        if (permissionCount !== permissionIds.length) {
          throw new HttpError(400, "One or more permissions do not exist.");
        }
      }

      permissions = permissionIds.map((id) => ({
        id: new Types.ObjectId(id),
        assignedBy: reqUserIdObjId,
      }));
    }

    const newRole = new Role({
      name,
      permissions,
      createdBy: reqUserIdObjId,
    });

    await newRole.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: formatRoleResponse(newRole),
    } as SuccessResponse<RoleResponse>);
    console.log("✅ ", "Role created successfully:", newRole.name);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching role details...");
  const { id } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Role not found.");
    }
    const role = await Role.findById(id).lean();
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    res.status(200).json({
      success: true,
      message: "Role details fetched successfully.",
      data: formatRoleResponse(role),
    } as SuccessResponse<RoleResponse>);
    console.log("✅ ", "Role details fetched successfully:", role.name);
  } catch (error) {
    next(error);
  }
}

export async function getAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Fetching all roles...");
  try {
    const roles = await Role.find().sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      message: "Roles fetched successfully.",
      data: {
        total: roles.length,
        roles: roles.map(formatRoleResponse),
      },
    } as SuccessResponse<RoleListResponse>);
    console.log("✅ ", "Roles fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Updating role...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares."
      )
    );
  }
  const { id } = req.params;

  try {
    // Check role exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Role not found.");
    }
    const role = await Role.findById(id);
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    // Business logic
    const { name, permissionIds: updatedPermissionIds } =
      req.body as RoleUpdate;

    const updatedName = name || role.name;
    if (updatedName !== role.name) {
      const existingRole = await Role.findOne({ name: updatedName }).lean();
      if (existingRole) {
        throw new HttpError(
          409,
          `Role with name '${updatedName}' already exists.`
        );
      }
      role.name = updatedName;
    }

    if (updatedPermissionIds === null) {
      role.permissions?.splice(0, role.permissions.length); // Clear all permissions
    } else if (updatedPermissionIds) {
      const currentPermissionIds = role.permissions.map(
        (p) => p.id.toString() as string
      );

      // Permission to add
      const permissionIdsToAdd = updatedPermissionIds.filter(
        (id) => !currentPermissionIds.includes(id)
      );
      if (permissionIdsToAdd.length > 0) {
        const permissionCount = await Permission.countDocuments({
          _id: { $in: permissionIdsToAdd },
        });
        if (permissionCount !== permissionIdsToAdd.length) {
          throw new HttpError(400, "One or more permissions do not exist.");
        }

        const reqUserIdObjId = new Types.ObjectId(reqUserId);
        role.permissions.push(
          ...permissionIdsToAdd.map((id) => ({
            id: new Types.ObjectId(id),
            assignedBy: reqUserIdObjId,
            assignedAt: new Date(),
          }))
        );
      }

      // Permission to remove
      const permissionIdsToRemove = currentPermissionIds.filter(
        (id) => !updatedPermissionIds.includes(id)
      );
      if (permissionIdsToRemove.length > 0) {
        role.permissions = role.permissions.filter(
          (permission) =>
            !permissionIdsToRemove.includes(permission.id.toString())
        );
      }
    }

    await role.save();

    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: formatRoleResponse(role),
    } as SuccessResponse<RoleResponse>);
    console.log("✅ ", "Role updated successfully:", role.name);
  } catch (error) {
    next(error);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Deleting role...");
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check role exists
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpError(404, "Role not found.");
    }
    const role = await Role.findById(id).session(session);
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    // Remove the role from all users who have it assigned
    // The $pull operator removes all instances from an array that match a condition.
    // This is done atomically within the transaction.
    await User.updateMany(
      { "roles.id": role._id },
      { $pull: { roles: { id: role._id } } },
      { session }
    );

    // Delete the role
    await role.deleteOne({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    } as SuccessResponse<null>);
    console.log("✅ ", "Role deleted successfully:", role.name);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
