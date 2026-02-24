<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">{{ t('navigation.products') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ filteredProducts.length }} {{ t('orders.items') }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreateDialog"
      >
        {{ t('products.add') }}
      </UButton>
    </div>

    <!-- Toolbar: Search + Category Filter -->
    <div class="mb-4 flex flex-col sm:flex-row gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('products.search')"
        size="lg"
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedCategoryId"
        :items="categoryFilterItems"
        value-key="id"
        label-key="name"
        size="lg"
        class="w-full sm:w-56"
      />
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!pending && filteredProducts.length > 0"
        :data="paginatedProducts"
        :columns="columns"
        :loading="pending"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4'
        }"
        @select="(_e: Event, row: any) => openEditDialog(row.original)"
      >
        <!-- Product name + image -->
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="size-9 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) overflow-hidden shrink-0 flex items-center justify-center"
            >
              <img
                v-if="getProductImageUrl(row.original)"
                :src="getProductImageUrl(row.original)"
                :alt="row.original.name"
                class="size-full object-cover"
              />
              <UIcon v-else name="i-lucide-image-off" class="size-4 text-muted" />
            </div>
            <p class="font-medium text-sm text-highlighted truncate">{{ row.original.name }}</p>
          </div>
        </template>

        <!-- Code -->
        <template #code-cell="{ row }">
          <span class="text-sm font-mono text-muted">{{ row.original.code ?? '-' }}</span>
        </template>

        <!-- Category -->
        <template #category-cell="{ row }">
          <span class="text-sm">{{ row.original.category.name }}</span>
        </template>

        <!-- Price -->
        <template #price-cell="{ row }">
          <span class="text-sm font-semibold tabular-nums">{{ belPriceFormat.format(Number(row.original.price)) }}</span>
        </template>

        <!-- Pieces -->
        <template #pieceCount-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">{{ row.original.pieceCount ?? '-' }}</span>
        </template>

        <!-- Visibility toggle -->
        <template #isVisible-cell="{ row }">
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border active:scale-95 cursor-pointer"
            :class="row.original.isVisible
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20'
              : 'bg-(--ui-bg-accented) text-(--ui-text-muted) border-(--ui-border) opacity-60'
            "
            :disabled="togglingField === `${row.original.id}-isVisible`"
            @click.stop="toggleProductField(row.original, 'isVisible', !row.original.isVisible)"
          >
            <UIcon
              :name="row.original.isVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              class="size-3.5"
              :class="{ 'animate-spin': togglingField === `${row.original.id}-isVisible` }"
            />
            {{ row.original.isVisible ? t('common.visible') : t('common.invisible') }}
          </button>
        </template>

        <!-- Availability toggle -->
        <template #isAvailable-cell="{ row }">
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border active:scale-95 cursor-pointer"
            :class="row.original.isAvailable
              ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20'
              : 'bg-(--ui-bg-accented) text-(--ui-text-muted) border-(--ui-border) opacity-60'
            "
            :disabled="togglingField === `${row.original.id}-isAvailable`"
            @click.stop="toggleProductField(row.original, 'isAvailable', !row.original.isAvailable)"
          >
            <UIcon
              :name="row.original.isAvailable ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
              class="size-3.5"
              :class="{ 'animate-spin': togglingField === `${row.original.id}-isAvailable` }"
            />
            {{ row.original.isAvailable ? t('common.available') : t('common.unavailable') }}
          </button>
        </template>

        <!-- Dietary badges -->
        <template #tags-cell="{ row }">
          <div class="flex gap-1">
            <UBadge v-if="row.original.isHalal" color="success" variant="subtle" size="xs">
              {{ t('products.halal') }}
            </UBadge>
            <UBadge v-if="row.original.isVegan" color="success" variant="subtle" size="xs">
              {{ t('products.vegan') }}
            </UBadge>
          </div>
        </template>

        <!-- Translation flags -->
        <template #translations-cell="{ row }">
          <div class="flex gap-1">
            <UBadge
              v-for="lang in availableLocales"
              :key="lang"
              :color="hasTranslation(row.original, lang) ? 'success' : 'error'"
              variant="soft"
              size="xs"
            >
              {{ getFlagEmoji(lang) }}
            </UBadge>
          </div>
        </template>

        <!-- Actions -->
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              @click.stop="openEditDialog(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="divide-y divide-(--ui-border)">
        <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
          <USkeleton class="size-9 rounded-lg" />
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-3.5 w-32" />
            <USkeleton class="h-3 w-16" />
          </div>
          <USkeleton class="h-3.5 w-20 hidden sm:block" />
          <USkeleton class="h-3.5 w-16 hidden sm:block" />
          <USkeleton class="h-6 w-20 rounded-full hidden md:block" />
          <USkeleton class="h-6 w-20 rounded-full hidden md:block" />
          <USkeleton class="h-5 w-5 rounded hidden lg:block" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!pending && filteredProducts.length === 0" class="flex flex-col items-center justify-center py-16">
        <UIcon name="i-lucide-package-x" class="size-12 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('products.noProducts') }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!pending && filteredProducts.length > pageSize" class="flex justify-center mt-6">
      <UPagination
        v-model:page="page"
        :total="filteredProducts.length"
        :items-per-page="pageSize"
        show-edges
      />
    </div>
  </div>

  <!-- Modals -->
  <Teleport to="body">
    <ProductDialog
      v-if="createDialog"
      mode="create"
      @create="handleCreate"
      @close="createDialog = false"
    />

    <ProductDialog
      v-if="selectedProduct"
      :product="selectedProduct"
      mode="edit"
      @update="handleUpdate"
      @choices-changed="handleChoicesChanged"
      @close="selectedProduct = null"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCategoriesStore, useGqlQuery, useGqlMutation, useGqlSubscription, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import type { CreateProductInput, Product, ProductCategory, UpdateProductRequest } from '~/types'
import ProductDialog from '~/components/ProductDialog.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const graphqlUrl = config.public.graphqlHttp as string
const s3bucketUrl = config.public.s3bucketUrl as string
const { t, availableLocales } = useI18n()
const categoryStore = useCategoriesStore()
const toast = useToast()

// Helper: Check if a translation is complete.
const hasTranslation = (product: Product, lang: string) => {
  const translation = product.translations.find(t => t.language === lang)
  return translation && translation.name && translation.name.trim() !== ''
}

// Helper: Return the flag emoji for each language.
const getFlagEmoji = (lang: string) => {
  switch (lang) {
    case 'fr':
      return '🇫🇷'
    case 'en':
      return '🇬🇧'
    case 'zh':
      return '🇨🇳'
    default:
      return ''
  }
}

// Helper: Get product thumbnail URL
const getProductImageUrl = (product: Product) => {
  if (!s3bucketUrl || !product.slug) return null
  return `${s3bucketUrl}/images/thumbnails/${product.slug}.png`
}

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const searchQuery = ref('')
const selectedCategoryId = ref<string | null>(null)

// Pagination state
const page = ref(1)
const pageSize = ref(10)

// Table columns
const columns = computed(() => [
  { accessorKey: 'code', header: t('products.code') },
  { accessorKey: 'category', header: t('products.category') },
  { accessorKey: 'name', header: t('common.name') },
  { accessorKey: 'price', header: t('common.price'), meta: { class: { td: 'hidden sm:table-cell', th: 'hidden sm:table-cell' } } },
  { accessorKey: 'pieceCount', header: t('products.pieceCount'), meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'isVisible', header: t('common.visibility'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } },
  { accessorKey: 'isAvailable', header: t('common.availability'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } },
  { accessorKey: 'tags', header: '', enableSorting: false, meta: { class: { td: 'hidden xl:table-cell', th: 'hidden xl:table-cell' } } },
  { accessorKey: 'translations', header: t('products.translations'), enableSorting: false, meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'actions', header: '', enableSorting: false }
])

const PRODUCTS_QUERY = gql`
  query {
    products {
      id
      price
      code
      slug
      pieceCount
      isVisible
      isAvailable
      isHalal
      isVegan
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        priceModifier
        sortOrder
        name
        translations {
          locale
          name
        }
      }
      translations {
        language
        name
        description
      }
    }
  }
`

const PRODUCT_CATEGORIES_QUERY = gql`
  query {
    productCategories {
      id
      name
      order
      translations {
        language
        name
        description
      }
    }
  }
`

const CREATE_PRODUCT_MUTATION = gql`
  mutation ($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      price
      code
      slug
      pieceCount
      isVisible
      isAvailable
      isHalal
      isVegan
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        priceModifier
        sortOrder
        name
        translations {
          locale
          name
        }
      }
      translations {
        language
        name
        description
      }
    }
  }
`

const UPDATE_PRODUCT_MUTATION = gql`
  mutation ($id: ID!, $input: CreateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      price
      code
      slug
      pieceCount
      isVisible
      isAvailable
      isHalal
      isVegan
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        priceModifier
        sortOrder
        name
        translations {
          locale
          name
        }
      }
      translations {
        language
        name
        description
      }
    }
  }
`

// Lightweight mutation for inline toggles
const TOGGLE_PRODUCT_MUTATION = gql`
  mutation ($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      isVisible
      isAvailable
    }
  }
`

const SUB_PRODUCT_UPDATED = gql`
  subscription ProductUpdated {
    productUpdated {
      id
      isAvailable
      isVisible
      price
      code
      pieceCount
      isHalal
      isVegan
      isDiscountable
      name
      slug
    }
  }
`

// Fetch products
const { data: dataProducts, refetch: refetchProducts, pending } = await useGqlQuery<{ products: Product[] }>(
  print(PRODUCTS_QUERY),
  {},
  { immediate: true, cache: true }
)

const products = computed(() => dataProducts.value?.products ?? [])

// Fetch categories
const { data: dataCategories } = await useGqlQuery<{ productCategories: ProductCategory[] }>(
  print(PRODUCT_CATEGORIES_QUERY),
  {},
  { immediate: true }
)

if (dataCategories.value?.productCategories) {
  categoryStore.setCategories(dataCategories.value?.productCategories)
}

// Category order lookup: categoryId → order
const categoryOrderMap = computed(() => {
  const map = new Map<string, number>()
  for (const cat of dataCategories.value?.productCategories ?? []) {
    map.set(cat.id, cat.order)
  }
  return map
})

// Category filter dropdown items
const categoryFilterItems = computed(() => {
  const all = { id: null as string | null, name: t('orders.all') }
  const cats = (dataCategories.value?.productCategories ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(c => ({ id: c.id, name: c.name }))
  return [all, ...cats]
})

// Filter and sort products (same order as /menu: category order, then product code)
const filteredProducts = computed(() => {
  let result = products.value

  if (selectedCategoryId.value) {
    result = result.filter(p => p.category.id === selectedCategoryId.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      product =>
        product.name.toLowerCase().includes(query) ||
        (product.code && product.code.toLowerCase().includes(query)) ||
        product.category.name.toLowerCase().includes(query)
    )
  }

  // Sort by category order, then by product code (alphanumeric)
  const orderMap = categoryOrderMap.value
  return result.slice().sort((a, b) => {
    const catOrderA = orderMap.get(a.category.id) ?? Infinity
    const catOrderB = orderMap.get(b.category.id) ?? Infinity
    if (catOrderA !== catOrderB) return catOrderA - catOrderB

    const codeA = a.code ?? ''
    const codeB = b.code ?? ''
    const alphaA = codeA.match(/^[A-Za-z]+/)?.[0] ?? ''
    const alphaB = codeB.match(/^[A-Za-z]+/)?.[0] ?? ''
    if (alphaA !== alphaB) return alphaA.localeCompare(alphaB)

    const numA = parseInt(codeA.match(/[0-9]+/)?.[0] ?? '0', 10)
    const numB = parseInt(codeB.match(/[0-9]+/)?.[0] ?? '0', 10)
    if (numA !== numB) return numA - numB

    return a.name.localeCompare(b.name)
  })
})

// Paginate the filtered products
const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredProducts.value.slice(start, end)
})

// Reset page to 1 when filters change
watch([searchQuery, selectedCategoryId], () => {
  page.value = 1
})

// State for dialogs
const selectedProduct = ref<Product | null>(null)
const createDialog = ref(false)

// Inline toggle state
const togglingField = ref<string | null>(null)

const toggleProductField = async (product: Product, field: 'isAvailable' | 'isVisible', value: boolean) => {
  const fieldKey = `${product.id}-${field}`
  togglingField.value = fieldKey

  try {
    const { mutate } = useGqlMutation<{ updateProduct: Product }>(TOGGLE_PRODUCT_MUTATION)
    await mutate({
      id: product.id,
      input: { [field]: value }
    })

    // Update local data
    if (dataProducts.value?.products) {
      const idx = dataProducts.value.products.findIndex(p => p.id === product.id)
      if (idx !== -1) {
        dataProducts.value.products[idx] = {
          ...dataProducts.value.products[idx],
          [field]: value
        }
      }
    }
  } catch (err) {
    console.error(`Toggle ${field} failed:`, err)
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  } finally {
    togglingField.value = null
  }
}

// Open the edit dialog
const openEditDialog = (product: Product) => {
  selectedProduct.value = product
}

// Open the create dialog
const openCreateDialog = () => {
  createDialog.value = true
}

const handleCreate = async (newProductInput: CreateProductInput) => {
  let newProduct
  const form = new FormData()
  const { image, ...productData } = newProductInput

  try {
    if (image instanceof File) {
      const operations = {
        query: print(CREATE_PRODUCT_MUTATION),
        variables: {
          input: {
            ...productData,
            image: null
          }
        }
      }
      form.append('operations', JSON.stringify(operations))

      form.append(
        'map',
        JSON.stringify({
          0: ['variables.input.image']
        })
      )

      if (image instanceof File) {
        form.append('0', image, image.name)
      }

      const res = await $api(graphqlUrl, {
        method: 'POST',
        body: form
      })

      if (res.errors?.length) {
        console.error('GraphQL errors:', res.errors)
        return
      }

      newProduct = res.data.createProduct
    } else {
      const { mutate: mutationCreateProduct } = useGqlMutation<{ createProduct: Product }>(
        CREATE_PRODUCT_MUTATION
      )
      const res: { createProduct: Product } = await mutationCreateProduct({
        input: productData
      })
      newProduct = res.createProduct
    }

    if (dataProducts.value?.products) {
      dataProducts.value.products.unshift(newProduct)
    }

    createDialog.value = false
  } catch (err) {
    console.error('handleCreate failed:', err)
  }
}

// Handle product updates (edit mode)
const handleUpdate = async (updateReq: UpdateProductRequest) => {
  let updated: Product
  const { id, input } = updateReq
  const { image, ...productData } = input as CreateProductInput
  const form = new FormData()

  try {
    if (image instanceof File) {
      const operations = {
        query: print(UPDATE_PRODUCT_MUTATION),
        variables: {
          id,
          input: {
            ...productData,
            image: null
          }
        }
      }
      form.append('operations', JSON.stringify(operations))

      form.append(
        'map',
        JSON.stringify({
          0: ['variables.input.image']
        })
      )

      form.append('0', image, image.name)

      const res = await $api(graphqlUrl, {
        method: 'POST',
        body: form
      })

      if (res.errors?.length) {
        console.error('GraphQL errors:', res.errors)
        return
      }

      updated = res.data.updateProduct
    } else {
      const { mutate: mutationUpdateProduct } = useGqlMutation<{ updateProduct: Product }>(
        UPDATE_PRODUCT_MUTATION
      )

      const { updateProduct } = await mutationUpdateProduct({
        id,
        input: productData
      })
      updated = updateProduct
    }

    if (dataProducts.value?.products) {
      const idx = dataProducts.value.products.findIndex(p => p.id === updated.id)
      if (idx !== -1) {
        dataProducts.value.products.splice(idx, 1, updated)
      }
    }

    selectedProduct.value = null
  } catch (err) {
    console.error('handleUpdate failed:', err)
  }
}

// Handle choices changed (created/updated/deleted)
const handleChoicesChanged = async () => {
  await refetchProducts()
}

// Subscribe to real-time product updates
onMounted(() => {
  const { data: liveProduct } = useGqlSubscription<{ productUpdated: Partial<Product> }>(
    print(SUB_PRODUCT_UPDATED)
  )
  watch(liveProduct, (val) => {
    if (!val?.productUpdated?.id || !dataProducts.value?.products) return
    const idx = dataProducts.value.products.findIndex(p => p.id === val.productUpdated.id)
    if (idx !== -1) {
      dataProducts.value.products.splice(idx, 1, {
        ...dataProducts.value.products[idx],
        ...val.productUpdated,
      })
    }
  })
})
</script>
