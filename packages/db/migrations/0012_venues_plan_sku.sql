-- 0011 já aplicado em alguns ambientes sem dropar venues_plan_chk.
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_plan_chk;
ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_plan_format_chk;
ALTER TABLE venues ADD CONSTRAINT venues_plan_format_chk CHECK (
  plan ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'
  AND char_length(plan) BETWEEN 3 AND 48
);
