import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("accounts_email_lower").on(t.email)],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    publicId: text("public_id").notNull(),
    subscriptionStatus: text("subscription_status").notNull().default("trial"),
    acceptsOrders: boolean("accepts_orders").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("venues_slug").on(t.slug),
    uniqueIndex("venues_public_id").on(t.publicId),
    uniqueIndex("venues_owner").on(t.ownerAccountId),
  ],
);

export const catalogCategories = pgTable(
  "catalog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("catalog_categories_venue").on(t.venueId, t.sortOrder)],
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => catalogCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    priceCents: integer("price_cents").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    maxNoteLength: integer("max_note_length").notNull().default(80),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("catalog_items_venue_cat").on(t.venueId, t.categoryId)],
);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  venue: one(venues, {
    fields: [accounts.id],
    references: [venues.ownerAccountId],
  }),
  memberships: many(venueMembers),
}));

export const catalogCategoriesRelations = relations(catalogCategories, ({ one, many }) => ({
  venue: one(venues, {
    fields: [catalogCategories.venueId],
    references: [venues.id],
  }),
  items: many(catalogItems),
}));

export const catalogItemsRelations = relations(catalogItems, ({ one }) => ({
  venue: one(venues, {
    fields: [catalogItems.venueId],
    references: [venues.id],
  }),
  category: one(catalogCategories, {
    fields: [catalogItems.categoryId],
    references: [catalogCategories.id],
  }),
}));

export const venueTables = pgTable(
  "venue_tables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("venue_tables_venue").on(t.venueId, t.sortOrder),
    uniqueIndex("venue_tables_venue_label").on(t.venueId, t.label),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    source: text("source").notNull().default("counter"),
    tableId: uuid("table_id").references(() => venueTables.id, { onDelete: "set null" }),
    tableLabel: text("table_label").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("orders_venue_status_created").on(t.venueId, t.status, t.createdAt)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    catalogItemId: uuid("catalog_item_id").references(() => catalogItems.id, { onDelete: "set null" }),
    nameSnapshot: text("name_snapshot").notNull(),
    unitPriceCentsSnapshot: integer("unit_price_cents_snapshot").notNull(),
    qty: integer("qty").notNull(),
    note: text("note"),
  },
  (t) => [index("order_items_order").on(t.orderId)],
);

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(accounts, {
    fields: [venues.ownerAccountId],
    references: [accounts.id],
  }),
  categories: many(catalogCategories),
  items: many(catalogItems),
  tables: many(venueTables),
  orders: many(orders),
  members: many(venueMembers),
  tabs: many(tabs),
}));

export const venueTablesRelations = relations(venueTables, ({ one, many }) => ({
  venue: one(venues, {
    fields: [venueTables.venueId],
    references: [venues.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  venue: one(venues, {
    fields: [orders.venueId],
    references: [venues.id],
  }),
  table: one(venueTables, {
    fields: [orders.tableId],
    references: [venueTables.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  catalogItem: one(catalogItems, {
    fields: [orderItems.catalogItemId],
    references: [catalogItems.id],
  }),
}));

export const venueMembers = pgTable(
  "venue_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("staff"),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("venue_members_venue_account").on(t.venueId, t.accountId),
    index("venue_members_account").on(t.accountId),
  ],
);

export const tabs = pgTable(
  "tabs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => venueTables.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("open"),
    pinHash: text("pin_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tabs_venue_table").on(t.venueId, t.tableId)],
);

export const tableClaims = pgTable(
  "table_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    tableId: uuid("table_id")
      .notNull()
      .references(() => venueTables.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => venueMembers.id, {
      onDelete: "set null",
    }),
    ownerAccountId: uuid("owner_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    tabId: uuid("tab_id").references(() => tabs.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("table_claims_token_hash").on(t.tokenHash),
    index("table_claims_venue_table").on(t.venueId, t.tableId),
  ],
);

export const guestSessions = pgTable(
  "guest_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tabId: uuid("tab_id")
      .notNull()
      .references(() => tabs.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("guest_sessions_tab").on(t.tabId)],
);

export const venueMembersRelations = relations(venueMembers, ({ one, many }) => ({
  venue: one(venues, { fields: [venueMembers.venueId], references: [venues.id] }),
  account: one(accounts, { fields: [venueMembers.accountId], references: [accounts.id] }),
  claims: many(tableClaims),
}));

export const tabsRelations = relations(tabs, ({ one, many }) => ({
  venue: one(venues, { fields: [tabs.venueId], references: [venues.id] }),
  table: one(venueTables, { fields: [tabs.tableId], references: [venueTables.id] }),
  claims: many(tableClaims),
  sessions: many(guestSessions),
}));

export const tableClaimsRelations = relations(tableClaims, ({ one }) => ({
  venue: one(venues, { fields: [tableClaims.venueId], references: [venues.id] }),
  table: one(venueTables, { fields: [tableClaims.tableId], references: [venueTables.id] }),
  member: one(venueMembers, { fields: [tableClaims.memberId], references: [venueMembers.id] }),
  tab: one(tabs, { fields: [tableClaims.tabId], references: [tabs.id] }),
}));

export const guestSessionsRelations = relations(guestSessions, ({ one }) => ({
  tab: one(tabs, { fields: [guestSessions.tabId], references: [tabs.id] }),
  venue: one(venues, { fields: [guestSessions.venueId], references: [venues.id] }),
}));
