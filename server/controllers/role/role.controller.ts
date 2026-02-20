import e, { Request, Response, NextFunction } from "express";
import {
  RoleBulkDelete,
  RoleCreate,
  RoleDetailsResponse,
  RoleListResponse,
  RoleListResponseLight,
  RoleResponse,
  RoleSearchQuery,
  RoleUpdate,
  SuccessResponse,
} from "../../../common/types.common";
import Role from "../../models/role/role.model";
import mongoose, { Types } from "mongoose";
import {
  formatRoleDetailsResponse,
  formatRoleResponse,
  formatRoleResponseLight,
  getPermission,
  getSysAdminRoleId,
  getSysBuyerRoleId,
  isPresent,
} from "../../utils/utils";
import { HttpError } from "../../utils/errorHandler";
import Permission from "../../models/role/permission.model";
import User from "../../models/user/user.model";
import {
  DEFAULT_SEARCH_LIMIT,
  OPTIMIZE_CREATED_BY_PIPELINE,
  OPTIMIZE_PIPELINE,
} from "../../configs/configs";
import { MAX_ROLES_TO_DELETE_BULK } from "../../../common/configs.common";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Creating a new role...");

  const reqUser = req["user"];
  if (!isPresent(reqUser)) {
    return next(
      new HttpError(
        500,
        "Request user not found, this should be handled by middlewares.",
      ),
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
        assignedBy: reqUser._id,
      }));
    }

    const newRole = new Role({
      name,
      permissions,
      createdBy: reqUser._id,
    });

    await newRole.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Role created successfully.",
      data: formatRoleResponse({
        ...newRole.toObject(),
        createdBy: {
          id: reqUser._id,
          fullName: reqUser.fullName,
        },
      }),
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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching role details...");
  const { roleId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(roleId)) {
      throw new HttpError(404, "Role not found.");
    }
    const role = await Role.aggregate([
      { $match: { _id: new Types.ObjectId(roleId) } },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$createdBy" },
    ]).then((results) => results[0]);
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
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all roles...");
  try {
    const roles = await Role.find()
      .select("_id name permissions")
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Roles fetched successfully.",
      data: {
        total: roles.length,
        roles: roles.map(formatRoleResponseLight),
      },
    } as SuccessResponse<RoleListResponseLight>);
    console.log("✅ ", "Roles fetched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function getDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Fetching all roles with details...");
  const { roleId } = req.params;

  try {
    // Check exists
    if (!Types.ObjectId.isValid(roleId)) {
      throw new HttpError(404, "Role not found.");
    }

    const role = await Role.findById(roleId)
      .populate("createdBy", "_id fullName")
      .populate("permissions.assignedBy", "_id fullName")
      .lean();
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    // Add "name" and "code" fields to each permission in the permission list
    role.permissions = role.permissions.map((p) => {
      const { name, code } = getPermission(p.id);
      return { ...p, name, code };
    });

    res.status(200).json({
      success: true,
      message: "Role details fetched successfully.",
      data: formatRoleDetailsResponse(role),
    } as SuccessResponse<RoleDetailsResponse>);
    console.log("✅ ", "Role details fetched successfully");
  } catch (error) {
    next(error);
  }
}

export async function search(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Searching roles...");
  const reqQuery = req["sanitizedQuery"] as RoleSearchQuery;

  const limit = reqQuery.limit
    ? Number.parseInt(reqQuery.limit, 10)
    : DEFAULT_SEARCH_LIMIT;
  const offset = reqQuery.offset ? Number.parseInt(reqQuery.offset, 10) : 0;
  const query: any = {};

  const searchTerm = reqQuery.searchTerm;
  if (searchTerm) {
    query.$or = [
      {
        _id: Types.ObjectId.isValid(searchTerm)
          ? new Types.ObjectId(searchTerm)
          : undefined,
      },
      { name: { $regex: searchTerm, $options: "i" } },
    ];
  }

  const sort = (reqQuery.sortBy || "createdAt").split("_");
  const sortField = sort[0];
  const sortBy = sort[1] === "desc" ? -1 : 1;
  const sortStage: any = { [sortField]: sortBy, _id: 1 };

  try {
    const aggregateResult = await Role.aggregate([
      { $match: query },
      OPTIMIZE_PIPELINE,
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
          pipeline: [OPTIMIZE_CREATED_BY_PIPELINE],
        },
      },
      { $unwind: "$createdBy" },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $sort: sortStage }, { $skip: offset }, { $limit: limit }],
        },
      },
    ]).then((results) => results[0]);

    const roles: RoleResponse[] = aggregateResult.data.map(formatRoleResponse);
    const total = aggregateResult.metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      message: "Roles searched successfully.",
      data: {
        total,
        roles: {
          total: roles.length,
          roles,
        },
        offset,
        limit,
      },
    } as SuccessResponse<RoleListResponse>);
    console.log("✅ ", "Roles searched successfully.");
  } catch (error) {
    next(error);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Updating role...");

  const reqUserId = req["auth"]?.userId;
  if (!isPresent(reqUserId)) {
    return next(
      new HttpError(
        500,
        "User ID not found, this should be handled by middlewares.",
      ),
    );
  }
  const { roleId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check role exists
    if (!Types.ObjectId.isValid(roleId)) {
      throw new HttpError(404, "Role not found.");
    }

    // Check if is system roles -> cannot update system roles
    if(getSysBuyerRoleId().equals(roleId) || getSysAdminRoleId().equals(roleId)) {
      throw new HttpError(403, "System roles cannot be updated.");
    }

    const role = await Role.findById(roleId).session(session);
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    // Business logic
    const { name, permissionIds: updatedPermissionIds } =
      req.body as RoleUpdate;

    const updatedName = name || role.name;
    if (updatedName !== role.name) {
      const existingRole = await Role.findOne({ name: updatedName })
        .session(session)
        .lean();
      if (existingRole) {
        throw new HttpError(
          409,
          `Role with name '${updatedName}' already exists.`,
        );
      }
      role.name = updatedName;
    }

    if (updatedPermissionIds === null) {
      role.permissions?.splice(0, role.permissions.length); // Clear all permissions
    } else if (updatedPermissionIds) {
      const currentPermissionIds = role.permissions.map(
        (p) => p.id.toString() as string,
      );

      // Permission to add
      const permissionIdsToAdd = updatedPermissionIds.filter(
        (id) => !currentPermissionIds.includes(id),
      );
      if (permissionIdsToAdd.length > 0) {
        const permissionCount = await Permission.countDocuments(
          {
            _id: { $in: permissionIdsToAdd },
          },
          { session },
        );
        if (permissionCount !== permissionIdsToAdd.length) {
          throw new HttpError(400, "One or more permissions do not exist.");
        }

        const reqUserIdObjId = new Types.ObjectId(reqUserId);
        role.permissions.push(
          ...permissionIdsToAdd.map((id) => ({
            id: new Types.ObjectId(id),
            assignedBy: reqUserIdObjId,
            assignedAt: new Date(),
          })),
        );
      }

      // Permission to remove
      const permissionIdsToRemove = currentPermissionIds.filter(
        (id) => !updatedPermissionIds.includes(id),
      );
      if (permissionIdsToRemove.length > 0) {
        role.permissions = role.permissions.filter(
          (permission) =>
            !permissionIdsToRemove.includes(permission.id.toString()),
        );
      }
    }

    await role.save({ session });

    const createdByUser = await User.findById(role.createdBy)
      .select("_id fullName")
      .lean()
      .session(session);
    if (!createdByUser) {
      throw new HttpError(500, "Creator user not found.");
    }

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Role updated successfully.",
      data: formatRoleResponse({
        ...role.toObject(),
        createdBy: {
          id: createdByUser._id,
          fullName: createdByUser.fullName,
        },
      }),
    } as SuccessResponse<RoleResponse>);
    console.log("✅ ", "Role updated successfully");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Deleting role...");
  const { roleId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check role exists
    if (!Types.ObjectId.isValid(roleId)) {
      throw new HttpError(404, "Role not found.");
    }

    // Check if is system roles -> cannot delete system roles
    if(getSysBuyerRoleId().equals(roleId) || getSysAdminRoleId().equals(roleId)) {
      throw new HttpError(403, "System roles cannot be deleted.");
    }

    const role = await Role.findById(roleId).session(session);
    if (!role) {
      throw new HttpError(404, "Role not found.");
    }

    // Remove the role from all users who have it assigned
    // The $pull operator removes all instances from an array that match a condition.
    // This is done atomically within the transaction.
    await User.updateMany(
      { "roles.id": role._id },
      { $pull: { roles: { id: role._id } } },
      { session },
    );

    // Delete the role
    await role.deleteOne({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Role deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Role deleted successfully:", role.name);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

export async function removeBulk(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  console.log("▶️ ", "Bulk deleting roles...");

  const { roleIds: roleIdsToDelete } = req.body as RoleBulkDelete;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (roleIdsToDelete.length > MAX_ROLES_TO_DELETE_BULK) {
      throw new HttpError(
        400,
        `Cannot delete more than ${MAX_ROLES_TO_DELETE_BULK} roles at once.`,
      );
    }

    // If system roles are included in the deletion list, reject the request
    const [sysBuyerRoleId, sysAdminRoleId] = [getSysBuyerRoleId(), getSysAdminRoleId()];
    if (roleIdsToDelete.some((id) => sysBuyerRoleId.equals(id) || sysAdminRoleId.equals(id))) {
      throw new HttpError(403, "System roles cannot be deleted.");
    }

    // Remove the roles from all users who have them assigned
    await User.updateMany(
      { "roles.id": { $in: roleIdsToDelete } },
      { $pull: { roles: { id: { $in: roleIdsToDelete } } } },
      { session },
    );

    // Delete roles, if role not found, skip
    await Role.deleteMany({ _id: { $in: roleIdsToDelete } }, { session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Roles deleted successfully.",
    } as SuccessResponse);
    console.log("✅ ", "Roles deleted successfully");
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}
