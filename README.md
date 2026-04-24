# tsb-dashboard

Admin dashboard for Tokyo Sushi Bar operations.

`tsb-dashboard` is used by staff to manage products and monitor orders in real time.

## Stack

- Nuxt 4 (Vue 3, SSR)
- Nuxt UI 4 + Tailwind CSS 4
- Pinia with persisted state
- GraphQL + subscriptions (`graphql-ws`)
- `@nuxtjs/i18n` (fr default, en, zh)
- Epson ePOS integration for receipt and kitchen printing

## Main features

- Product CRUD with multilingual translations
- Live order board with status updates
- Auth-protected admin routes
- Printer auto-discovery and print flows

## Local setup

### 1) Environment

```bash
cp .env.example .env
```

Minimum variables:

- `DASHBOARD_BASE_URL`
- `API_BASE_URL`
- `GRAPHQL_WS_URL`
- `S3_BUCKET_URL`
- `ZITADEL_AUTHORITY`
- `ZITADEL_CLIENT_ID`
- `PRINTER_ENABLED`

### 2) Install and run

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev
npm run build
npm run preview
npm run generate
npm run lint
```

## Docker

```bash
docker build -t tsb-dashboard .
docker run --name tsb-dashboard --env-file .env -p 3000:3000 tsb-dashboard
```

The Dockerfile is multi-stage with a healthcheck and supports multi-arch builds.

## Deployment

- Push to `main`: builds and publishes `:latest` (multi-arch) and deploys to the home server.
- Tag `v*`: builds `:production` + version tags (AMD64) and deploys to OVH.
- Manual rollback: run the workflow with the target version.
