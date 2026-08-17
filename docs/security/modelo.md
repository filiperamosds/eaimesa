# Modelo de segurança

## Princípios

1. **Tenancy:** `venue_id` sempre do token/sessão, nunca do body confiável.
2. **QR público ≠ auth:** código da casa não abre comanda.
3. **Presença:** claim do garçom (TTL, uso único) + PIN para o grupo.
4. **Preço no servidor:** cliente envia só `catalog_item_id` + quantidade.
5. **Separação de auth:** guest cookie ≠ staff JWT ≠ platform admin.

## Papéis

| Papel | Auth | Escopo |
|-------|------|--------|
| Guest | Cookie `eaimesa_guest` | Uma tab, um venue |
| Staff | JWT staff | Fila, claims, mesas do venue |
| Owner | JWT staff + role `owner` | Cardápio, billing, usuários |
| Platform | SSO interno + 2FA | Tenants, suspensão |

## Ameaças SaaS

| Ameaça | Controle |
|--------|----------|
| IDOR entre bares | Filtro `venue_id`; testes automatizados; RLS Postgres |
| Pedido remoto | Claim + PIN; código da casa read-only |
| Preço adulterado | Recalcular no servidor |
| XSS no cardápio | Texto puro / sanitize; CSP |
| Guest → admin | RBAC server-side; rotas separadas |
| Tenant suspenso vendendo | Gate em `create-order` |
| PII em log | Mascara CPF/telefone; retenção 90d pós-tab |
| Secret na URL persistente | Redirect pós-redeem; cookie httpOnly |

## Headers e cookies

- HTTPS + HSTS em produção
- `Content-Security-Policy` restritiva nos PWAs
- Cookie: `Secure; HttpOnly; SameSite=Lax`
- CORS: origins explícitos (`guest.*`, `staff.*`, `api.*`)

## Rate limits (inicial)

| Ação | Limite |
|------|--------|
| Redeem claim | 10/min/IP |
| PIN join | 5 falhas / 15 min / tab |
| Create order | 30/min/tab |
| Login staff | 10/min/IP |

## LGPD

- **Controlador:** estabelecimento (pedidos dos clientes).
- **Operador:** EaiMesa (infra, processamento).
- Contrato de operador; exclusão ao churn do tenant.
- CPF do **consumidor** não coletar no MVP para pedir.

## Cadastro B2B (KYC)

- CNPJ + CPF responsável + e-mail verificado + OTP celular.
- CPF mascarado na UI staff (`***.***.***-12`).
- Secrets em SSM/Secrets Manager — ver `.env.example` só local.

## Nunca

- Token de sessão na query string após redeem
- `/mesa/1` sequencial
- Um JWT para guest e staff
- Impressora do bar exposta na internet (fase 2: agente outbound)
