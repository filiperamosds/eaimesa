ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'cardapio',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_ends_at TIMESTAMPTZ;

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_plan_chk;
ALTER TABLE venues ADD CONSTRAINT venues_plan_chk CHECK (
  plan IN ('cardapio', 'auto_atendimento')
);

UPDATE venues
SET
  plan = CASE WHEN accepts_orders THEN 'auto_atendimento' ELSE 'cardapio' END,
  trial_ends_at = COALESCE(trial_ends_at, now() + interval '7 days');
