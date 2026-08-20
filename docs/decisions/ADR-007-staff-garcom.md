# ADR-007: Usuário garçom + app `/garcom`

**Status:** Supersedido (login/cookie) por [ADR-008](ADR-008-login-unificado-role.md)  
**Data:** 2026-08-20

## Contexto

A fatia 4 precisa gerar claim na mesa. O dono não é o operador do salão. Duas opções: dono gera tudo no painel, ou **garçom com login próprio** no celular.

## Decisão (histórico)

- Entidade **StaffAccount** por venue (e-mail + senha, ativo/inativo)
- Cookie **`eaimesa_staff`** separado de `eaimesa_owner`
- App mobile-first em **`/garcom`**: login → escolhe mesa → QR claim

> **Atual:** login único + `venue_members` — ver ADR-008. App `/garcom` permanece.

## Alternativas

| Opção | Por que não |
|-------|-------------|
| Só dono gera claim | Garçom não usa o celular dele; fila na cozinha |
| Mesmo login do dono | Compartilhar senha do estabelecimento |
| App nativo garçom | Front único (`apps/web`) — ADR-003 |

## Consequências

- Nova aba **Equipe** no painel
- Middleware: `/painel/*` → owner; `/garcom/*` → staff
- Claim grava `staff_account_id` ou `owner_account_id` para auditoria futura
