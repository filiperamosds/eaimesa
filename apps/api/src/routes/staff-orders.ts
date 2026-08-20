import { createOrderSchema, patchOrderSchema } from "@eaimesa/shared";
import type { FastifyInstance } from "fastify";
import { requireVenueActor } from "../lib/auth-guard";
import { requireServicePlan } from "../lib/billing";
import { parseBody } from "../lib/http";
import { createCounterOrder, getVenueCatalog, listKanbanOrders, patchKanbanOrder } from "../lib/order-ops";

export async function staffOrderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireVenueActor);
  app.addHook("preHandler", requireServicePlan);

  app.get("/v1/staff/catalog", async (req) => getVenueCatalog(req.venueActor!.venueId));

  app.get("/v1/staff/orders", async (req) => listKanbanOrders(req.venueActor!.venueId));

  app.post("/v1/staff/orders", async (req) => {
    const body = parseBody(createOrderSchema, req.body);
    return createCounterOrder(req.venueActor!.venueId, body);
  });

  app.patch("/v1/staff/orders/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = parseBody(patchOrderSchema, req.body);
    return patchKanbanOrder(req.venueActor!.venueId, id, body.status);
  });
}
