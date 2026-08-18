# Modelo de segurança

## Princípios

1. **Tenancy:** `venue_id` sempre do token/sessão, nunca do body confiável.
2. **QR público ≠ auth:** slug da casa não abre comanda.
3. **Presença (MVP):** claim do garçom (TTL, uso único) + PIN para o grupo.
4. **Preço no servidor:** painel envia `priceCents` no cardápio; pedido de balcão manda só `catalogItemId` + qtd.
5. **Separação de auth:** cookie dono ≠ cookie guest (futuro) ≠ platform admin.

## Papéis

| Papel | Auth | Escopo | Fatia 2 |
|-------|------|--------|---------|
| Público | — | Ler cardápio por slug | Sim |
| Owner | Cookie `eaimesa_owner` | Cardápio, venue, **fila Kanban** | Sim |
| Guest | Cookie `eaimesa_guest` | Uma tab, um venue | Não |
| Staff | Cookie/JWT staff | Fila, claims, mesas | Ainda o dono no mesmo cookie |
| Platform | SSO interno + 2FA | Tenants, suspensão | Não |

## Ameaças SaaS

| Ameaça | Controle |
|--------|----------|
| IDOR entre bares | Filtro `venue_id` da sessão; testes depois; RLS |
| Pedido remoto | Claim + PIN (quando houver pedido); slug é read-only |
| Preço adulterado no pedido | Recalcular no servidor |
| XSS no cardápio | Texto; escape no React; CSP depois |
| Guest → admin | Cookies distintos; RBAC server-side |
| Enumeração de slug | 404 genérico; slugs não sequenciais |
| PII em log | Não logar senha; e-mail só em auth errors genéricos |
| Secret na URL | Cookie httpOnly após login |

## Headers e cookies

- HTTPS + HSTS em produção
- Cookie dono: `Secure` (prod); `HttpOnly`; `SameSite=Lax`; `Path=/`
- CORS: **uma** origin (`APP_URL` = `apps/web`), `credentials: true`
- Não usar o mesmo JWT para dono e guest

## Rate limits (inicial)

| Ação | Limite |
|------|--------|
| Login / register | 10/min/IP |
| Redeem claim (futuro) | 10/min/IP |
| PIN join (futuro) | 5 falhas / 15 min / tab |

Na fatia 1 o limiter de login pode ser in-memory (um processo).

## LGPD

- **Controlador:** estabelecimento (quando houver pedidos).
- **Operador:** EaiMesa (infra, processamento).
- Cadastro B2B na fatia 1: só e-mail + senha + nome do bar. CNPJ/CPF na fatia KYC.
- CPF do **consumidor** não coletar no MVP para pedir.

## Cadastro B2B (KYC — fatia posterior)

- CNPJ + CPF responsável + e-mail verificado + OTP celular.
- CPF mascarado na UI (`***.***.***-12`).
- Secrets em env local / SSM em prod — ver `.env.example`.

## Nunca

- Token de sessão na query string
- `/mesa/1` sequencial como auth
- Um JWT para guest e owner
- Confiar em `venueId` enviado pelo client no CRUD
- Impressora do bar exposta na internet (fase 2: agente outbound)
