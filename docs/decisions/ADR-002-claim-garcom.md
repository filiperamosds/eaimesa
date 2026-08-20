# ADR-002: Claim do garçom em vez de QR fixo na mesa

**Status:** Aceito  
**Data:** 2026-08-17

## Contexto

QR fixo por mesa permite pedido remoto (foto, stories). CPF do consumidor adiciona fricção e LGPD sem provar presença.

## Decisão

- Código da casa (`/{slug}`, ex. `/bar-do-tiao`) é **público** e **não autoriza pedir**
- QR **fixo na mesa** aponta para esse cardápio (exportado no painel; adesivo ok)
- Staff gera **TableClaim** com TTL 2–5 min, uso único — **único** QR que abre comanda
- Após redeem: cookie guest + PIN para outros aparelhos
- Garçom vai à mesa na primeira visita (já ia atender)

## Alternativas rejeitadas

- QR fixo que **autoriza pedir** — pedido remoto (foto, stories)
- QR fixo + confirmar 1º pedido no bar — funciona, mas claim é mais forte
- CPF para abrir comanda — fricção, LGPD, CPF falsificável
- Geofence / Wi-Fi do bar — sinal fraco, falso positivo

## Consequências

- Fluxo staff obrigatório no MVP para **abrir comanda**
- **Dois QRs:** fixo → cardápio; claim → comanda
- UI do claim **só no painel autenticado** (`/painel/*`): QR grande + countdown; export pontual ok
- QR fixo do slug gerado/exportado em Mesas / Meu bar; pode colar na mesa
- Sem claim impresso em adesivo permanente que autorize pedir
