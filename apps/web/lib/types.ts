export type Venue = {
  id: string;
  name: string;
  slug: string;
  publicId: string;
  subscriptionStatus: string;
  acceptsOrders: boolean;
};

export type Session = {
  account: { id: string; email: string };
  venue: Venue;
};

export type CatalogItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  sortOrder: number;
  active: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  items: CatalogItem[];
};

export type PublicMenu = {
  venue: {
    name: string;
    slug: string;
    subscriptionStatus: string;
    acceptsOrders: boolean;
  };
  categories: {
    id: string;
    name: string;
    items: {
      id: string;
      name: string;
      description: string | null;
      imageUrl: string | null;
      priceCents: number;
    }[];
  }[];
};
