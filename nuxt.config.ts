// https://nuxt.com/docs/api/configuration/nuxt-config

// Derive origins for CSP from environment variables (dev defaults)
const apiOrigin = new URL(process.env.API_BASE_URL || 'http://localhost:8080/api/v1').origin
const wsOrigin = apiOrigin.replace(/^http/, 'ws')
const s3Url = process.env.S3_BUCKET_URL
const zitadelOrigin = process.env.ZITADEL_AUTHORITY || 'https://auth.tokyosushibarliege.be'

const csp = `${[
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `img-src 'self' data:${s3Url ? ` ${s3Url}` : ''}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${apiOrigin} ${wsOrigin} ${zitadelOrigin}`,
    `frame-src 'self' ${zitadelOrigin}`,
].join('; ')};`

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4,
  },
  // SPA mode required for Capacitor (Android WebView loads static files)
  ssr: false,
  ignore: ['plugins/capacitor-sunmi-printer/**'],
  devtools: { enabled: true },
  modules: [
    "@nuxt/ui",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    'pinia-plugin-persistedstate/nuxt'
  ],

  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      dashboardBaseUrl: process.env.DASHBOARD_BASE_URL,
      s3bucketUrl: process.env.S3_BUCKET_URL,
      api: process.env.API_BASE_URL,
      graphqlHttp: `${process.env.API_BASE_URL}/graphql`,
      graphqlWs: process.env.GRAPHQL_WS_URL,
      // Zitadel OIDC
      zitadelAuthority: process.env.ZITADEL_AUTHORITY || 'https://auth.tokyosushibarliege.be',
      zitadelClientId: process.env.ZITADEL_CLIENT_ID || '',
    },
  },

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
      ]
    }
  },

  plugins: [
    '~/plugins/api',
    '~/plugins/gqlFetch',
  ],

  i18n: {
    defaultLocale: 'fr',
    strategy: 'prefix',
    locales: [
      {
        code: 'fr',
        language: 'fr-BE'
      },
      {
        code: 'en',
        language: 'en'
      },
      {
        code: 'zh',
        language: 'zh-CN'
      },
      {
        code: 'nl',
        language: 'nl-BE'
      }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'all' // Changed from 'root' to maintain v9 behavior (redirect on all pages)
    },
    baseUrl: process.env.DASHBOARD_BASE_URL,
    vueI18n: "../i18n.config.ts",
  },


  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
        'Content-Security-Policy': csp,
      },
    },
  },

})
