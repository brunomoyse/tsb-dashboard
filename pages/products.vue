<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">{{ t('navigation.products') }}</h1>
      </div>
      <div class="flex gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :title="t('products.syncToDeliveroo')"
          @click="openSyncModal"
        >
          <div class="flex items-center gap-1.5">
            <img src="/deliveroo-logo.svg" alt="Deliveroo" class="size-4" />
            <UIcon name="i-lucide-refresh-cw" class="size-3.5" />
          </div>
        </UButton>
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

    <!-- Products Table -->
    <UTable
      v-if="filteredProducts.length > 0"
      :columns="columns"
      :data="paginatedProducts"
    >
      <template #code-cell="{ cell }">
        {{ cell.row.original.code || '-' }}
      </template>

      <template #name-cell="{ cell }">
        {{ cell.row.original.name }}
      </template>

      <template #category-cell="{ cell }">
        {{ cell.row.original.category.name }}
      </template>

      <template #price-cell="{ cell }">
        {{ belPriceFormat.format(cell.row.original.price) }}
      </template>

      <template #isAvailable-cell="{ cell }">
        <UBadge
          :color="cell.row.original.isAvailable ? 'success' : 'error'"
          variant="soft"
          size="sm"
        >
          {{ cell.row.original.isAvailable ? t('common.available') : t('common.unavailable') }}
        </UBadge>
      </template>

      <template #isVisible-cell="{ cell }">
        <UBadge
          :color="cell.row.original.isVisible ? 'success' : 'error'"
          variant="soft"
          size="sm"
        >
          {{ cell.row.original.isVisible ? t('common.visible') : t('common.invisible') }}
        </UBadge>
      </template>

      <template #translationsStatus-cell="{ cell }">
        <div class="flex gap-1">
          <UBadge
            v-for="lang in availableLocales"
            :key="lang"
            :color="hasTranslation(cell.row.original, lang) ? 'success' : 'error'"
            variant="soft"
            size="sm"
            class="w-8 h-8 flex items-center justify-center"
          >
            {{ getFlagEmoji(lang) }}
          </UBadge>
        </div>
      </template>

      <template #actions-cell="{ cell }">
        <div class="flex justify-end">
          <UButton
            icon="i-lucide-pencil"
            size="sm"
            color="neutral"
            variant="ghost"
            @click="openEditDialog(cell.row.original)"
          />
        </div>
      </template>
    </UTable>

    <!-- Pagination -->
    <div v-if="filteredProducts.length > pageSize" class="flex justify-center mt-6">
      <UPagination
        v-model:page="page"
        :total="filteredProducts.length"
        :items-per-page="pageSize"
        show-edges
      />
    </div>

    <!-- Empty State -->
    <UCard v-else-if="filteredProducts.length === 0" class="text-center py-12">
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
      @close="selectedProduct = null"
    />

    <!-- Deliveroo Sync Modal -->
    <DeliverooSyncModal
      v-model:open="showSyncModal"
      :preview-data="syncPreviewData"
      :loading="isLoadingPreview"
      :syncing="isSyncing"
      @confirm="confirmSync"
    />
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useCategoriesStore, useGqlQuery, useGqlMutation, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import { useToast } from '#imports'
import type { CreateProductInput, Product, ProductCategory, UpdateProductRequest, SyncPreviewData } from '~/types'
import ProductDialog from '~/components/ProductDialog.vue'
import DeliverooSyncModal from '~/components/DeliverooSyncModal.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { $api, $gqlFetch } = useNuxtApp()
const config = useRuntimeConfig()
const graphqlUrl = config.public.graphqlHttp as string
const { t, availableLocales } = useI18n()
const categoryStore = useCategoriesStore()
const toast = useToast()

// Hardcoded Deliveroo credentials (temporary)
const DELIVEROO_BRAND_ID = 'b7f3e9a2-4c8d-4e5f-9b2a-1d6c8e4f7a9b'
const DELIVEROO_MENU_ID = 'a5a8c2f1-7e4b-4d9c-8a3f-6b9e1c4d7f2a'

// Define table columns
const columns = [
  { id: 'code', key: 'code', label: t('common.code') },
  { id: 'category', key: 'category', label: t('products.category') },
  { id: 'name', key: 'name', label: t('common.name') },
  { id: 'price', key: 'price', label: t('common.price') },
  { id: 'isVisible', key: 'isVisible', label: t('common.visibility') },
  { id: 'isAvailable', key: 'isAvailable', label: t('common.availability') },
  { id: 'translationsStatus', key: 'translationsStatus', label: t('products.translations'), sortable: false },
  { id: 'actions', key: 'actions', label: t('common.actions'), sortable: false }
]

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
const pageSize = ref(10)

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
      translations {
        language
        name
        description
      }
    }
  }
`

const PREVIEW_SYNC_MENU_QUERY = gql`
  query PreviewSyncMenu($source: OrderSource!, $brandId: ID!, $menuId: ID!) {
    previewSyncMenuPlatform(
      source: $source
      brandId: $brandId
      menuId: $menuId
    ) {
      toCreate {
        name
        price
        description
        category
        isAvailable
        isVisible
      }
      toUpdate {
        id
        name
        currentPrice
        newPrice
        currentDescription
        newDescription
        currentAvailability
        newAvailability
      }
      toDelete {
        id
        name
        reason
      }
    }
  }
`

const SYNC_MENU_MUTATION = gql`
  mutation SyncMenu($source: OrderSource!, $brandId: ID!, $menuId: ID!) {
    syncMenuToPlatform(
      source: $source
      brandId: $brandId
      menuId: $menuId
    )
  }
`

// Fetch products
const { data: dataProducts } = await useGqlQuery<{ products: Product[] }>(
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

// State for Deliveroo sync
const showSyncModal = ref(false)
const syncPreviewData = ref<SyncPreviewData | null>(null)
const isLoadingPreview = ref(false)
const isSyncing = ref(false)

// Open the edit dialog.
const openEditDialog = (product: Product) => {
  selectedProduct.value = product
}

// Open the create dialog.
const openCreateDialog = () => {
  createDialog.value = true
}

// Open the Deliveroo sync modal with preview data
const openSyncModal = async () => {
  try {
    isLoadingPreview.value = true
    showSyncModal.value = true

    const result = await $gqlFetch<{ previewSyncMenuPlatform: SyncPreviewData }>(
      print(PREVIEW_SYNC_MENU_QUERY),
      {
        variables: {
          source: 'DELIVEROO',
          brandId: DELIVEROO_BRAND_ID,
          menuId: DELIVEROO_MENU_ID
        }
      }
    )

    syncPreviewData.value = result?.previewSyncMenuPlatform ?? null
  } catch (err) {
    console.error('Failed to load sync preview:', err)
    toast.add({
      title: t('products.syncModal.syncError'),
      color: 'error'
    })
    showSyncModal.value = false
  } finally {
    isLoadingPreview.value = false
  }
}

// Confirm and execute the Deliveroo sync
const confirmSync = async () => {
  try {
    isSyncing.value = true

    const { mutate: mutateSyncMenu } = useGqlMutation<{ syncMenuToPlatform: boolean }>(
      SYNC_MENU_MUTATION
    )

    await mutateSyncMenu({
      source: 'DELIVEROO',
      brandId: DELIVEROO_BRAND_ID,
      menuId: DELIVEROO_MENU_ID
    })

    toast.add({
      title: t('products.syncModal.syncSuccess'),
      color: 'success'
    })

    // Close modal and reset state
    showSyncModal.value = false
    syncPreviewData.value = null
  } catch (err) {
    console.error('Failed to sync menu:', err)
    toast.add({
      title: t('products.syncModal.syncError'),
      color: 'error'
    })
  } finally {
    isSyncing.value = false
  }
}

const handleCreate = async (newProductInput: CreateProductInput) => {
  let newProduct
  const form = new FormData()
  const { image, ...productData } = newProductInput

  try {
    if (image instanceof File) {
      // 1.a) operations: the query and variables, with a null placeholder for the file
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

      // 1.b) map: tell server that file "0" goes into variables.data.image
      form.append(
        'map',
        JSON.stringify({
          0: ['variables.input.image']
        })
      )

      // 1.c) attach the actual file
      if (image instanceof File) {
        form.append('0', image, image.name)
      }

      // 2) POST to /graphql
      const res = await $api(graphqlUrl, {
        method: 'POST',
        body: form
      })

      // Error handling
      if (res.errors?.length) {
        console.error('GraphQL errors:', res.errors)
        return
      }

      // Pull out the created product
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

    // Add the created product to the list of products
    if (dataProducts.value?.products) {
      dataProducts.value.products.unshift(newProduct)
    }

    // Close the dialog
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
      // 1) build the multipart payload
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

      // 2) fire it
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
      // no file — use normal composable
      const { mutate: mutationUpdateProduct } = useGqlMutation<{ updateProduct: Product }>(
        UPDATE_PRODUCT_MUTATION
      )

      const { updateProduct } = await mutationUpdateProduct({
        id,
        input: productData
      })
      updated = updateProduct
    }

    // 3) patch your local list in place
    if (dataProducts.value?.products) {
      const idx = dataProducts.value.products.findIndex(p => p.id === updated.id)
      if (idx !== -1) {
        dataProducts.value.products.splice(idx, 1, updated)
      }
    }

    // 4) clear selection / close dialog
    selectedProduct.value = null
  } catch (err) {
    console.error('handleUpdate failed:', err)
  }
}
</script>
