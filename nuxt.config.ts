// https://nuxt.com/docs/api/configuration/nuxt-config

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
      graphqlHttp: process.env.API_BASE_URL + '/graphql',
      graphqlWs: process.env.GRAPHQL_WS_URL,
      printer: {
        enabled: process.env.PRINTER_ENABLED === 'true',
      },
      cookie: {
        accessToken: {
          name: 'access_token',
          httpOnly: true,
          maxAge: 900, // 15 minutes
        },
        refreshToken: {
          name: 'refresh_token',
          httpOnly: true,
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
      redirectOn: 'all' // changed from 'root' to maintain v9 behavior (redirect on all pages)
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
      },
    },
  },

})
