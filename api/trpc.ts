import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { eq, and, or, like, desc, sql, gte, lte } from "drizzle-orm";
import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import * as jose from "jose";
import fs from "node:fs";
import path from "node:path";

const systemAccounts = mysqlTable("system_accounts", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const products = mysqlTable("products", {
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

const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  warehouseAddress: varchar("warehouseAddress", { length: 512 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 128 }),
  status: mysqlEnum("status", ["active", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNo: varchar("orderNo", { length: 32 }).notNull().unique(),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

const purchaseOrderItems = mysqlTable("purchase_order_items", {
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

const salesOrders = mysqlTable("sales_orders", {
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

const salesOrderItems = mysqlTable("sales_order_items", {
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

const inventory = mysqlTable("inventory", {
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

// ============ Database ============
let _db: ReturnType<typeof drizzle> | null = null;
let _localEnvLoaded = false;
const _localEnv = new Map<string, string>();

function loadLocalEnvIfNeeded() {
  if (_localEnvLoaded) return;
  _localEnvLoaded = true;

  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        _localEnv.set(key, value);
      }
    }
  }
}

function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  loadLocalEnvIfNeeded();
  return _localEnv.get(name);
}

function getDb() {
  if (!_db) {
    const url = readEnv("DATABASE_URL");
    if (!url) throw new Error("DATABASE_URL is not set");

    const parsed = new URL(url);
    const sslEnabled = parsed.searchParams.get("ssl") === "true";
    if (sslEnabled) parsed.searchParams.delete("ssl");

    const pool = mysql.createPool({
      uri: parsed.toString(),
      ...(sslEnabled ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    _db = drizzle(pool);
  }
  return _db;
}

// ============ JWT ============
const JWT_SECRET = readEnv("JWT_SECRET") || "jindun-fallback-secret-change-in-production";

async function signToken(username: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return await new jose.SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

async function verifyToken(token: string): Promise<{ username: string } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

// ============ tRPC Context ============
interface TrpcContext {
  username: string | null;
}

async function createContext(req: Request): Promise<TrpcContext> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return { username: null };
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  return { username: payload?.username ?? null };
}

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.username) throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  return next({ ctx: { ...ctx, username: ctx.username } });
});

// ============ DB Helpers ============
async function verifyAccount(username: string, password: string) {
  const db = getDb();
  const result = await db.select().from(systemAccounts).where(eq(systemAccounts.username, username)).limit(1);
  if (result.length === 0) return null;
  if (result[0].password !== password) return null;
  return result[0];
}

async function changePasswordDb(username: string, oldPassword: string, newPassword: string) {
  const db = getDb();
  const account = await verifyAccount(username, oldPassword);
  if (!account) return false;
  await db.update(systemAccounts).set({ password: newPassword }).where(eq(systemAccounts.username, username));
  return true;
}

async function getProductsDb(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const conditions: ReturnType<typeof eq>[] = [];
  if (params.status) conditions.push(eq(products.status, params.status as "active" | "disabled"));
  if (params.search) {
    conditions.push(
      or(
        like(products.name, `%${params.search}%`),
        like(products.supplier, `%${params.search}%`),
        like(products.spec, `%${params.search}%`)
      ) as any
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(products).where(where),
  ]);
  return { data, total: Number(countResult[0].count), page, pageSize };
}

async function getAllActiveProducts() {
  const db = getDb();
  return db.select().from(products).where(eq(products.status, "active")).orderBy(desc(products.createdAt));
}

async function createProductDb(data: { name: string; spec: string; unit: string; supplier: string; purchasePrice: string; remark?: string }) {
  const db = getDb();
  const existing = await db.select().from(products).where(and(eq(products.name, data.name), eq(products.spec, data.spec))).limit(1);
  if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "同名产品的规格型号已存在，请使用不同的规格型号" });
  const result = await db.insert(products).values(data as any);
  return { id: (result[0] as any).insertId };
}

async function updateProductDb(id: number, data: { name?: string; spec?: string; unit?: string; supplier?: string; purchasePrice?: string; remark?: string }) {
  const db = getDb();
  if (data.name || data.spec) {
    const current = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (current.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "产品不存在" });
    const checkName = data.name || current[0].name;
    const checkSpec = data.spec || current[0].spec;
    const existing = await db.select().from(products).where(and(eq(products.name, checkName), eq(products.spec, checkSpec), sql`id != ${id}`)).limit(1);
    if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "同名产品的规格型号已存在" });
  }
  await db.update(products).set(data as any).where(eq(products.id, id));
  return true;
}

async function deleteProductDb(id: number) {
  const db = getDb();
  const refs = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrderItems).where(eq(purchaseOrderItems.productId, id));
  if (Number(refs[0].count) > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "REFERENCED" });
  await db.delete(products).where(eq(products.id, id));
  return true;
}

async function disableProductDb(id: number) {
  const db = getDb();
  await db.update(products).set({ status: "disabled" }).where(eq(products.id, id));
  return true;
}

async function getCustomersDb(params: { page?: number; pageSize?: number; search?: string; status?: string }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (params.status) conditions.push(eq(customers.status, params.status as "active" | "disabled"));
  if (params.search) {
    conditions.push(
      or(
        like(customers.name, `%${params.search}%`),
        like(customers.warehouseAddress, `%${params.search}%`),
        like(customers.contactPerson, `%${params.search}%`)
      )
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(where),
  ]);
  return { data, total: Number(countResult[0].count), page, pageSize };
}

async function getAllActiveCustomers() {
  const db = getDb();
  return db.select().from(customers).where(eq(customers.status, "active")).orderBy(desc(customers.createdAt));
}

async function createCustomerDb(data: { name: string; warehouseAddress: string; contactPerson?: string }) {
  const db = getDb();
  const existing = await db.select().from(customers).where(and(eq(customers.name, data.name), eq(customers.warehouseAddress, data.warehouseAddress))).limit(1);
  if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "相同客户名称和仓库地址已存在" });
  const result = await db.insert(customers).values(data as any);
  return { id: (result[0] as any).insertId };
}

async function updateCustomerDb(id: number, data: { name?: string; warehouseAddress?: string; contactPerson?: string }) {
  const db = getDb();
  if (data.name && data.warehouseAddress) {
    const existing = await db.select().from(customers).where(and(eq(customers.name, data.name), eq(customers.warehouseAddress, data.warehouseAddress), sql`id != ${id}`)).limit(1);
    if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "相同客户名称和仓库地址已存在" });
  }
  await db.update(customers).set(data as any).where(eq(customers.id, id));
  return true;
}

async function deleteCustomerDb(id: number) {
  const db = getDb();
  const refs = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.customerId, id));
  if (Number(refs[0].count) > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "REFERENCED" });
  await db.delete(customers).where(eq(customers.id, id));
  return true;
}

async function disableCustomerDb(id: number) {
  const db = getDb();
  await db.update(customers).set({ status: "disabled" }).where(eq(customers.id, id));
  return true;
}

async function generatePurchaseOrderNo() {
  const db = getDb();
  const now = new Date();
  const dateStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 10).replace(/-/g, "");
  const prefix = `JH${dateStr}`;
  const result = await db.select({ orderNo: purchaseOrders.orderNo }).from(purchaseOrders).where(like(purchaseOrders.orderNo, `${prefix}%`)).orderBy(desc(purchaseOrders.orderNo)).limit(1);
  if (result.length === 0) return `${prefix}0001`;
  const lastSeq = parseInt(result[0].orderNo.slice(-4));
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

async function createPurchaseOrderDb(items: Array<{ productId: number; productName: string; spec: string; unit: string; supplier: string; purchasePrice: string; quantity: number; batchNo: string; productionDate: string; expiryDate: string }>) {
  const db = getDb();
  const orderNo = await generatePurchaseOrderNo();
  let totalAmount = 0;
  const itemsWithSubtotal = items.map((item) => {
    const subtotal = parseFloat(item.purchasePrice) * item.quantity;
    totalAmount += subtotal;
    return { ...item, subtotal: subtotal.toFixed(2) };
  });
  const orderResult = await db.insert(purchaseOrders).values({ orderNo, totalAmount: totalAmount.toFixed(2) });
  const orderId = (orderResult[0] as any).insertId;
  for (const item of itemsWithSubtotal) {
    await db.insert(purchaseOrderItems).values({ ...item, orderId } as any);
    const existingInv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (existingInv.length > 0) {
      await db.update(inventory).set({ quantity: sql`quantity + ${item.quantity}` }).where(eq(inventory.id, existingInv[0].id));
    } else {
      await db.insert(inventory).values({ productId: item.productId, productName: item.productName, spec: item.spec, unit: item.unit, supplier: item.supplier, batchNo: item.batchNo, productionDate: item.productionDate, expiryDate: item.expiryDate, quantity: item.quantity } as any);
    }
  }
  return { id: orderId, orderNo };
}

async function getPurchaseOrdersDb(params: { page?: number; pageSize?: number }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const [data, countResult] = await Promise.all([
    db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(purchaseOrders),
  ]);
  return { data, total: Number(countResult[0].count), page, pageSize };
}

async function getPurchaseOrderDetailDb(orderId: number, params: { page?: number; pageSize?: number }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const offset = (page - 1) * pageSize;
  const [items, countResult, order] = await Promise.all([
    db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId)).orderBy(desc(purchaseOrderItems.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId)),
    db.select().from(purchaseOrders).where(eq(purchaseOrders.id, orderId)).limit(1),
  ]);
  return { order: order[0], items, total: Number(countResult[0].count), page, pageSize };
}

async function deletePurchaseOrderDb(orderId: number) {
  const db = getDb();
  const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
  for (const item of items) {
    const inv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (inv.length > 0 && inv[0].quantity < item.quantity) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `产品「${item.productName}」批号「${item.batchNo}」库存不足以回退，当前库存${inv[0].quantity}，需回退${item.quantity}。可能已有部分被销售。` });
    }
  }
  for (const item of items) {
    await db.update(inventory).set({ quantity: sql`quantity - ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
  await db.delete(purchaseOrders).where(eq(purchaseOrders.id, orderId));
  return true;
}

async function updatePurchaseOrderDb(orderId: number, items: Array<{ productId: number; productName: string; spec: string; unit: string; supplier: string; purchasePrice: string; quantity: number; batchNo: string; productionDate: string; expiryDate: string }>) {
  const db = getDb();
  const oldItems = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
  for (const item of oldItems) {
    const inv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (inv.length > 0 && inv[0].quantity < item.quantity) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `产品「${item.productName}」批号「${item.batchNo}」库存不足以回退修改，当前库存${inv[0].quantity}，需回退${item.quantity}。` });
    }
  }
  for (const item of oldItems) {
    await db.update(inventory).set({ quantity: sql`quantity - ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId));
  let totalAmount = 0;
  for (const item of items) {
    const subtotal = parseFloat(item.purchasePrice) * item.quantity;
    totalAmount += subtotal;
    await db.insert(purchaseOrderItems).values({ ...item, orderId, subtotal: subtotal.toFixed(2) } as any);
    const existingInv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (existingInv.length > 0) {
      await db.update(inventory).set({ quantity: sql`quantity + ${item.quantity}` }).where(eq(inventory.id, existingInv[0].id));
    } else {
      await db.insert(inventory).values({ productId: item.productId, productName: item.productName, spec: item.spec, unit: item.unit, supplier: item.supplier, batchNo: item.batchNo, productionDate: item.productionDate, expiryDate: item.expiryDate, quantity: item.quantity } as any);
    }
  }
  await db.update(purchaseOrders).set({ totalAmount: totalAmount.toFixed(2) }).where(eq(purchaseOrders.id, orderId));
  return true;
}

async function generateSalesOrderNo() {
  const db = getDb();
  const now = new Date();
  const dateStr = now.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" }).slice(0, 10).replace(/-/g, "");
  const prefix = `XS${dateStr}`;
  const result = await db.select({ orderNo: salesOrders.orderNo }).from(salesOrders).where(like(salesOrders.orderNo, `${prefix}%`)).orderBy(desc(salesOrders.orderNo)).limit(1);
  if (result.length === 0) return `${prefix}0001`;
  const lastSeq = parseInt(result[0].orderNo.slice(-4));
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

async function createSalesOrderDb(customerId: number, customerName: string, items: Array<{ productId: number; productName: string; spec: string; unit: string; supplier: string; purchasePrice: string; batchNo: string; quantity: number; salePrice: string; taxRate: string }>) {
  const db = getDb();
  const orderNo = await generateSalesOrderNo();
  let totalAmount = 0, totalCost = 0, totalTax = 0;
  for (const item of items) {
    const inv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (inv.length === 0 || inv[0].quantity < item.quantity) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `产品「${item.productName}」批号「${item.batchNo}」库存不足，当前库存${inv.length > 0 ? inv[0].quantity : 0}，需要${item.quantity}` });
    }
  }
  const orderResult = await db.insert(salesOrders).values({ orderNo, customerId, customerName, totalAmount: "0", totalCost: "0", totalTax: "0", profit: "0", profitRate: "0", itemCount: items.length } as any);
  const orderId = (orderResult[0] as any).insertId;
  for (const item of items) {
    const subtotal = parseFloat(item.salePrice) * item.quantity;
    const taxAmount = subtotal * parseFloat(item.taxRate) / 100;
    const cost = parseFloat(item.purchasePrice) * item.quantity;
    const profit = subtotal - cost - taxAmount;
    totalAmount += subtotal;
    totalCost += cost;
    totalTax += taxAmount;
    await db.insert(salesOrderItems).values({ orderId, productId: item.productId, productName: item.productName, spec: item.spec, unit: item.unit, supplier: item.supplier, purchasePrice: item.purchasePrice, batchNo: item.batchNo, quantity: item.quantity, salePrice: item.salePrice, taxRate: item.taxRate, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), cost: cost.toFixed(2), profit: profit.toFixed(2) } as any);
    await db.update(inventory).set({ quantity: sql`quantity - ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  const totalProfit = totalAmount - totalCost - totalTax;
  const profitRate = totalAmount > 0 ? (totalProfit / totalAmount * 100) : 0;
  await db.update(salesOrders).set({ totalAmount: totalAmount.toFixed(2), totalCost: totalCost.toFixed(2), totalTax: totalTax.toFixed(2), profit: totalProfit.toFixed(2), profitRate: profitRate.toFixed(2) }).where(eq(salesOrders.id, orderId));
  return { id: orderId, orderNo };
}

async function getSalesOrdersDb(params: { page?: number; pageSize?: number; startDate?: string; endDate?: string; customerName?: string }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (params.startDate) conditions.push(gte(salesOrders.createdAt, new Date(params.startDate + "T00:00:00+08:00")));
  if (params.endDate) conditions.push(lte(salesOrders.createdAt, new Date(params.endDate + "T23:59:59+08:00")));
  if (params.customerName) conditions.push(like(salesOrders.customerName, `%${params.customerName}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(salesOrders).where(where).orderBy(desc(salesOrders.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(where),
  ]);
  return { data, total: Number(countResult[0].count), page, pageSize };
}

async function getSalesOrderDetailDb(orderId: number, params: { page?: number; pageSize?: number }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 50;
  const offset = (page - 1) * pageSize;
  const [items, countResult, order] = await Promise.all([
    db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId)).orderBy(desc(salesOrderItems.createdAt)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId)),
    db.select().from(salesOrders).where(eq(salesOrders.id, orderId)).limit(1),
  ]);
  return { order: order[0], items, total: Number(countResult[0].count), page, pageSize };
}

async function deleteSalesOrderDb(orderId: number) {
  const db = getDb();
  const items = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId));
  for (const item of items) {
    await db.update(inventory).set({ quantity: sql`quantity + ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  await db.delete(salesOrderItems).where(eq(salesOrderItems.orderId, orderId));
  await db.delete(salesOrders).where(eq(salesOrders.id, orderId));
  return true;
}

async function updateSalesOrderDb(orderId: number, customerId: number, customerName: string, items: Array<{ productId: number; productName: string; spec: string; unit: string; supplier: string; purchasePrice: string; batchNo: string; quantity: number; salePrice: string; taxRate: string }>) {
  const db = getDb();
  const oldItems = await db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId));
  for (const item of oldItems) {
    await db.update(inventory).set({ quantity: sql`quantity + ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  for (const item of items) {
    const inv = await db.select().from(inventory).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec))).limit(1);
    if (inv.length === 0 || inv[0].quantity < item.quantity) {
      for (const oldItem of oldItems) {
        await db.update(inventory).set({ quantity: sql`quantity - ${oldItem.quantity}` }).where(and(eq(inventory.productId, oldItem.productId), eq(inventory.batchNo, oldItem.batchNo), eq(inventory.spec, oldItem.spec)));
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: `产品「${item.productName}」批号「${item.batchNo}」库存不足` });
    }
  }
  await db.delete(salesOrderItems).where(eq(salesOrderItems.orderId, orderId));
  let totalAmount = 0, totalCost = 0, totalTax = 0;
  for (const item of items) {
    const subtotal = parseFloat(item.salePrice) * item.quantity;
    const taxAmount = subtotal * parseFloat(item.taxRate) / 100;
    const cost = parseFloat(item.purchasePrice) * item.quantity;
    const profit = subtotal - cost - taxAmount;
    totalAmount += subtotal;
    totalCost += cost;
    totalTax += taxAmount;
    await db.insert(salesOrderItems).values({ orderId, productId: item.productId, productName: item.productName, spec: item.spec, unit: item.unit, supplier: item.supplier, purchasePrice: item.purchasePrice, batchNo: item.batchNo, quantity: item.quantity, salePrice: item.salePrice, taxRate: item.taxRate, subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), cost: cost.toFixed(2), profit: profit.toFixed(2) } as any);
    await db.update(inventory).set({ quantity: sql`quantity - ${item.quantity}` }).where(and(eq(inventory.productId, item.productId), eq(inventory.batchNo, item.batchNo), eq(inventory.spec, item.spec)));
  }
  const totalProfit = totalAmount - totalCost - totalTax;
  const profitRate = totalAmount > 0 ? (totalProfit / totalAmount * 100) : 0;
  await db.update(salesOrders).set({ customerId, customerName, totalAmount: totalAmount.toFixed(2), totalCost: totalCost.toFixed(2), totalTax: totalTax.toFixed(2), profit: totalProfit.toFixed(2), profitRate: profitRate.toFixed(2), itemCount: items.length }).where(eq(salesOrders.id, orderId));
  return true;
}

async function getInventoryDb(params: { page?: number; pageSize?: number; search?: string }) {
  const db = getDb();
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];
  if (params.search) {
    conditions.push(or(like(inventory.productName, `%${params.search}%`), like(inventory.supplier, `%${params.search}%`)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(inventory).where(where).orderBy(desc(inventory.inboundDate)).limit(pageSize).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(inventory).where(where),
  ]);
  return { data, total: Number(countResult[0].count), page, pageSize };
}

async function getInventoryByProductDb(productId: number, spec: string) {
  const db = getDb();
  return db.select().from(inventory).where(and(eq(inventory.productId, productId), eq(inventory.spec, spec), sql`quantity > 0`)).orderBy(inventory.productionDate);
}

async function getDashboardDataDb(params: { year?: number; month?: number; startDate?: string; endDate?: string }) {
  const db = getDb();
  const conditions: any[] = [];
  if (params.startDate && params.endDate) {
    conditions.push(gte(salesOrders.createdAt, new Date(params.startDate + "T00:00:00+08:00")));
    conditions.push(lte(salesOrders.createdAt, new Date(params.endDate + "T23:59:59+08:00")));
  } else if (params.year && params.month) {
    const startStr = `${params.year}-${String(params.month).padStart(2, "0")}-01T00:00:00+08:00`;
    const lastDay = new Date(params.year, params.month, 0).getDate();
    const endStr = `${params.year}-${String(params.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59+08:00`;
    conditions.push(gte(salesOrders.createdAt, new Date(startStr)));
    conditions.push(lte(salesOrders.createdAt, new Date(endStr)));
  } else if (params.year) {
    conditions.push(gte(salesOrders.createdAt, new Date(`${params.year}-01-01T00:00:00+08:00`)));
    conditions.push(lte(salesOrders.createdAt, new Date(`${params.year}-12-31T23:59:59+08:00`)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const result = await db.select({
    orderCount: sql<number>`count(*)`,
    totalSales: sql<string>`COALESCE(SUM(totalAmount), 0)`,
    totalCost: sql<string>`COALESCE(SUM(totalCost), 0)`,
    totalTax: sql<string>`COALESCE(SUM(totalTax), 0)`,
    totalProfit: sql<string>`COALESCE(SUM(profit), 0)`,
  }).from(salesOrders).where(where);
  const data = result[0];
  const totalSales = parseFloat(data.totalSales);
  const profitRate = totalSales > 0 ? (parseFloat(data.totalProfit) / totalSales * 100) : 0;
  return { orderCount: data.orderCount, totalSales: data.totalSales, totalCost: data.totalCost, totalTax: data.totalTax, totalProfit: data.totalProfit, profitRate: profitRate.toFixed(2) };
}

async function getMonthlyTrendDb(year: number) {
  const db = getDb();
  return db.select({
    month: sql<number>`MONTH(createdAt)`,
    totalSales: sql<string>`COALESCE(SUM(totalAmount), 0)`,
    totalProfit: sql<string>`COALESCE(SUM(profit), 0)`,
    orderCount: sql<number>`count(*)`,
  }).from(salesOrders).where(and(gte(salesOrders.createdAt, new Date(`${year}-01-01T00:00:00+08:00`)), lte(salesOrders.createdAt, new Date(`${year}-12-31T23:59:59+08:00`)))).groupBy(sql`MONTH(createdAt)`).orderBy(sql`MONTH(createdAt)`);
}

async function getAvailableYearsDb() {
  const db = getDb();
  const result = await db.select({ year: sql<number>`DISTINCT YEAR(createdAt)` }).from(salesOrders).orderBy(sql`YEAR(createdAt) DESC`);
  return result.map((r) => r.year);
}

async function getAllPurchaseOrdersDb() {
  const db = getDb();
  return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
}

async function getAllPurchaseOrderItemsDb(orderId?: number) {
  const db = getDb();
  if (orderId) return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, orderId)).orderBy(desc(purchaseOrderItems.createdAt));
  return db.select().from(purchaseOrderItems).orderBy(desc(purchaseOrderItems.createdAt));
}

async function getAllSalesOrdersDb(params?: { startDate?: string; endDate?: string }) {
  const db = getDb();
  const conditions: any[] = [];
  if (params?.startDate) conditions.push(gte(salesOrders.createdAt, new Date(params.startDate + "T00:00:00+08:00")));
  if (params?.endDate) conditions.push(lte(salesOrders.createdAt, new Date(params.endDate + "T23:59:59+08:00")));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(salesOrders).where(where).orderBy(desc(salesOrders.createdAt));
}

async function getAllSalesOrderItemsDb(orderId?: number) {
  const db = getDb();
  if (orderId) return db.select().from(salesOrderItems).where(eq(salesOrderItems.orderId, orderId)).orderBy(desc(salesOrderItems.createdAt));
  return db.select().from(salesOrderItems).orderBy(desc(salesOrderItems.createdAt));
}

async function getAllInventoryDb() {
  const db = getDb();
  return db.select().from(inventory).orderBy(desc(inventory.inboundDate));
}

async function getAllProductsDb() {
  const db = getDb();
  return db.select().from(products).orderBy(desc(products.createdAt));
}

async function getAllCustomersDb() {
  const db = getDb();
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

// ============ tRPC Router ============
const purchaseItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  spec: z.string(),
  unit: z.string(),
  supplier: z.string(),
  purchasePrice: z.string(),
  quantity: z.number().int().positive(),
  batchNo: z.string(),
  productionDate: z.string(),
  expiryDate: z.string(),
});

const salesItemSchema = z.object({
  productId: z.number(),
  productName: z.string(),
  spec: z.string(),
  unit: z.string(),
  supplier: z.string(),
  purchasePrice: z.string(),
  batchNo: z.string(),
  quantity: z.number().int().positive(),
  salePrice: z.string(),
  taxRate: z.string(),
});

const appRouter = router({
  auth: router({
    login: publicProcedure
      .input(z.object({ username: z.string(), password: z.string() }))
      .mutation(async ({ input }) => {
        const account = await verifyAccount(input.username, input.password);
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "用户名或密码错误" });
        const token = await signToken(account.username);
        return { success: true, username: account.username, token };
      }),
    logout: protectedProcedure.mutation(() => ({ success: true })),
    changePassword: protectedProcedure
      .input(z.object({ oldPassword: z.string(), newPassword: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const ok = await changePasswordDb(ctx.username, input.oldPassword, input.newPassword);
        if (!ok) throw new TRPCError({ code: "BAD_REQUEST", message: "原密码错误" });
        return { success: true };
      }),
  }),

  product: router({
    list: protectedProcedure
      .input(z.object({ page: z.number().optional(), pageSize: z.number().optional(), search: z.string().optional(), status: z.string().optional() }))
      .query(async ({ input }) => getProductsDb(input)),
    listActive: protectedProcedure.query(() => getAllActiveProducts()),
    create: protectedProcedure
      .input(z.object({ name: z.string(), spec: z.string(), unit: z.string(), supplier: z.string(), purchasePrice: z.string(), remark: z.string().optional() }))
      .mutation(async ({ input }) => createProductDb(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), spec: z.string().optional(), unit: z.string().optional(), supplier: z.string().optional(), purchasePrice: z.string().optional(), remark: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; return updateProductDb(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteProductDb(input.id)),
    disable: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => disableProductDb(input.id)),
    exportAll: protectedProcedure.query(() => getAllProductsDb()),
  }),

  customer: router({
    list: protectedProcedure
      .input(z.object({ page: z.number().optional(), pageSize: z.number().optional(), search: z.string().optional(), status: z.string().optional() }))
      .query(async ({ input }) => getCustomersDb(input)),
    listActive: protectedProcedure.query(() => getAllActiveCustomers()),
    create: protectedProcedure
      .input(z.object({ name: z.string(), warehouseAddress: z.string(), contactPerson: z.string().optional() }))
      .mutation(async ({ input }) => createCustomerDb(input)),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), warehouseAddress: z.string().optional(), contactPerson: z.string().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; return updateCustomerDb(id, data); }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteCustomerDb(input.id)),
    disable: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => disableCustomerDb(input.id)),
    exportAll: protectedProcedure.query(() => getAllCustomersDb()),
  }),

  purchase: router({
    list: protectedProcedure
      .input(z.object({ page: z.number().optional(), pageSize: z.number().optional() }))
      .query(async ({ input }) => getPurchaseOrdersDb(input)),
    detail: protectedProcedure
      .input(z.object({ orderId: z.number(), page: z.number().optional(), pageSize: z.number().optional() }))
      .query(async ({ input }) => { const { orderId, ...params } = input; return getPurchaseOrderDetailDb(orderId, params); }),
    create: protectedProcedure
      .input(z.object({ items: z.array(purchaseItemSchema) }))
      .mutation(async ({ input }) => createPurchaseOrderDb(input.items)),
    update: protectedProcedure
      .input(z.object({ orderId: z.number(), items: z.array(purchaseItemSchema) }))
      .mutation(async ({ input }) => updatePurchaseOrderDb(input.orderId, input.items)),
    delete: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => deletePurchaseOrderDb(input.orderId)),
    exportAll: protectedProcedure.query(() => getAllPurchaseOrdersDb()),
    exportItems: protectedProcedure
      .input(z.object({ orderId: z.number().optional() }))
      .query(async ({ input }) => getAllPurchaseOrderItemsDb(input.orderId)),
  }),

  sales: router({
    list: protectedProcedure
      .input(z.object({ page: z.number().optional(), pageSize: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional(), customerName: z.string().optional() }))
      .query(async ({ input }) => getSalesOrdersDb(input)),
    detail: protectedProcedure
      .input(z.object({ orderId: z.number(), page: z.number().optional(), pageSize: z.number().optional() }))
      .query(async ({ input }) => { const { orderId, ...params } = input; return getSalesOrderDetailDb(orderId, params); }),
    create: protectedProcedure
      .input(z.object({ customerId: z.number(), customerName: z.string(), items: z.array(salesItemSchema) }))
      .mutation(async ({ input }) => createSalesOrderDb(input.customerId, input.customerName, input.items)),
    update: protectedProcedure
      .input(z.object({ orderId: z.number(), customerId: z.number(), customerName: z.string(), items: z.array(salesItemSchema) }))
      .mutation(async ({ input }) => updateSalesOrderDb(input.orderId, input.customerId, input.customerName, input.items)),
    delete: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input }) => deleteSalesOrderDb(input.orderId)),
    exportAll: protectedProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => getAllSalesOrdersDb(input)),
    exportItems: protectedProcedure
      .input(z.object({ orderId: z.number().optional() }))
      .query(async ({ input }) => getAllSalesOrderItemsDb(input.orderId)),
  }),

  inventory: router({
    list: protectedProcedure
      .input(z.object({ page: z.number().optional(), pageSize: z.number().optional(), search: z.string().optional() }))
      .query(async ({ input }) => getInventoryDb(input)),
    byProduct: protectedProcedure
      .input(z.object({ productId: z.number(), spec: z.string() }))
      .query(async ({ input }) => getInventoryByProductDb(input.productId, input.spec)),
    exportAll: protectedProcedure.query(() => getAllInventoryDb()),
  }),

  dashboard: router({
    summary: protectedProcedure
      .input(z.object({ year: z.number().optional(), month: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => getDashboardDataDb(input)),
    monthlyTrend: protectedProcedure
      .input(z.object({ year: z.number() }))
      .query(async ({ input }) => getMonthlyTrendDb(input.year)),
    availableYears: protectedProcedure.query(() => getAvailableYearsDb()),
  }),
});

export type AppRouter = typeof appRouter;

// ============ Vercel Handler ============
export default function handler(req: any, res: any) {
  const host = req.headers.host ?? "localhost";
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader ?? "https";
  const rawUrl = req.url ?? "/api/trpc";
  const absoluteUrl = rawUrl.startsWith("http") ? rawUrl : `${proto}://${host}${rawUrl}`;
  const parsedUrl = new URL(absoluteUrl);
  const queryPath = parsedUrl.searchParams.get("path");
  const pathnamePath = parsedUrl.pathname.replace(/^\/api\/trpc\/?/, "");
  const trpcPath = (queryPath ?? pathnamePath).replace(/^\/+/, "");

  return nodeHTTPRequestHandler({
    req,
    res,
    router: appRouter,
    path: trpcPath,
    createContext: ({ req }) => {
    const host = req.headers.host ?? "localhost";
    const protoHeader = req.headers["x-forwarded-proto"];
    const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader ?? "https";
    const url = req.url?.startsWith("http") ? req.url : `${proto}://${host}${req.url ?? "/api/trpc"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (typeof value === "string") headers.set(key, value);
    }

    const request = new Request(url, {
      method: req.method ?? "GET",
      headers,
    });
    return createContext(request);
    },
    onError: ({ error, path }) => {
      if (error.code !== "UNAUTHORIZED" && error.code !== "BAD_REQUEST") {
        console.error(`tRPC error on ${path}:`, error);
      }
    },
  });
}
