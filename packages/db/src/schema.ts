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

export const accountsRelations = relations(accounts, ({ one }) => ({
  venue: one(venues, {
    fields: [accounts.id],
    references: [venues.ownerAccountId],
  }),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  owner: one(accounts, {
    fields: [venues.ownerAccountId],
    references: [accounts.id],
  }),
  categories: many(catalogCategories),
  items: many(catalogItems),
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
