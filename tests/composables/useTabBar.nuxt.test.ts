// useTabBar: when the mobile bottom tab bar shows: below md, unless a page hides it (route meta or its own sticky bar)
// or the route is public (login). The route and the viewport flag are the boundaries; the shared state is real.
// Run: `vp test run tests/composables/useTabBar.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { reactive, ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtState } from '#imports'

const route = vi.hoisted(() => ({ current: null as null | { meta: Record<string, unknown> } }))
const mobile = vi.hoisted(() => ({ current: null as null | { value: boolean } }))

mockNuxtImport('useRoute', () => () => route.current)
vi.mock('~/composables/useIsMobile', () => ({ useIsMobile: () => mobile.current }))

const { useTabBar } = await import('~/composables/useTabBar')

beforeEach(() => {
  route.current = reactive({ meta: {} as Record<string, unknown> })
  mobile.current = ref(true)
  clearNuxtState('pili-tab-bar-hidden') // the composable's own initial value (visible) applies
})

describe('visible', () => {
  it('shows on a phone for an ordinary authenticated page', () => {
    expect(useTabBar().visible.value).toBe(true)
  })

  it('is hidden above the md breakpoint', () => {
    mobile.current!.value = false
    expect(useTabBar().visible.value).toBe(false)
  })

  it('is hidden on a page that asks for it (hideTabBar, e.g. the order detail)', () => {
    route.current!.meta.hideTabBar = true
    expect(useTabBar().visible.value).toBe(false)
  })

  it('is hidden on a public page (the login)', () => {
    route.current!.meta.public = true
    expect(useTabBar().visible.value).toBe(false)
  })

  it('reacts to the viewport and to the route changing', () => {
    const { visible } = useTabBar()
    expect(visible.value).toBe(true)
    mobile.current!.value = false
    expect(visible.value).toBe(false)
    mobile.current!.value = true
    route.current!.meta.hideTabBar = true
    expect(visible.value).toBe(false)
    route.current!.meta.hideTabBar = false
    expect(visible.value).toBe(true)
  })
})

describe('hide and show', () => {
  it('hide() removes the bar while a page shows its own sticky bar, show() brings it back', () => {
    const { visible, hide, show } = useTabBar()
    hide()
    expect(visible.value).toBe(false)
    show()
    expect(visible.value).toBe(true)
  })

  it('is shared: a page can hide the bar that the layout renders', () => {
    const page = useTabBar()
    const layout = useTabBar()
    page.hide()
    expect(layout.visible.value).toBe(false)
  })

  it('show() does not override the route or the viewport', () => {
    const { visible, show } = useTabBar()
    route.current!.meta.hideTabBar = true
    show()
    expect(visible.value).toBe(false)
  })
})
