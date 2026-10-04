import { defineVitestConfig } from '@nuxt/test-utils/config'
import { nuxtProject } from './tests/support/nuxtProject'

// Client-side Nuxt environment: composables, stores, plugins, route middleware (`import.meta.client === true`), in the
// real dashboard app. See docs/testing.md.
export default defineVitestConfig(
  nuxtProject({ name: 'nuxt', include: ['tests/**/*.nuxt.test.ts'] }),
)
