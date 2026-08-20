ALTER TABLE plan_catalog DROP CONSTRAINT IF EXISTS plan_catalog_id_chk;

ALTER TABLE plan_catalog
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'cardapio',
  ADD COLUMN IF NOT EXISTS promo_price_cents INTEGER;

UPDATE plan_catalog
SET kind = id
WHERE id IN ('cardapio', 'auto_atendimento');

ALTER TABLE plan_catalog DROP CONSTRAINT IF EXISTS plan_catalog_kind_chk;
ALTER TABLE plan_catalog
  ADD CONSTRAINT plan_catalog_kind_chk CHECK (kind IN ('cardapio', 'auto_atendimento'));

ALTER TABLE plan_catalog DROP CONSTRAINT IF EXISTS plan_catalog_id_format_chk;
ALTER TABLE plan_catalog
  ADD CONSTRAINT plan_catalog_id_format_chk CHECK (
    id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    AND char_length(id) BETWEEN 3 AND 48
  );

ALTER TABLE plan_catalog DROP CONSTRAINT IF EXISTS plan_catalog_promo_chk;
ALTER TABLE plan_catalog
  ADD CONSTRAINT plan_catalog_promo_chk CHECK (
    promo_price_cents IS NULL
    OR (promo_price_cents >= 0 AND promo_price_cents < price_cents)
  );
