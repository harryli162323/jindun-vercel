import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const systemAccounts = mysqlTable("system_accounts", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  spec: varchar("spec", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 64 }).notNull(),
  supplier: varchar("supplier", { length: 256 }).notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
  remark: text("remark"),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  warehouseAddress: varchar("warehouseAddress", { length: 512 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 128 }),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 256 }).notNull(),
  spec: varchar("spec", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 64 }).notNull(),
  supplier: varchar("supplier", { length: 256 }).notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
  quantity: int("quantity").notNull(),
  batchNo: varchar("batchNo", { length: 128 }).notNull(),
  productionDate: varchar("productionDate", { length: 20 }).notNull(),
  expiryDate: varchar("expiryDate", { length: 20 }).notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  customerName: varchar("customerName", { length: 256 }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  totalCost: decimal("totalCost", { precision: 14, scale: 2 }).notNull().default("0"),
  totalTax: decimal("totalTax", { precision: 14, scale: 2 }).notNull().default("0"),
  profit: decimal("profit", { precision: 14, scale: 2 }).notNull().default("0"),
  profitRate: decimal("profitRate", { precision: 8, scale: 2 }).notNull().default("0"),
  itemCount: int("itemCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const salesOrderItems = mysqlTable("sales_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 256 }).notNull(),
  spec: varchar("spec", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 64 }).notNull(),
  supplier: varchar("supplier", { length: 256 }).notNull(),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }).notNull(),
  batchNo: varchar("batchNo", { length: 128 }).notNull(),
  quantity: int("quantity").notNull(),
  salePrice: decimal("salePrice", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 14, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 14, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 256 }).notNull(),
  spec: varchar("spec", { length: 256 }).notNull(),
  unit: varchar("unit", { length: 64 }).notNull(),
  supplier: varchar("supplier", { length: 256 }).notNull(),
  batchNo: varchar("batchNo", { length: 128 }).notNull(),
  productionDate: varchar("productionDate", { length: 20 }).notNull(),
  expiryDate: varchar("expiryDate", { length: 20 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  inboundDate: timestamp("inboundDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
