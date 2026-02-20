import mongoose from "mongoose";

export const ROOT_URL = "/api/v1";

export const HASH_SALT = 10;
export const JWT_TTL = 15 * 60 * 1000; // 15 mins
export const JWT_NAME = "jwt";
export const REFRESH_JWT_NAME = "rt";
export const REFRESH_JWT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export const SYSTEM_USER = {
  fullName: "System User",
  email: "system@internal.app",
  gender: "other",
} as const;

export const ADMIN_USER = {
  fullName: "Admin User",
  email: "admin@internal.app",
  password: "a_very_secure_admin_password_123!@#",
  gender: "other",
} as const;

export const SYS_BUYER_ROLE = {
  name: "System Buyer",
};

export const SYS_ADMIN_ROLE = {
  name: "System Admin",
};

// Order is matter
export const PERMISSION_LIST = [
  // 68 permissions

  // Users
  { name: "create user", code: "c_usr" },
  { name: "read user", code: "r_usr" },
  { name: "update user", code: "u_usr" },
  { name: "delete user", code: "d_usr" },

  // User roles
  { name: "create user role", code: "c_usr_role" },
  { name: "read user role", code: "r_usr_role" },
  { name: "update user role", code: "u_usr_role" },
  { name: "delete user role", code: "d_usr_role" },

  // User addresses
  { name: "create user address", code: "c_usr_addr" },
  { name: "read user address", code: "r_usr_addr" },
  { name: "update user address", code: "u_usr_addr" },
  { name: "delete user address", code: "d_usr_addr" },

  // User payment methods
  { name: "create user payment method", code: "c_usr_paym" },
  { name: "read user payment method", code: "r_usr_paym" },
  { name: "update user payment method", code: "u_usr_paym" },
  { name: "delete user payment method", code: "d_usr_paym" },

  // User carts
  { name: "create user cart", code: "c_usr_cart" },
  { name: "read user cart", code: "r_usr_cart" },
  { name: "update user cart", code: "u_usr_cart" },
  { name: "delete user cart", code: "d_usr_cart" },

  // Orders (include order items, payment)
  { name: "create order", code: "c_order" },
  { name: "read order", code: "r_order" },
  { name: "update order", code: "u_order" },

  // Order returns
  { name: "create order return", code: "c_order_return" },
  { name: "read order return", code: "r_order_return" },
  { name: "update order return", code: "u_order_return" },

  // Products
  { name: "create product", code: "c_product" },
  { name: "read product", code: "r_product" },
  { name: "update product", code: "u_product" },
  { name: "delete product", code: "d_product" },

  // Product models
  { name: "create product model", code: "c_product_model" },
  { name: "read product model", code: "r_product_model" },
  { name: "update product model", code: "u_product_model" },
  { name: "delete product model", code: "d_product_model" },

  // Product model variations
  { name: "create model variation", code: "c_model_variation" },
  { name: "read model variation", code: "r_model_variation" },
  { name: "update model variation", code: "u_model_variation" },
  { name: "delete model variation", code: "d_model_variation" },

  // Product variation instances
  { name: "create variation instance", code: "c_variation_instance" },
  { name: "read variation instance", code: "r_variation_instance" },
  { name: "update variation instance", code: "u_variation_instance" },
  { name: "delete variation instance", code: "d_variation_instance" },

  // Product categories
  { name: "create product category", code: "c_product_cat" },
  { name: "read product category", code: "r_product_cat" },
  { name: "update product category", code: "u_product_cat" },
  { name: "delete product category", code: "d_product_cat" },

  // Product brands
  { name: "create product brand", code: "c_product_brand" },
  { name: "read product brand", code: "r_product_brand" },
  { name: "update product brand", code: "u_product_brand" },
  { name: "delete product brand", code: "d_product_brand" },

  // Product OS
  { name: "create product os", code: "c_product_os" },
  { name: "read product os", code: "r_product_os" },
  { name: "update product os", code: "u_product_os" },
  { name: "delete product os", code: "d_product_os" },

  // GRN (Goods Receipt Note)
  { name: "create grn", code: "c_grn" },
  { name: "read grn", code: "r_grn" },
  { name: "update grn", code: "u_grn" },

  // Provider Inventory
  { name: "create provider inventory", code: "c_provider_inventory" },
  { name: "read provider inventory", code: "r_provider_inventory" },
  { name: "update provider inventory", code: "u_provider_inventory" },
  { name: "delete provider inventory", code: "d_provider_inventory" },

  // User bank account
  { name: "create user bank account", code: "c_usr_bankacc" },
  { name: "read user bank account", code: "r_usr_bankacc" },
  { name: "update user bank account", code: "u_usr_bankacc" },
  { name: "delete user bank account", code: "d_usr_bankacc" },

  // Withdrawal request
  { name: "create withdrawal request", code: "c_withdrawal_req" },
  { name: "read withdrawal request", code: "r_withdrawal_req" },
  { name: "update withdrawal request", code: "u_withdrawal_req" },
] as const;

export const BUYER_PERMISSION_LIST = [
  PERMISSION_LIST[1], // read user
  PERMISSION_LIST[2], // update user
  PERMISSION_LIST[3], // delete user

  PERMISSION_LIST[8], // create user address
  PERMISSION_LIST[9], // read user address
  PERMISSION_LIST[10], // update user address
  PERMISSION_LIST[11], // delete user address

  PERMISSION_LIST[12], // create user payment method
  PERMISSION_LIST[13], // read user payment method
  PERMISSION_LIST[14], // update user payment method
  PERMISSION_LIST[15], // delete user payment method

  PERMISSION_LIST[16], // create user cart
  PERMISSION_LIST[17], // read user cart
  PERMISSION_LIST[18], // update user cart
  PERMISSION_LIST[19], // delete user cart

  PERMISSION_LIST[20], // create order
  PERMISSION_LIST[21], // read order
  PERMISSION_LIST[22], // update order

  PERMISSION_LIST[23], // create order payment
  PERMISSION_LIST[24], // read order payment
  PERMISSION_LIST[25], // update order payment
  PERMISSION_LIST[26], // delete order payment

  PERMISSION_LIST[27], // create order return
  PERMISSION_LIST[28], // read order return
  PERMISSION_LIST[29], // update order return

  PERMISSION_LIST[61], // create user bank account
  PERMISSION_LIST[62], // read user bank account
  PERMISSION_LIST[63], // update user bank account
  PERMISSION_LIST[64], // delete user bank account

  PERMISSION_LIST[65], // create withdrawal request
  PERMISSION_LIST[66], // read withdrawal request
  PERMISSION_LIST[67], // update withdrawal request
] as const;

export const ORDER_VARIATION_INSTANCE_STATES = [
  {
    name: "ordered",
    description: "The item has been ordered.",
  },
  {
    name: "return pending",
    description: "The customer has request a return for this item.",
  },
  {
    name: "returned",
    description: "The item has been successfully returned and processed.",
  },
  {
    name: "return declined",
    description: "The return request for this item has been declined.",
  },
  {
    name: "cancelled",
    description: "The item has been cancelled before shipping.",
  },
] as const;

export const RETURN_POLICY_DAYS = 14; // Return window is 14 days after reception

export const USER_PAYMENT_METHOD_TYPES = ["card"] as const;

export const OPTIMIZE_CREATED_BY_PIPELINE: mongoose.PipelineStage.Project = {
  $project: {
    _id: 1,
    fullName: 1,
  },
};

export const OPTIMIZE_PIPELINE: mongoose.PipelineStage.Project = {
  $project: {
    isDeleted: 0,
    deletedAt: 0,
    deletedBy: 0,
    __v: 0,
  },
};

export const DEFAULT_SEARCH_LIMIT = 9;
