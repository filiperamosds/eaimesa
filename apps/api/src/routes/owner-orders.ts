import { createOrderSchema, patchOrderSchema } from "@eaimesa/shared";
import type { FastifyInstance } from "fastify";
import { requireOwner } from "../lib/auth-guard";
import { requireServicePlan } from "../lib/billing";
import { parseBody } from "../lib/http";
import { createCounterOrder, listKanbanOrders, patchKanbanOrder } from "../lib/order-ops";

export async function ownerOrderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOwner);
  app.addHook("preHandler", requireServicePlan);

  app.get("/v1/owner/orders", async (req) => listKanbanOrders(req.owner!.venueId));

  app.post("/v1/owner/orders", async (req) => {
    const body = parseBody(createOrderSchema, req.body);
    return createCounterOrder(req.owner!.venueId, body);
  });

  app.patch("/v1/owner/orders/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = parseBody(patchOrderSchema, req.body);
    return patchKanbanOrder(req.owner!.venueId, id, body.status);
  });
}
