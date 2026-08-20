CREATE TABLE IF NOT EXISTS venue_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venue_tables_venue ON venue_tables (venue_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS venue_tables_venue_label ON venue_tables (venue_id, label);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES venue_tables(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_table ON orders (table_id);
