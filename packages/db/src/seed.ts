import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, sql } from "./client";
import { accounts, catalogCategories, catalogItems, venues } from "./schema";

const DEMO_EMAIL = "dono@bardotiao.local";
const DEMO_PASSWORD = "demo1234";

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
  });

  console.log("Seed ok: /bar-do-tiao — dono@bardotiao.local / demo1234");
  await sql.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
