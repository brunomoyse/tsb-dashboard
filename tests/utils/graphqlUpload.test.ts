// The multipart GraphQL upload body (products: create / update with an image). Sent through `$api`, whose plugin strips
// the JSON Content-Type of a FormData body (tests/plugins/api.nuxt.test.ts), so what is checked here is the shape the
// server reads: `operations`, `map` and the file in field 0.
import { describe, expect, it } from 'vite-plus/test'
import { buildGraphqlUpload } from '~/utils/graphqlUpload'

const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'salmon.png', { type: 'image/png' })
const json = (form: FormData, field: string) => JSON.parse(form.get(field) as string)

describe('buildGraphqlUpload', () => {
  it('builds operations, map and the file as the GraphQL multipart request spec says', () => {
    const file = png()
    const form = buildGraphqlUpload({
      query: 'mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }',
      variables: { input: { name: 'Salmon', price: '9.50' } },
      fileVariable: 'input.image',
      file,
    })

    expect(form).toBeInstanceOf(FormData)
    expect([...form.keys()]).toEqual(['operations', 'map', '0'])
    expect(json(form, 'operations')).toEqual({
      query: 'mutation ($input: CreateProductInput!) { createProduct(input: $input) { id } }',
      variables: { input: { name: 'Salmon', price: '9.50', image: null } },
    })
    expect(json(form, 'map')).toEqual({ 0: ['variables.input.image'] })
    const sent = form.get('0') as File
    expect(sent).toBeInstanceOf(File)
    expect(sent.name).toBe('salmon.png')
    expect(sent.type).toBe('image/png')
    expect(sent.size).toBe(4)
  })

  it('keeps the other variables (the id of an update) and sets only the file variable to null', () => {
    const form = buildGraphqlUpload({
      query:
        'mutation ($id: ID!, $input: UpdateProductInput!) { updateProduct(id: $id, input: $input) { id } }',
      variables: { id: 'p-1', input: { name: 'Tuna', isVisible: false } },
      fileVariable: 'input.image',
      file: png(),
    })
    expect(json(form, 'operations').variables).toEqual({
      id: 'p-1',
      input: { name: 'Tuna', isVisible: false, image: null },
    })
    expect(json(form, 'map')).toEqual({ 0: ['variables.input.image'] })
  })

  it('does not mutate the variables it is given', () => {
    const variables = { input: { name: 'Salmon' } }
    buildGraphqlUpload({ query: 'q', variables, fileVariable: 'input.image', file: png() })
    expect(variables).toEqual({ input: { name: 'Salmon' } })
  })

  it('supports a top-level file variable', () => {
    const form = buildGraphqlUpload({
      query: 'mutation ($file: Upload!) { upload(file: $file) }',
      variables: { other: 1 },
      fileVariable: 'file',
      file: png(),
    })
    expect(json(form, 'operations').variables).toEqual({ other: 1, file: null })
    expect(json(form, 'map')).toEqual({ 0: ['variables.file'] })
  })

  it('creates the objects on the way to a nested file variable', () => {
    const form = buildGraphqlUpload({
      query: 'q',
      variables: {},
      fileVariable: 'input.image',
      file: png(),
    })
    expect(json(form, 'operations').variables).toEqual({ input: { image: null } })
  })

  it('replaces a non-object value on the way (null, string) by an object holding the null file variable', () => {
    for (const input of [null, 'oops', undefined]) {
      const form = buildGraphqlUpload({
        query: 'q',
        variables: { input },
        fileVariable: 'input.image',
        file: png(),
      })
      expect(json(form, 'operations').variables).toEqual({ input: { image: null } })
    }
  })
})
