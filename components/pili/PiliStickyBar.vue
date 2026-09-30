<template>
  <!-- Last child of the page root: sticks above the tab bar, or to the bottom of the screen when the tab bar is hidden. -->
  <div
    class="sticky z-20 mt-auto bottom-(--pili-tabbar-h,0px) bg-elevated border-t border-default px-4 pt-3 pb-[calc(12px+var(--pili-safe-bottom,0px))]"
  >
    <slot />
  </div>
</template>
