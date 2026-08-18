import { z } from "zod";
import { isReservedSlug, normalizeSlug, SLUG_MAX, SLUG_MIN, SLUG_REGEX } from "./slug";

export const slugSchema = z
  .string()
  .transform(normalizeSlug)
  .refine((s) => s.length >= SLUG_MIN && s.length <= SLUG_MAX, {
    message: `Slug deve ter entre ${SLUG_MIN} e ${SLUG_MAX} caracteres.`,
  })
  .refine((s) => SLUG_REGEX.test(s), {
    message: "Use só letras minúsculas, números e hífen (ex. bar-do-tiao).",
  })
  .refine((s) => !isReservedSlug(s), {
    message: "Este caminho é reservado pelo produto. Escolha outro slug.",
  });

export const registerSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Senha: mínimo 8 caracteres."),
  venueName: z.string().trim().min(2, "Nome do bar: mínimo 2 caracteres.").max(80),
  slug: slugSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido.").transform((e) => e.toLowerCase()),
  password: z.string().min(1, "Informe a senha."),
});

export const patchVenueSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: slugSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.slug !== undefined, {
    message: "Envie name e/ou slug.",
  });

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nome da categoria.").max(60),
  sortOrder: z.number().int().min(0).optional(),
});

export const patchCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .nullable()
  .optional()
  .transform((s) => (s ? s : null))
  .refine(
    (s) => s === null || s === undefined || s.startsWith("/v1/uploads/") || /^https?:\/\//i.test(s),
    { message: "Imagem: URL http(s) ou arquivo enviado." },
  );

export const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(280).optional().nullable(),
  imageUrl: imageUrlSchema,
  priceCents: z.number().int().min(0).max(10_000_000),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export const patchItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).optional().nullable(),
  imageUrl: imageUrlSchema,
  priceCents: z.number().int().min(0).max(10_000_000).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});
