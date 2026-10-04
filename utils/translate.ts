/** The shape of vue-i18n's `t` that the pure helpers in `utils/` need (they take it as a parameter, never the instance). */
export type Translate = (key: string, named?: Record<string, unknown>, plural?: number) => string
