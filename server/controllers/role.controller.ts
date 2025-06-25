import { Request, Response, NextFunction } from "express";
import { RequestAuth } from "../utils/types";
import {
  RoleCreate,
  RoleListResponse,
  RoleResponse,
  RoleUpdate,
  SuccessResponse,
} from "../../common/types.common";
import Role from "../models/role/role.model";
import mongoose, { Types } from "mongoose";
import { formatRoleResponse } from "../utils/utils";
import { errorHandler } from "../utils/errorHandler";
import Permission from "../models/role/permission.model";
import { compareArrays, getArrayDifferences } from "../../common/utils.common";
import User from "../models/user/user.model";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log("▶️ ", "Creating a new role...");
  const { name, permissionIds } = req.body as RoleCreate;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    // Check role exists
    const existingRole = await Role.findOne({ name }).session(session);
    if (existingRole) {
      return next(
        errorHandler(400, `Role with name '${name}' already exists.`)
      );
    }

    // Check permissions exist and create permission list
    const { userId: reqUserId } = req["auth"] as RequestAuth;
    let permissions: { id: Types.ObjectId; assignedBy: Types.ObjectId }[] = [];
    if (permissionIds) {
      if (permissionIds.length > 0) {
        const permissionCount = await Permission.countDocuments({
          _id: { $in: permissionIds },
        }).session(session);

        if (permissionCount !== permissionIds.length) {
          return next(
            errorHandler(400, "One or more permissions do not exist.")
          );
        }
      }

      permissions = permissionIds.map((id) => ({
        id: new Types.ObjectId(id),
        assignedBy: new Types.ObjectId(reqUserId),
      }));
    }

    const [newRole] = await Role.create(
      [
        {
          name,
          permissions,
          createdBy: new Types.ObjectId(reqUserId),
        },
      ],
      { session }
    );

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
      return next(errorHandler(404, "Role not found."));
    }
    const role = await Role.findById(id);
    if (!role) {
      return next(errorHandler(404, "Role not found."));
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
    const roles = await Role.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      message: "Roles fetched successfully.",
      data: {
        roles: roles.map(formatRoleResponse),
        total: roles.length,
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
  const { id } = req.params;

  try {
    // Check role exists
    if (!Types.ObjectId.isValid(id)) {
      return next(errorHandler(404, "Role not found."));
    }
    const role = await Role.findById(id);
    if (!role) {
      return next(errorHandler(404, "Role not found."));
    }

    // Business logic
    const { name, permissionIds } = req.body as RoleUpdate;
    const updatedName = name ? name : role.name;

    if (updatedName !== role.name) {
      const existingRole = await Role.findOne({ name: updatedName });
      if (existingRole) {
        return next(
          errorHandler(400, `Role with name '${updatedName}' already exists.`)
        );
      }
      role.name = updatedName;
    }

    const rolePermissionIds = role.permissions.map(
      (p) => p.id.toString() as string
    );
    const updatedPermissionIds = permissionIds
      ? permissionIds
      : rolePermissionIds;
    /*
      Permissions change scenarios:
        - From [a, b, c] to []
        - From [a, b, c] to [a, b, c]
        - From [] to [a, b, c]
        - From [a] to [a, b, c]
        - From [a, b, c] to [a, c]
        - From [a, b, c] to [b, c, d]
    */
    if (!compareArrays(rolePermissionIds, updatedPermissionIds)) {
      // Remove case
      const permissionIdsRemove = getArrayDifferences(
        rolePermissionIds,
        updatedPermissionIds,
        true,
        false
      );
      if (permissionIdsRemove.length > 0) {
        permissionIdsRemove.forEach((removeId) => {
          role.permissions.pull({ id: new Types.ObjectId(removeId) });
        });
      }
      // Add case
      const permissionIdsAdd = getArrayDifferences(
        rolePermissionIds,
        updatedPermissionIds,
        false,
        true
      );
      if (permissionIdsAdd.length > 0) {
        const permissionCount = await Permission.countDocuments({
          _id: { $in: permissionIdsAdd },
        });
        if (permissionCount !== permissionIdsAdd.length) {
          return next(
            errorHandler(400, "One or more permissions do not exist.")
          );
        }
        const { userId: reqUserId } = req["auth"] as RequestAuth;
        role.permissions.push(
          ...permissionIdsAdd.map((id) => ({
            id: new Types.ObjectId(id),
            assignedBy: new Types.ObjectId(reqUserId),
          }))
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
      return next(errorHandler(404, "Role not found."));
    }
    const role = await Role.findById(id).session(session);
    if (!role) {
      return next(errorHandler(404, "Role not found."));
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
