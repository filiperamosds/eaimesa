import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { env, isProd } from "./env";
import { AppError } from "./errors";
import { sendUpload } from "./lib/uploads";
import { authRoutes } from "./routes/auth";
import { ownerCatalogRoutes } from "./routes/owner-catalog";
import { ownerOrderRoutes } from "./routes/owner-orders";
import { ownerStaffRoutes } from "./routes/owner-staff";
import { ownerTableRoutes } from "./routes/owner-tables";
import { ownerVenueRoutes } from "./routes/owner-venue";
import { publicClaimRoutes } from "./routes/public-claim";
import { publicMenuRoutes } from "./routes/public-menu";
import { guestTabRoutes } from "./routes/guest-tab";
import { staffClaimRoutes } from "./routes/staff-claims";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: isProd ? "info" : "debug",
      redact: ["req.headers.cookie", "req.headers.authorization"],
    },
  });

  await app.register(cors, {
    origin: env.appUrl,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });

  app.get("/health", async () => ({ ok: true, service: "eaimesa-api" }));
  app.get("/v1/uploads/:file", async (req, reply) => {
    const { file } = req.params as { file: string };
    return sendUpload(reply, file);
  });

  await app.register(authRoutes);
  await app.register(ownerVenueRoutes);
  await app.register(ownerCatalogRoutes);
  await app.register(ownerOrderRoutes);
  await app.register(ownerTableRoutes);
  await app.register(ownerStaffRoutes);
  await app.register(staffClaimRoutes);
  await app.register(publicClaimRoutes);
  await app.register(publicMenuRoutes);
  await app.register(guestTabRoutes);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: { code: err.code, message: err.message },
      });
    }
    req.log.error({ err }, "unhandled");
    return reply.status(500).send({
      error: { code: "INTERNAL", message: "Erro interno. Tente de novo." },
    });
  });

  app.setNotFoundHandler((_req, reply) => {
    return reply.status(404).send({
      error: { code: "NOT_FOUND", message: "Rota não encontrada." },
    });
  });

  return app;
}
