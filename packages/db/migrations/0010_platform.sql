CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_users_email_lower ON platform_users (lower(email));

CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY,
  trial_days INTEGER NOT NULL DEFAULT 7,
  paid_period_days INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id, trial_days, paid_period_days)
VALUES ('default', 7, 30)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS plan_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  blurb TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  listed BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plan_catalog_id_chk CHECK (id IN ('cardapio', 'auto_atendimento'))
);

INSERT INTO plan_catalog (id, name, price_cents, blurb, features, listed, sort_order)
VALUES
  (
    'cardapio',
    'Cardápio',
    4900,
    'Cardápio público com a sua URL. Sem pedido no celular.',
    '["URL pública /seu-bar","Categorias, itens e foto","QR do cardápio","1 estabelecimento"]'::jsonb,
    true,
    0
  ),
  (
    'auto_atendimento',
    'Auto atendimento',
    14900,
    'O cliente pede no celular. O garçom opera a fila.',
    '["Tudo do Cardápio","Mesas e equipe (até 15 mesas, 5 garçons)","QR do garçom + PIN","Pedido, parcial e Kanban"]'::jsonb,
    true,
    1
  )
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  method TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stub',
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_created ON billing_events (created_at DESC);
CREATE INDEX IF NOT EXISTS billing_events_venue ON billing_events (venue_id, created_at DESC);
