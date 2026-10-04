// Runs a composable inside a real component instance (lifecycle hooks such as onMounted / onUnmounted / onScopeDispose,
// `useId` and injections behave as in a page) and returns what it returned, plus the wrapper to unmount it.
//
//   const { result, unmount } = mountComposable(() => useOrderingStatus())
//
// Every mounted component is unmounted after the test (tests/support/vue.ts); `unmount` ends one earlier.
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

export function mountComposable<T>(setup: () => T) {
  let result!: T
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
    { attachTo: document.body },
  )
  return {
    result,
    wrapper,
    unmount: () => {
      wrapper.unmount()
    },
  }
}
