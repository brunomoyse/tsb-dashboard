import { computed } from 'vue'
import { useRoute, useState } from '#imports'
import { useIsMobile } from '~/composables/useIsMobile'

/**
 * Visibility of the mobile bottom tab bar.
 *
 * The bar shows below `md` on every authenticated page, except when the route
 * sets `definePageMeta({ hideTabBar: true })` (order detail) or while a page
 * shows its own sticky bar and called `hide()` (settings with unsaved changes).
 */
export function useTabBar() {
  const route = useRoute()
  const isMobile = useIsMobile()
  const hidden = useState('pili-tab-bar-hidden', () => false)

  const visible = computed(() =>
    isMobile.value && !hidden.value && !route.meta.hideTabBar && !route.meta.public
  )

  return {
    visible,
    hide: () => { hidden.value = true },
    show: () => { hidden.value = false },
  }
}
