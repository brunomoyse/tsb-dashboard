// https://nuxt.com/docs/api/configuration/nuxt-config

import legacy from '@vitejs/plugin-legacy'

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
    jwtSecret: process.env.JWT_SECRET,
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


  vite: {
    plugins: [
      legacy({
        // only generate a legacy bundle for Chrome ≥56
        targets: ['chrome <57'],

        // include runtime polyfills for Array.at()
        // plugin-legacy will inject core-js usage‐based polyfills by default,
        // but Array.at is newer so we add it explicitly:
        polyfills: ['es.array.at'],

        additionalLegacyPolyfills: ['systemjs'],
      })
    ],
  },
})
