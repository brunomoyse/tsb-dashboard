/**
 * Builds the body of a GraphQL multipart request (https://github.com/jaydenseric/graphql-multipart-request-spec) that
 * uploads one file: the `operations` part (query + variables, the file's variable set to null), the `map` part (which
 * form field fills which variable) and the file itself in field `0`.
 *
 * Sent through `$api` as a `FormData` body: the plugin drops its default JSON Content-Type for it, so the runtime adds
 * the multipart boundary.
 *
 * @param fileVariable path of the file variable inside `variables`, e.g. `input.image`.
 */
export function buildGraphqlUpload(options: {
  query: string
  variables: Record<string, unknown>
  fileVariable: string
  file: File
}): FormData {
  const { query, variables, fileVariable, file } = options
  const form = new FormData()
  form.append(
    'operations',
    JSON.stringify({ query, variables: setNull(variables, fileVariable.split('.')) }),
  )
  form.append('map', JSON.stringify({ 0: [`variables.${fileVariable}`] }))
  form.append('0', file, file.name)
  return form
}

/** A copy of `value` with the property at `path` set to null (the objects on the way are copied, not mutated). */
function setNull(value: Record<string, unknown>, path: string[]): Record<string, unknown> {
  const [key, ...rest] = path as [string, ...string[]]
  if (rest.length === 0) return { ...value, [key]: null }
  const child = value[key]
  const childObject = typeof child === 'object' && child !== null ? child : {}
  return { ...value, [key]: setNull(childObject as Record<string, unknown>, rest) }
}
