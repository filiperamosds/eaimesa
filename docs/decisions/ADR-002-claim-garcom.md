# ADR-002: Claim do garçom em vez de QR fixo na mesa

**Status:** Aceito  
**Data:** 2026-08-17

## Contexto

QR fixo por mesa permite pedido remoto (foto, stories). CPF do consumidor adiciona fricção e LGPD sem provar presença.

## Decisão

- Código da casa (`/{slug}`, ex. `/bar-do-tiao`) é **público** e **não autoriza pedir**
- Staff gera **TableClaim** com TTL 2–5 min, uso único
- Após redeem: cookie guest + PIN para outros aparelhos
- Garçom vai à mesa na primeira visita (já ia atender)

## Alternativas rejeitadas

- QR fixo + confirmar 1º pedido no bar — funciona, mas claim é mais forte
- CPF para abrir comanda — fricção, LGPD, CPF falsificável
- Geofence / Wi-Fi do bar — sinal fraco, falso positivo

## Consequências

- Fluxo staff obrigatório no MVP
- UI staff precisa gerar QR grande + countdown
- Sem claim impresso em adesivo permanente
