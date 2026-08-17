# EaiMesa

SaaS B2B para bares e restaurantes pequenos: comanda no celular do cliente, com **código público da casa** e **QR do garçom** na primeira visita à mesa.

**URL de exemplo:** `https://eaimesa.com.br/d1de031d33` (Bar do Seu Pedro)

## Documentação

Tudo para começar o desenvolvimento está em [`docs/`](docs/README.md).

| Área | Arquivo |
|------|---------|
| Produto e MVP | [docs/product/visao.md](docs/product/visao.md) |
| Fluxos | [docs/product/fluxos.md](docs/product/fluxos.md) |
| Preço | [docs/product/pricing.md](docs/product/pricing.md) |
| Arquitetura | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Sessão (claim + PIN) | [docs/architecture/sessao-claim-pin.md](docs/architecture/sessao-claim-pin.md) |
| Segurança | [docs/security/modelo.md](docs/security/modelo.md) |
| API (esboço) | [docs/api/endpoints.md](docs/api/endpoints.md) |
| Modelo de dados | [docs/data/schema.md](docs/data/schema.md) |
| Setup dev | [docs/ops/dev-setup.md](docs/ops/dev-setup.md) |
| ADRs | [docs/decisions/](docs/decisions/) |

## Repositório

Este diretório ainda **não** está ligado ao GitHub. Para publicar:

```bash
cd ~/Projetos/EaiMesa
git init
git add .
git commit -m "docs: especificação inicial EaiMesa"
# Crie o repo vazio no GitHub e:
git remote add origin git@github.com:SEU_USUARIO/eaimesa.git
git push -u origin main
```

## Canvas do Cursor vs este repo

Os arquivos `.canvas.tsx` da conversa no Cursor **não ficam aqui** automaticamente. O conteúdo foi condensado em Markdown em `docs/`. Para ver no celular, leia este repo no GitHub ou no app GitHub — não pelo Canvas do IDE.
