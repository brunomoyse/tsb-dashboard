<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">{{ t('navigation.products') }}</h1>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-plus"
          @click="openCreateDialog"
        >
          {{ t('products.add') }}
        </UButton>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('products.search')"
        size="lg"
      />
    </div>

    <!-- Skeleton Loading -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <UCard v-for="i in 8" :key="i">
        <div class="space-y-3">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <USkeleton class="h-3 w-12" />
              <USkeleton class="h-4 w-28" />
              <USkeleton class="h-3 w-20" />
            </div>
            <USkeleton class="h-5 w-14" />
          </div>
          <div class="flex gap-4">
            <USkeleton class="h-5 w-20" />
            <USkeleton class="h-5 w-20" />
          </div>
          <div class="flex justify-between pt-2 border-t border-default">
            <div class="flex gap-1">
              <USkeleton class="h-5 w-5 rounded" />
              <USkeleton class="h-5 w-5 rounded" />
              <USkeleton class="h-5 w-5 rounded" />
            </div>
            <USkeleton class="h-8 w-8 rounded" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Products Card Grid -->
    <div v-else-if="filteredProducts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <UCard
        v-for="product in paginatedProducts"
        :key="product.id"
        class="relative"
      >
        <div class="space-y-3">
          <!-- Header: Code + Name + Category | Price -->
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <span v-if="product.code" class="text-xs font-mono text-muted">{{ product.code }}</span>
              <h3 class="font-semibold text-sm truncate">{{ product.name }}</h3>
              <p class="text-xs text-muted">{{ product.category.name }}</p>
            </div>
            <span class="text-base font-bold ml-2 shrink-0">{{ belPriceFormat.format(product.price) }}</span>
          </div>

          <!-- Status Toggles -->
          <div class="flex items-center gap-2">
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border active:scale-95"
              :class="product.isVisible
                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-400/20'
                : 'bg-(--ui-bg-accented) text-(--ui-text-muted) border-(--ui-border) opacity-60'
              "
              :disabled="togglingField === `${product.id}-isVisible`"
              @click="toggleProductField(product, 'isVisible', !product.isVisible)"
            >
              <UIcon
                :name="product.isVisible ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                class="size-3.5"
                :class="{ 'animate-spin': togglingField === `${product.id}-isVisible` }"
              />
              {{ product.isVisible ? t('common.visible') : t('common.invisible') }}
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border active:scale-95"
              :class="product.isAvailable
                ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20'
                : 'bg-(--ui-bg-accented) text-(--ui-text-muted) border-(--ui-border) opacity-60'
              "
              :disabled="togglingField === `${product.id}-isAvailable`"
              @click="toggleProductField(product, 'isAvailable', !product.isAvailable)"
            >
              <UIcon
                :name="product.isAvailable ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                class="size-3.5"
                :class="{ 'animate-spin': togglingField === `${product.id}-isAvailable` }"
              />
              {{ product.isAvailable ? t('common.available') : t('common.unavailable') }}
            </button>
          </div>

          <!-- Translations + Actions Footer -->
          <div class="flex items-center justify-between pt-2 border-t border-default">
            <div class="flex gap-1">
              <UBadge
                v-for="lang in availableLocales"
                :key="lang"
                :color="hasTranslation(product, lang) ? 'success' : 'error'"
                variant="soft"
                size="xs"
              >
                {{ getFlagEmoji(lang) }}
              </UBadge>
            </div>
            <UButton
              icon="i-lucide-pencil"
              size="md"
              color="neutral"
              variant="ghost"
              @click="openEditDialog(product)"
            />
          </div>
        </div>
      </UCard>
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

    <!-- Empty State -->
    <UCard v-else-if="!pending && filteredProducts.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-package-x" class="size-16 mx-auto mb-4 text-muted" />
      <p class="text-lg text-muted">{{ t('products.noProducts') }}</p>
    </UCard>

  </div>

  <!-- Modals (teleported to body) -->
  <Teleport to="body">
    <!-- Create Product Dialog -->
    <ProductDialog
      v-if="createDialog"
      mode="create"
      @create="handleCreate"
      @close="createDialog = false"
    />

    <!-- Edit Product Dialog -->
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
import { ref, computed, watch } from 'vue'
import { useCategoriesStore, useGqlQuery, useGqlMutation, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import type { CreateProductInput, Product, ProductCategory, UpdateProductRequest } from '~/types'
import ProductDialog from '~/components/ProductDialog.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const graphqlUrl = config.public.graphqlHttp as string
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

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const searchQuery = ref('')

// Pagination state
const page = ref(1)
const pageSize = ref(12)

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

// Fetch products
const { data: dataProducts, refetch: refetchProducts, pending } = await useGqlQuery<{ products: Product[] }>(
  print(PRODUCTS_QUERY),
  {},
  { immediate: true, cache: true }
)

const products = computed(() => dataProducts.value?.products ?? [])

// Filter products based on search query
const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value

  const query = searchQuery.value.toLowerCase()
  return products.value.filter(
    product =>
      product.name.toLowerCase().includes(query) ||
      (product.code && product.code.toLowerCase().includes(query)) ||
      product.category.name.toLowerCase().includes(query)
  )
})

// Paginate the filtered products
const paginatedProducts = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredProducts.value.slice(start, end)
})

// Reset page to 1 when search changes
watch(searchQuery, () => {
  page.value = 1
})

// Fetch categories.
const { data: dataCategories } = await useGqlQuery<{ productCategories: ProductCategory[] }>(
  print(PRODUCT_CATEGORIES_QUERY),
  {},
  { immediate: true }
)

// Save categories in the store.
if (dataCategories.value?.productCategories) {
  categoryStore.setCategories(dataCategories.value?.productCategories)
}

// State for dialogs.
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

// Open the edit dialog.
const openEditDialog = (product: Product) => {
  selectedProduct.value = product
}

// Open the create dialog.
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

// Handle product updates (edit mode).
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
</script>
