ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_venue_idempotency
  ON orders (venue_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
