// https://nuxt.com/docs/api/configuration/nuxt-config

// Derive origins for CSP from environment variables (dev defaults)
const apiOrigin = new URL(process.env.API_BASE_URL || 'http://localhost:8080/api/v1').origin
const wsOrigin = apiOrigin.replace(/^http/, 'ws')
const s3Url = process.env.S3_BUCKET_URL

const csp = `${[
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data:${s3Url ? ` ${s3Url}` : ''}`,
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin} ${wsOrigin}`,
].join('; ')};`

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4,
  },
  ssr: true,
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
      s3bucketUrl: process.env.S3_BUCKET_URL,
      api: process.env.API_BASE_URL,
      graphqlHttp: `${process.env.API_BASE_URL}/graphql`,
      graphqlWs: process.env.GRAPHQL_WS_URL,
      printer: {
        enabled: process.env.PRINTER_ENABLED === 'true',
      },
      cookie: {
        accessToken: {
          name: 'access_token',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 900, // 15 minutes
        },
        refreshToken: {
          name: 'refresh_token',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 604800, // 7 days
        },
      }
    },
  },

  app: {
    head: {
      script: [
        {
          src: 'https://cdn.jsdelivr.net/npm/epson-epos-sdk@2.27.0/epos-2.27.0.js',
          defer: true,
        }
      ]
    }
  },

  plugins: [
    '~/plugins/api',
    '~/plugins/gqlFetch',
    '~/plugins/printer.client',
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
