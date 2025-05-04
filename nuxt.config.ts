// https://nuxt.com/docs/api/configuration/nuxt-config

import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,
  devtools: { enabled: true },
  build: {
    transpile: ['vuetify'],
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    'pinia-plugin-persistedstate/nuxt'
  ],

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
    bundle: {
      optimizeTranslationDirective: false,
    },
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
      redirectOn: 'root' // recommended for SEO
    },
    baseUrl: process.env.DASHBOARD_BASE_URL,
    vueI18n: "../i18n.config.ts",
  },


  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
  },
})
