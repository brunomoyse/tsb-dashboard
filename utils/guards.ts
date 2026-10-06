/** True for a string with at least one character: null, undefined and '' are all "no text". */
export const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ''

/** Narrows an unknown value to an object whose properties can be read safely. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
