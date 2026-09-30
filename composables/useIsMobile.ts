import { ref } from 'vue'
import type { Ref } from 'vue'

// Below Tailwind's `md` breakpoint (768px): the phone layout with the bottom tab bar.
const MOBILE_QUERY = '(max-width: 767px)'

const isMobile = ref(false)
let bound = false

/**
 * Shared "is the viewport below md" flag. One matchMedia listener for the whole
 * app (the dashboard is a CSR-only SPA, so the value is known at setup time).
 */
export function useIsMobile(): Ref<boolean> {
  if (import.meta.client && !bound) {
    bound = true
    const mql = window.matchMedia(MOBILE_QUERY)
    isMobile.value = mql.matches
    mql.addEventListener('change', (e) => { isMobile.value = e.matches })
  }
  return isMobile
}
