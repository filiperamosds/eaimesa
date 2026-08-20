CREATE TABLE IF NOT EXISTS staff_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_accounts_email ON staff_accounts (lower(email));
CREATE INDEX IF NOT EXISTS staff_accounts_venue ON staff_accounts (venue_id);

CREATE TABLE IF NOT EXISTS tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'open',
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tabs_status_chk CHECK (status IN ('open', 'locked', 'closed'))
);

CREATE INDEX IF NOT EXISTS tabs_venue_table ON tabs (venue_id, table_id);

CREATE TABLE IF NOT EXISTS table_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES venue_tables(id) ON DELETE CASCADE,
  staff_account_id UUID REFERENCES staff_accounts(id) ON DELETE SET NULL,
  owner_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  invalidated_at TIMESTAMPTZ,
  tab_id UUID REFERENCES tabs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS table_claims_token_hash ON table_claims (token_hash);
CREATE INDEX IF NOT EXISTS table_claims_venue_table ON table_claims (venue_id, table_id);

CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_sessions_tab ON guest_sessions (tab_id);
