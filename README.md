# CAR MANAGER

Gestão de stock, localização, preparação e venda de viaturas usadas.

Repositório: https://github.com/miguelvlima/car-manager.git

## Arranque local

1. Docker Desktop ligado
2. Na pasta do projeto:

PostgreSQL corre localmente na porta **5433**.

```bash
docker compose up -d
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Abrir http://localhost:3000

O seed local cria dados de demonstração. Não corre em produção.

## Produção

A página de login não mostra contas. O primeiro administrador cria-se com variáveis de ambiente, só se a base estiver vazia:

```bash
cp .env.example .env.production
# preencher AUTH_SECRET, AUTH_URL, POSTGRES_PASSWORD e BOOTSTRAP_ADMIN_*
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

`AUTH_SECRET` deve ser uma chave longa e aleatória (`openssl rand -base64 32`).
`AUTH_URL` é o URL público da aplicação (https://...).
Copie `.env.production.example` para `.env.production` e preencha as passwords — esse ficheiro não vai para o Git.

## Fase 1 incluída

- Autenticação Auth.js
- RBAC verificado no servidor
- Ficha de viatura, stock, fotos, pesquisa e filtros
- Localizações e origens configuráveis
- Catálogo comercial, dashboard, reserva e venda
- Timeline e audit log na escrita
- Schema relacional completo para as fases seguintes
