export default defineAppConfig({
  ui: {
    colors: {
      primary: 'volt',
      secondary: 'brume',
      neutral: 'neutral',
    },
    // Pili: a neutral solid button or chip is Ardoise. Brume is kept for
    // selection (color="secondary"), Volt for the main action of a screen.
    button: {
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'solid',
          class:
            'text-default bg-accented hover:bg-(--pili-pressed) active:bg-(--pili-pressed) disabled:bg-accented aria-disabled:bg-accented',
        },
      ],
    },
    // A switch that is on is green (OK), never Volt.
    switch: {
      defaultVariants: { color: 'success' },
    },
    badge: {
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'solid',
          class: 'text-default bg-accented',
        },
      ],
    },
  },
})
