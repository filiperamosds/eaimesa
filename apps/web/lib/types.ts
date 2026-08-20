export type Venue = {
  id: string;
  name: string;
  slug: string;
  publicId: string;
  plan: string;
  planKind?: string;
  planName?: string;
  subscriptionStatus: string;
  acceptsOrders: boolean;
  trialEndsAt?: string | null;
  currentPeriodEndsAt?: string | null;
};

export type Session = {
  role: "owner" | "staff";
  account: { id: string; email: string };
  venue: Venue;
  member?: { id: string; name: string };
};

export type LoginResponse = Session & {
  redirectPath: string;
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
    plan?: string;
    planKind?: string;
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
      maxNoteLength: number;
    }[];
  }[];
};

export type OrderStatus = "pending" | "accepted" | "preparing" | "delivered" | "cancelled";

export type VenueTable = {
  id: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StaffSession = Session;

export type StaffTableOpenTab = {
  id: string;
  guestName: string;
  guestPhoneMasked: string;
};

export type StaffTable = {
  id: string;
  label: string;
  sortOrder: number;
  sessionOpen: boolean;
  claimPending: boolean;
  openTabCount: number;
  openTabs: StaffTableOpenTab[];
};

export type ClaimResponse = {
  claimId: string;
  tableId: string;
  tableLabel: string;
  claimUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export type JoinTabResponse = {
  tableLabel: string;
  slug: string;
  needsProfile: boolean;
  redirectPath: string;
};

export type GuestTab = {
  tabId: string | null;
  status: "open" | "closed";
  needsProfile: boolean;
  guestName: string | null;
  tableLabel: string;
  slug: string;
  venueName: string;
  expiresAt: string;
};

export type OpenComandaResponse = {
  tabId: string;
  guestName: string;
  tableLabel: string;
  slug: string;
  needsProfile: boolean;
  redirectPath: string;
};

export type StaffTabOrder = StaffOrder;

export type StaffTableTab = {
  id: string;
  guestName: string;
  guestPhoneMasked: string;
  status: "open" | "closed";
  createdAt: string;
  totalCents: number;
  orders: StaffTabOrder[];
};

export type StaffTableTabsPayload = {
  table: { id: string; label: string; sessionOpen: boolean; openTabCount: number };
  tabs: StaffTableTab[];
};

export type StaffOrder = {
  id: string;
  status: OrderStatus;
  source: "counter" | "guest";
  tableId: string | null;
  tableLabel: string;
  tabId: string | null;
  guestName: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  totalCents: number;
  items: {
    id: string;
    catalogItemId: string | null;
    name: string;
    unitPriceCents: number;
    qty: number;
    note: string | null;
  }[];
};

export type GuestOrder = StaffOrder;

export type GuestOrdersPayload = {
  orders: GuestOrder[];
  totalCents: number;
};
