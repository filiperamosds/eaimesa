# ADR-008: Login único com role (owner | staff)

**Status:** Aceito  
**Data:** 2026-08-20  
**Supersedes:** parcialmente [ADR-007](ADR-007-staff-garcom.md) (cookie e login separados)

## Contexto

A fatia 4 criou `staff_accounts` com login em `/garcom/login` e cookie `eaimesa_staff`. Na prática, garçom e dono são usuários do mesmo estabelecimento — duplicar login aumenta fricção no celular.

## Decisão

- Garçom é **`venue_member`** (`account_id` + `venue_id`, role `staff`) — mesma tabela `accounts` que o dono
- **Um login** em `/login`; JWT no cookie `eaimesa_owner` carrega `role: owner | staff`
- Dono cadastra garçom em `/painel/equipe` (cria account + member)
- Após login: `owner` → painel; `staff` → `/garcom`
- Dono **também** pode abrir `/garcom` (mesma sessão, role owner)

## Consequências

- Removidos `/garcom/login`, `/v1/staff/auth/*`, cookie `eaimesa_staff`, tabela `staff_accounts`
- Migration `0006_venue_members.sql`
- API `/v1/auth/me` retorna `role` (+ `member` se staff)
- Painel bloqueia role `staff`; garçom usa `/login?next=/garcom`

## Alternativa rejeitada

Login separado (ADR-007) — mais telas, duas senhas por pessoa se dono também opera salão.
