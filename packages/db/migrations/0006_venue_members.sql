CREATE TABLE IF NOT EXISTS venue_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff')),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venue_members_venue_account ON venue_members (venue_id, account_id);
CREATE INDEX IF NOT EXISTS venue_members_account ON venue_members (account_id);

ALTER TABLE table_claims DROP COLUMN IF EXISTS staff_account_id;
ALTER TABLE table_claims ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES venue_members(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS staff_accounts;
