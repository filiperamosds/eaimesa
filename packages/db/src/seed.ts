import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, sql } from "./client";
import {
  accounts,
  catalogCategories,
  catalogItems,
  guestSessions,
  orderItems,
  orders,
  tableClaims,
  tableSessions,
  tabs,
  venueMembers,
  venues,
  venueTables,
} from "./schema";

const DEMO_EMAIL = "dono@bardotiao.local";
const DEMO_PASSWORD = "demo1234";
const DEMO_STAFF_EMAIL = "garcom@bardotiao.local";

const MENU: {
  name: string;
  items: { name: string; description: string; priceCents: number; imageUrl: string }[];
}[] = [
  {
    name: "Petiscos",
    items: [
      {
        name: "Pão de alho",
        description: "Na chapa, serve 2",
        priceCents: 1290,
        imageUrl: "/seed/pao-de-alho.jpg",
      },
      {
        name: "Bolinho de bacalhau",
        description: "6 unidades",
        priceCents: 1800,
        imageUrl: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "Porções",
    items: [
      {
        name: "Calabresa acebolada",
        description: "Serve 2",
        priceCents: 3290,
        imageUrl: "/seed/calabresa.jpg",
      },
      {
        name: "Fritas com cheddar",
        description: "Batata crocante",
        priceCents: 2800,
        imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Frango a passarinho",
        description: "Com limão",
        priceCents: 3600,
        imageUrl: "/seed/frango-passarinho.jpg",
      },
    ],
  },
  {
    name: "Bebidas",
    items: [
      {
        name: "Chopp 500 ml",
        description: "Pilsen gelada",
        priceCents: 1400,
        imageUrl: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Brahma lata",
        description: "350 ml",
        priceCents: 800,
        imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?auto=format&fit=crop&w=800&q=80",
      },
      {
        name: "Água sem gás",
        description: "500 ml",
        priceCents: 500,
        imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    name: "Drinks",
    items: [
      {
        name: "Caipirinha",
        description: "Limão, cachaça e gelo",
        priceCents: 2200,
        imageUrl: "/seed/caipirinha.jpg",
      },
      {
        name: "Negroni",
        description: "Clássico",
        priceCents: 2800,
        imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
];

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await db.transaction(async (tx) => {
    let [account] = await tx.select().from(accounts).where(eq(accounts.email, DEMO_EMAIL)).limit(1);

    if (!account) {
      [account] = await tx
        .insert(accounts)
        .values({ email: DEMO_EMAIL, passwordHash })
        .returning();
    }

    if (!account) throw new Error("Falha ao criar account demo");

    let [venue] = await tx.select().from(venues).where(eq(venues.ownerAccountId, account.id)).limit(1);

    if (!venue) {
      [venue] = await tx
        .insert(venues)
        .values({
          ownerAccountId: account.id,
          name: "Bar do Tião",
          slug: "bar-do-tiao",
          publicId: randomBytes(6).toString("hex"),
          subscriptionStatus: "trial",
          acceptsOrders: false,
        })
        .returning();
    } else {
      [venue] = await tx
        .update(venues)
        .set({ name: "Bar do Tião", slug: "bar-do-tiao", updatedAt: new Date() })
        .where(eq(venues.id, venue.id))
        .returning();
    }

    if (!venue) throw new Error("Falha ao criar venue demo");

    await tx.delete(orders).where(eq(orders.venueId, venue.id));
    await tx.delete(guestSessions).where(eq(guestSessions.venueId, venue.id));
    await tx.delete(tableClaims).where(eq(tableClaims.venueId, venue.id));
    await tx.delete(tabs).where(eq(tabs.venueId, venue.id));
    await tx.delete(tableSessions).where(eq(tableSessions.venueId, venue.id));
    await tx.delete(venueTables).where(eq(venueTables.venueId, venue.id));
    await tx.delete(catalogItems).where(eq(catalogItems.venueId, venue.id));
    await tx.delete(catalogCategories).where(eq(catalogCategories.venueId, venue.id));

    for (const [i, cat] of MENU.entries()) {
      const [category] = await tx
        .insert(catalogCategories)
        .values({
          venueId: venue.id,
          name: cat.name,
          sortOrder: i,
          active: true,
        })
        .returning();
      if (!category) continue;
      await tx.insert(catalogItems).values(
        cat.items.map((item, j) => ({
          venueId: venue.id,
          categoryId: category.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          priceCents: item.priceCents,
          sortOrder: j,
          active: true,
        })),
      );
    }

    const venueId = venue.id;

    const tableLabels = ["Balcão", ...Array.from({ length: 10 }, (_, i) => `Mesa ${i + 1}`)];
    const seededTables = await tx
      .insert(venueTables)
      .values(
        tableLabels.map((label, i) => ({
          venueId,
          label,
          sortOrder: i,
          active: true,
        })),
      )
      .returning();
    const tableByLabel = new Map(seededTables.map((t) => [t.label, t]));

    const demoItems = await tx.select().from(catalogItems).where(eq(catalogItems.venueId, venueId));
    const byName = new Map(demoItems.map((i) => [i.name, i]));
    const pick = (name: string) => byName.get(name);
    const now = Date.now();

    async function demoOrder(
      tableLabel: string,
      status: "pending" | "accepted" | "preparing" | "delivered",
      minutesAgo: number,
      lines: { name: string; qty: number }[],
    ) {
      const table = tableByLabel.get(tableLabel);
      const [order] = await tx
        .insert(orders)
        .values({
          venueId,
          status,
          source: "counter",
          tableId: table?.id ?? null,
          tableLabel,
          createdAt: new Date(now - minutesAgo * 60_000),
          updatedAt: new Date(now - minutesAgo * 60_000),
        })
        .returning();
      if (!order) return;
      const rows = lines
        .map((l) => {
          const item = pick(l.name);
          if (!item) return null;
          return {
            orderId: order.id,
            venueId,
            catalogItemId: item.id,
            nameSnapshot: item.name,
            unitPriceCentsSnapshot: item.priceCents,
            qty: l.qty,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length) await tx.insert(orderItems).values(rows);
    }

    await demoOrder("Mesa 3", "pending", 4, [
      { name: "Calabresa acebolada", qty: 1 },
      { name: "Chopp 500 ml", qty: 2 },
    ]);
    await demoOrder("Mesa 1", "pending", 12, [{ name: "Pão de alho", qty: 2 }]);
    await demoOrder("Balcão", "accepted", 8, [
      { name: "Caipirinha", qty: 1 },
      { name: "Bolinho de bacalhau", qty: 1 },
    ]);
    await demoOrder("Mesa 7", "preparing", 18, [
      { name: "Frango a passarinho", qty: 1 },
      { name: "Fritas com cheddar", qty: 1 },
      { name: "Brahma lata", qty: 3 },
    ]);
    await demoOrder("Mesa 2", "delivered", 40, [{ name: "Negroni", qty: 2 }]);

    let [staffAccount] = await tx
      .select()
      .from(accounts)
      .where(eq(accounts.email, DEMO_STAFF_EMAIL))
      .limit(1);
    if (!staffAccount) {
      [staffAccount] = await tx
        .insert(accounts)
        .values({ email: DEMO_STAFF_EMAIL, passwordHash })
        .returning();
    }

    if (staffAccount) {
      let [member] = await tx
        .select()
        .from(venueMembers)
        .where(
          and(eq(venueMembers.venueId, venue.id), eq(venueMembers.accountId, staffAccount.id)),
        )
        .limit(1);
      if (!member) {
        [member] = await tx
          .insert(venueMembers)
          .values({
            venueId: venue.id,
            accountId: staffAccount.id,
            role: "staff",
            name: "João Garçom",
            active: true,
          })
          .returning();
      } else {
        await tx
          .update(venueMembers)
          .set({ name: "João Garçom", active: true, updatedAt: new Date() })
          .where(eq(venueMembers.id, member.id));
      }
      await tx
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, staffAccount.id));
    }
  });

  console.log("Seed ok: /bar-do-tiao — dono@bardotiao.local / demo1234");
  console.log("Garçom demo: garcom@bardotiao.local / demo1234 — login em /login → /garcom");
  await sql.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
