// pages/products.vue: creating or updating a product WITH an image goes through `$api` as a multipart GraphQL request
// (a FormData body: operations / map / file, the plugin then leaves the Content-Type to the runtime, which adds the
// boundary), and WITHOUT an image through the normal GraphQL mutation. The multipart builder itself is tested in
// tests/utils/graphqlUpload.test.ts, the Content-Type handling in tests/plugins/api.nuxt.test.ts.
// Run: `vp test run tests/pages/products.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import { makeProduct } from '../fixtures/dashboard'
import { settle } from '../helpers/settle'

const h = vi.hoisted(() => ({
  api: vi.fn(),
  gqlFetch: vi.fn(),
  products: [] as unknown[],
}))

mockNuxtImport(
  'useNuxtApp',
  async (original) => () =>
    new Proxy(original(), {
      get(target, key, receiver) {
        if (key === '$api') return h.api
        if (key === '$gqlFetch') return h.gqlFetch
        return Reflect.get(target, key, receiver)
      },
    }),
)
mockNuxtImport('useGqlQuery', () => async (query: string) => ({
  data: ref(
    query.includes('productCategories') ? { productCategories: [] } : { products: h.products },
  ),
  pending: ref(false),
  refetch: vi.fn(),
}))
mockNuxtImport('useGqlSubscription', () => () => ({ data: ref(null) }))
mockNuxtImport('useIsMobile', () => () => ref(false))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../helpers/i18n')
  return {
    ...(await importOriginal<typeof VueI18NModule>()),
    useI18n: () => ({ ...fakeI18n(), availableLocales: ['fr', 'en'] }),
  }
})

interface ProductsPageVm {
  handleCreate: (input: Record<string, unknown>) => Promise<unknown>
  handleUpdate: (request: { id: string; input: Record<string, unknown> }) => Promise<void>
}

const mountPage = async () => {
  const Page = (await import('~/pages/products.vue')).default
  const wrapper = await mountSuspended(Page)
  await settle()
  return { wrapper, vm: wrapper.vm as unknown as ProductsPageVm }
}

const image = () => new File(['png-bytes'], 'ramen.png', { type: 'image/png' })

beforeEach(() => {
  h.api.mockReset()
  h.gqlFetch.mockReset()
  h.products = [makeProduct({ id: 'p-1' })]
})

describe('products page: image upload', () => {
  const graphqlUrl = () => useRuntimeConfig().public.graphqlHttp

  it('create with an image: a FormData through $api (operations, map, file), no JSON Content-Type forced', async () => {
    const created = makeProduct({ id: 'p-new' })
    h.api.mockResolvedValue({ data: { createProduct: created } })
    const { vm } = await mountPage()

    const file = image()
    await expect(vm.handleCreate({ code: 'R1', price: '12.50', image: file })).resolves.toEqual(
      created,
    )

    expect(h.api).toHaveBeenCalledOnce()
    const [url, options] = h.api.mock.calls[0]!
    expect(url).toBe(graphqlUrl())
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    // Anything in `headers` would override the multipart boundary the runtime generates.
    expect(options.headers).toBeUndefined()

    const form = options.body as FormData
    const operations = JSON.parse(form.get('operations') as string)
    expect(operations.query).toContain('createProduct')
    expect(operations.variables).toEqual({ input: { code: 'R1', price: '12.50', image: null } })
    expect(JSON.parse(form.get('map') as string)).toEqual({ 0: ['variables.input.image'] })
    expect((form.get('0') as File).name).toBe('ramen.png')
    expect(h.gqlFetch).not.toHaveBeenCalled()
  })

  it('create without an image: the normal GraphQL mutation, no $api', async () => {
    const created = makeProduct({ id: 'p-new' })
    h.gqlFetch.mockResolvedValue({ createProduct: created })
    const { vm } = await mountPage()

    await expect(vm.handleCreate({ code: 'R1', price: '12.50' })).resolves.toEqual(created)

    expect(h.api).not.toHaveBeenCalled()
    const [query, options] = h.gqlFetch.mock.calls[0]!
    expect(query).toContain('createProduct')
    expect(options).toEqual({ variables: { input: { code: 'R1', price: '12.50' } } })
  })

  it('update with an image: a FormData through $api carrying the id, no JSON Content-Type forced', async () => {
    h.api.mockResolvedValue({ data: { updateProduct: makeProduct({ id: 'p-1' }) } })
    const { vm } = await mountPage()

    await vm.handleUpdate({ id: 'p-1', input: { price: '13.00', image: image() } })

    expect(h.api).toHaveBeenCalledOnce()
    const [url, options] = h.api.mock.calls[0]!
    expect(url).toBe(graphqlUrl())
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.headers).toBeUndefined()
    const operations = JSON.parse((options.body as FormData).get('operations') as string)
    expect(operations.query).toContain('updateProduct')
    expect(operations.variables).toEqual({ id: 'p-1', input: { price: '13.00', image: null } })
    expect(h.gqlFetch).not.toHaveBeenCalled()
  })

  it('update without an image: the normal GraphQL mutation, no $api', async () => {
    h.gqlFetch.mockResolvedValue({ updateProduct: makeProduct({ id: 'p-1' }) })
    const { vm } = await mountPage()

    await vm.handleUpdate({ id: 'p-1', input: { price: '13.00' } })

    expect(h.api).not.toHaveBeenCalled()
    expect(h.gqlFetch.mock.calls[0]![1]).toEqual({
      variables: { id: 'p-1', input: { price: '13.00' } },
    })
  })

  it('reports a GraphQL error of the upload as a failure (null) without throwing', async () => {
    h.api.mockResolvedValue({ errors: [{ message: 'file too large' }] })
    const { vm } = await mountPage()
    await expect(vm.handleCreate({ code: 'R1', image: image() })).resolves.toBeNull()
  })
})
