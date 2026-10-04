// Categories store: the product categories, sorted for display (and persisted by the persistedstate plugin).
// Run: `vp test run tests/stores/categories.test.ts`.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { useCategoriesStore } from '~/stores/categories'
import { makeCategory } from '../fixtures/dashboard'

const zh = (name: string) => [{ language: 'zh', name, description: null }]

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('setCategories', () => {
  it('replaces the list', () => {
    const store = useCategoriesStore()
    store.setCategories([makeCategory({ id: 'c-1' })])
    store.setCategories([makeCategory({ id: 'c-2' }), makeCategory({ id: 'c-3' })])
    expect(store.categories.map((c) => c.id)).toEqual(['c-2', 'c-3'])
  })
})

describe('getCategories', () => {
  it('sorts by name for the Latin locales', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-1', name: 'Sushi' }),
      makeCategory({ id: 'c-2', name: 'Boissons' }),
      makeCategory({ id: 'c-3', name: 'Entrées' }),
    ])
    for (const locale of ['fr', 'en', 'nl']) {
      expect(store.getCategories(locale).map((c) => c.name)).toEqual([
        'Boissons',
        'Entrées',
        'Sushi',
      ])
    }
  })

  it('compares names with locale rules (accents do not push a name to the end)', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-1', name: 'Zakouski' }),
      makeCategory({ id: 'c-2', name: 'Épices' }),
      makeCategory({ id: 'c-3', name: 'Entrées' }),
    ])
    expect(store.getCategories('fr').map((c) => c.name)).toEqual(['Entrées', 'Épices', 'Zakouski'])
  })

  it('sorts by the Chinese translation (pinyin order) for zh', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-s', name: 'Sushi', translations: zh('寿司') }), // shou si
      makeCategory({ id: 'c-b', name: 'Drinks', translations: zh('饮料') }), // yin liao
      makeCategory({ id: 'c-a', name: 'Starters', translations: zh('前菜') }), // qian cai
    ])
    expect(store.getCategories('zh').map((c) => c.id)).toEqual(['c-a', 'c-s', 'c-b'])
  })

  it('puts categories without a Chinese translation first for zh (empty name), without failing', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-zh', name: 'Sushi', translations: zh('寿司') }),
      makeCategory({ id: 'c-none', name: 'Aardappel', translations: [] }),
    ])
    expect(store.getCategories('zh').map((c) => c.id)).toEqual(['c-none', 'c-zh'])
  })

  it('tolerates categories whose translations are missing altogether (legacy cache)', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-zh', name: 'Sushi', translations: zh('寿司') }),
      { ...makeCategory({ id: 'c-legacy', name: 'Old' }), translations: undefined as never },
    ])
    expect(store.getCategories('zh').map((c) => c.id)).toEqual(['c-legacy', 'c-zh'])
  })

  it('tolerates several categories without translations for zh, whatever the comparison order', () => {
    const store = useCategoriesStore()
    const legacy = (id: string) => ({
      ...makeCategory({ id, name: id }),
      translations: undefined as never,
    })
    store.setCategories([legacy('c-1'), legacy('c-2'), legacy('c-3')])
    expect(store.getCategories('zh').map((c) => c.id)).toEqual(['c-1', 'c-2', 'c-3'])
  })

  it('returns the store list itself, sorted in place', () => {
    const store = useCategoriesStore()
    store.setCategories([
      makeCategory({ id: 'c-1', name: 'B' }),
      makeCategory({ id: 'c-2', name: 'A' }),
    ])
    const sorted = store.getCategories('en')
    expect(sorted).toBe(store.categories)
    expect(store.categories.map((c) => c.name)).toEqual(['A', 'B'])
  })
})
