# tsb-dashboard

**tsb-dashboard** is a restaurant management dashboard for handling product catalog and customer orders. It provides administrators with a responsive interface to manage products, monitor orders in real time, and print receipts.

## Features

- **Product Management**: Create, update, and delete products with multi-language support (French, English, Chinese)
- **Order Management**: View and manage customer orders with real-time updates via GraphQL subscriptions
- **Printer Integration**: Epson ePOS printer support for receipts and kitchen tickets with auto-discovery
- **Role-based Access Control**: JWT-based authentication with dual-token system (access + refresh)
- **Responsive Design**: Works on desktop and mobile devices

## Technologies

- **Nuxt 4** (Vue 3, SSR enabled)
- **Nuxt UI 4** with Tailwind CSS 4
- **Pinia** with persisted state for state management
- **GraphQL** with graphql-ws for real-time subscriptions
- **@nuxtjs/i18n v10** for multi-language support (fr, en, zh)

## Getting Started

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Configure:
- `DASHBOARD_BASE_URL` — Dashboard URL
- `API_BASE_URL` — Backend API base URL
- `S3_BUCKET_URL` — CloudFront/S3 bucket URL for product images
- `GRAPHQL_WS_URL` — WebSocket URL for GraphQL subscriptions
- `PRINTER_ENABLED` — Enable/disable Epson printer integration

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## Docker

```bash
docker build -t tsb-dashboard .
docker run --name tsb-dashboard --env-file .env -p 3000:3000 tsb-dashboard
```

Multi-stage Dockerfile with health check. Supports multi-arch builds (AMD64/ARM64).
