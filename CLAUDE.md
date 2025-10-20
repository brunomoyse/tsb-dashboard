# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSB Dashboard is a Nuxt 4 restaurant management dashboard for handling product catalog and customer orders. The application has been recently migrated from Vuetify to Nuxt UI and from @nuxtjs/i18n v9 to v10.

**Key Features:**
- Product management with multi-language support (French, English, Chinese)
- Order management with real-time updates via GraphQL subscriptions
- Role-based access control with JWT authentication
- Integration with Mollie payment provider
- S3/CloudFront for product image storage

## Development Commands

### Essential Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run generate     # Generate static site
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `DASHBOARD_BASE_URL`: Dashboard URL (with locale prefix, e.g., https://example.com/admin)
- `API_BASE_URL`: Backend API base URL
- `S3_BUCKET_URL`: CloudFront/S3 bucket URL for product images
- `JWT_SECRET`: Secret for server-side JWT validation (if needed)
- `GRAPHQL_WS_URL`: WebSocket URL for GraphQL subscriptions

Note: The backend exposes both REST endpoints (`/api/v1/*`) and GraphQL (`/api/v1/graphql`).

## Architecture

### Authentication Flow
The app implements a dual-token authentication system:
- **Access Token**: 15-minute expiry, httpOnly cookie
- **Refresh Token**: 7-day expiry, httpOnly cookie

**Key Implementation Details:**
1. **Global Middleware** (`middleware/auth.global.ts`): Runs on every route (except `meta.public: true`)
   - Server-side: Validates tokens via JWT parsing, auto-refreshes if needed
   - Client-side: Checks in-memory store + localStorage timestamp, silently refreshes if expired
2. **API Plugin** (`plugins/api.ts`): REST API wrapper with automatic 401 retry logic
3. **GraphQL Plugin** (`plugins/gqlFetch.ts`): GraphQL fetch wrapper handling both HTTP 401 and GraphQL `UNAUTHENTICATED` errors

**Token Refresh Flow:**
- Both plugins intercept 401 responses and attempt `POST /tokens/refresh`
- On success, retry the original request
- On failure, revoke tokens via `/tokens/revoke` and redirect to login

### State Management (Pinia)
- **auth.ts**: User state, access token validity tracking with localStorage expiration timestamp
- **categories.ts**: Product categories cache
- **orders.ts**: Order management state

All stores use `pinia-plugin-persistedstate` for persistence.

### GraphQL Integration
Three composables wrap the `$gqlFetch` plugin:
- **useGqlQuery**: For queries with optional caching (default: no cache). Supports reactive variables.
- **useGqlMutation**: For mutations
- **useGqlSubscription**: For real-time subscriptions via graphql-ws

**Important:** `useGqlQuery` defaults to `cache: false` to avoid stale data. Set `{ cache: true }` explicitly if needed.

### Internationalization (i18n)
- Uses `@nuxtjs/i18n` v10 with `strategy: 'prefix'`
- Default locale: French (`fr`)
- Supported: `fr`, `en`, `zh`
- Translations in `/locales/*.json`
- Backend API respects `Accept-Language` header (set automatically in plugins)

**Migration Note:** v10 changed `detectBrowserLanguage.redirectOn` default from `'root'` to `'no redirect'`. This project uses `'all'` to maintain v9 behavior.

### Pages & Routes
- `/login`: Public login page (uses `definePageMeta({ public: true })`)
- `/products`: Product CRUD with category filtering
- `/orders`: Order management with real-time updates
- `/tracking`: Order tracking map (uses OpenLayers)

All non-public routes require authentication via global middleware.

### Component Structure
- **ProductDialog.vue**: Modal for creating/editing products with image upload
- Uses Nuxt UI components (migrated from Vuetify)

### Server-Side Rendering (SSR)
- SSR enabled (`ssr: true` in nuxt.config.ts)
- Cookie forwarding handled in plugins for server-side API calls
- Auth middleware handles both server and client token validation

## Type System

All types are defined in `types/index.ts`:
- **Product**: Full product model with translations, category, and metadata
- **Order**: Order with items, address, payment info, and status (delivery/pickup)
- **User**: User profile with address
- Translation interfaces for multi-language content

Use these types consistently across composables, stores, and components.

## Docker Deployment

Multi-stage Dockerfile optimized for production:
1. Builder stage: Uses `node:24.10-slim`, installs deps, runs `npm run build`
2. Production stage: Uses `node:24.10-alpine3.22`, copies `.output` folder

**CI/CD:** GitHub Actions workflow builds multi-arch images (AMD64 on GitHub runners, ARM64 on self-hosted) and pushes to GitHub Container Registry.

## Common Patterns

### Creating a New GraphQL Query
```typescript
// In a component or composable
const { data, error, pending, refetch } = await useGqlQuery<ResponseType>(
  gql`query { ... }`,
  () => ({ id: someReactiveVar.value }), // reactive variables
  { cache: false, immediate: true }
)
```

### Adding a New Product
Use `useGqlMutation` with the `createProduct` mutation. Handle image uploads separately via REST API if backend requires multipart/form-data.

### Route Protection
Add `definePageMeta({ public: true })` to any page that should skip authentication (e.g., login page). All other pages are protected by default.

### Locale Switching
Use `useLocalePath` from `@nuxtjs/i18n` to generate localized paths:
```typescript
const localePath = useLocalePath()
navigateTo(localePath('products')) // auto-adds /fr/, /en/, or /zh/ prefix
```

## Important Notes

- **README.md mentions Vuetify** but the project now uses Nuxt UI (migration in progress on `remove-vuetify` branch)
- **auth.store logout action** is incomplete (`@TODO: To implement`)
- **Dockerfile hardcodes environment variables** (see `@TODO: Use .env file` comment)
- **Legacy browser support** via `@vitejs/plugin-legacy` for Chrome <57
- **Terser minification** in production build