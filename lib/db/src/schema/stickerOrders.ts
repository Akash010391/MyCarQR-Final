import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const stickerOrdersTable = pgTable("sticker_orders", {
  id: serial("id").primaryKey(),
  orderCode: text("order_code").notNull().unique(),
  userId: text("user_id").notNull(),
  vehicleId: integer("vehicle_id"),
  vehicleQrCode: text("vehicle_qr_code"),
  vehicleNumber: text("vehicle_number"),

  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  addressLine1: text("address_line1").notNull(),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),

  product: text("product").notNull(),
  amount: integer("amount").notNull(),
  stickerStyle: text("sticker_style"),

  screenshotBase64: text("screenshot_base64"),
  paymentStatus: text("payment_status").notNull().default("pending_verification"),
  orderStatus: text("order_status").notNull().default("pending"),
  trackingNumber: text("tracking_number"),
  adminNote: text("admin_note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
