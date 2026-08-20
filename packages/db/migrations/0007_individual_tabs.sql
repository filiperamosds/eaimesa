CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE RESTRICT,
  pin_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS table_sessions_venue_table ON table_sessions (venue_id, table_id);
CREATE UNIQUE INDEX IF NOT EXISTS table_sessions_one_open ON table_sessions (table_id) WHERE status = 'open';

ALTER TABLE tabs ADD COLUMN IF NOT EXISTS table_session_id UUID REFERENCES table_sessions(id) ON DELETE RESTRICT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS guest_phone TEXT;
ALTER TABLE tabs ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

DO $$
DECLARE
  r RECORD;
  sid UUID;
BEGIN
  FOR r IN SELECT * FROM tabs WHERE table_session_id IS NULL LOOP
    INSERT INTO table_sessions (venue_id, table_id, pin_hash, status, created_at, updated_at, closed_at)
    VALUES (
      r.venue_id,
      r.table_id,
      r.pin_hash,
      CASE WHEN r.status = 'open' THEN 'open' ELSE 'closed' END,
      r.created_at,
      r.updated_at,
      CASE WHEN r.status = 'open' THEN NULL ELSE r.updated_at END
    )
    RETURNING id INTO sid;
    UPDATE tabs
    SET
      table_session_id = sid,
      guest_name = COALESCE(NULLIF(guest_name, ''), 'Convidado'),
      guest_phone = COALESCE(NULLIF(guest_phone, ''), 'migrado')
    WHERE id = r.id;
  END LOOP;
END $$;

UPDATE tabs SET guest_name = 'Convidado' WHERE guest_name IS NULL OR guest_name = '';
UPDATE tabs SET guest_phone = 'migrado' WHERE guest_phone IS NULL OR guest_phone = '';

ALTER TABLE tabs ALTER COLUMN table_session_id SET NOT NULL;
ALTER TABLE tabs ALTER COLUMN guest_name SET NOT NULL;
ALTER TABLE tabs ALTER COLUMN guest_phone SET NOT NULL;
ALTER TABLE tabs DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE tabs DROP CONSTRAINT IF EXISTS tabs_status_chk;
ALTER TABLE tabs ADD CONSTRAINT tabs_status_chk CHECK (status IN ('open', 'closed'));

CREATE UNIQUE INDEX IF NOT EXISTS tabs_open_phone
  ON tabs (table_session_id, guest_phone)
  WHERE status = 'open';

ALTER TABLE guest_sessions ADD COLUMN IF NOT EXISTS table_session_id UUID REFERENCES table_sessions(id) ON DELETE CASCADE;

UPDATE guest_sessions gs
SET table_session_id = t.table_session_id
FROM tabs t
WHERE t.id = gs.tab_id AND gs.table_session_id IS NULL;

DELETE FROM guest_sessions WHERE table_session_id IS NULL;

ALTER TABLE guest_sessions ALTER COLUMN table_session_id SET NOT NULL;
ALTER TABLE guest_sessions ALTER COLUMN tab_id DROP NOT NULL;

ALTER TABLE table_claims ADD COLUMN IF NOT EXISTS table_session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tab_id UUID REFERENCES tabs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_tab ON orders (tab_id);
