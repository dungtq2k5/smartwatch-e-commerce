export const HASH_SALT = 10;
export const JWT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const JWT_NAME = "auth_token";

export const SYSTEM_USER = {
  fullName: "System User",
  email: "system@internal.app",
} as const;

export const ADMIN_USER = {
  fullName: "Admin User",
  email: "admin@internal.app",
  password: "a_very_secure_admin_password_123!@#",
} as const;

export const PERMISSION_LIST = [ // 60 permissions
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

  // Orders (include order items)
  { name: "create order", code: "c_order" },
  { name: "read order", code: "r_order" },
  { name: "update order", code: "u_order" },

  // Order payments
  { name: "create order payment", code: "c_order_paym" },
  { name: "read order payment", code: "r_order_paym" },
  { name: "update order payment", code: "u_order_paym" },
  { name: "delete order payment", code: "d_order_paym" },

  // Order returns
  { name: "create order return", code: "c_order_return" },
  { name: "read order return", code: "r_order_return" },
  { name: "update order return", code: "u_order_return" },

  // Order refunds
  { name: "create order refund", code: "c_order_refund" },
  { name: "read order refund", code: "r_order_refund" },
  { name: "update order refund", code: "u_order_refund" },

  // Products
  { name: "create product", code: "c_product" },
  { name: "read product", code: "r_product" },
  { name: "update product", code: "u_product" },
  { name: "delete product", code: "d_product" },

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

  // Product variations (include variation colors and variation bands)
  { name: "create product variation", code: "c_product_variation" },
  { name: "read product variation", code: "r_product_variation" },
  { name: "update product variation", code: "u_product_variation" },
  { name: "delete product variation", code: "d_product_variation" },

  // GRN (Goods Receipt Note)
  { name: "create grn", code: "c_grn" },
  { name: "read grn", code: "r_grn" },
  { name: "update grn", code: "u_grn" },

  // Provider Inventory
  { name: "create provider inventory", code: "c_provider_inventory" },
  { name: "read provider inventory", code: "r_provider_inventory" },
  { name: "update provider inventory", code: "u_provider_inventory" },
  { name: "delete provider inventory", code: "d_provider_inventory" },
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

  PERMISSION_LIST[30], // create order refund
  PERMISSION_LIST[31], // read order refund
  PERMISSION_LIST[32], // update order refund
] as const;
