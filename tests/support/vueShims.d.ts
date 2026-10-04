// `vp check` type-checks without the Vue language tools: it cannot read a `.vue` file, so a test that imports a page
// (`import('~/pages/orders.vue')`) would fail with TS2307. `nuxi typecheck` resolves the real component first.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
