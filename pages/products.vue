<template>
  <div>
    <!-- Page Header (mobile gets its own padding, desktop inherits the wrapper) -->
    <div class="px-3 pt-3 pb-3 sm:hidden flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-highlighted truncate">{{ t('navigation.products') }}</h1>
        <p class="text-xs text-muted mt-0.5">{{ filteredProducts.length }} {{ t('orders.items') }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="md"
        class="shrink-0"
        :aria-label="t('products.add')"
        @click="openCreateDialog"
      />
    </div>

    <!-- Toolbar: Search + Category Chips (sticky on mobile, sibling of wrapper so it pins flush) -->
    <div class="sticky top-0 z-30 px-3 pb-3 pt-1 bg-(--ui-bg-accented) sm:hidden">
      <UInput
        v-model="searchQuery"
        name="search-products-mobile"
        icon="i-lucide-search"
        :placeholder="t('products.search')"
        size="lg"
        class="w-full"
        :ui="{ base: 'h-12 text-base' }"
      />

      <!-- Category chips (horizontal scroll on mobile) -->
      <div class="relative mt-2 -mx-3 px-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          v-for="cat in categoryFilterItems"
          :key="cat.id ?? 'all'"
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="selectedCategoryId === cat.id
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="selectedCategoryId = cat.id"
        >
          {{ cat.name }}
        </button>
        <div class="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-(--ui-bg-accented) to-transparent" aria-hidden="true" />
      </div>
    </div>

  <div class="p-3 sm:p-4 md:p-6">
    <!-- Page Header (desktop only) -->
    <div class="mb-6 hidden sm:flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-highlighted truncate">{{ t('navigation.products') }}</h1>
        <p class="text-sm text-muted mt-0.5">{{ filteredProducts.length }} {{ t('orders.items') }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreateDialog"
      >
        {{ t('products.add') }}
      </UButton>
    </div>

    <!-- Toolbar (desktop only, in normal flow inside wrapper) -->
    <div class="hidden sm:block pb-4">
      <UInput
        v-model="searchQuery"
        name="search-products"
        icon="i-lucide-search"
        :placeholder="t('products.search')"
        size="lg"
        class="w-full"
        :ui="{ base: 'h-12 text-base' }"
      />

      <div class="relative mt-3 flex gap-2 flex-wrap">
        <button
          v-for="cat in categoryFilterItems"
          :key="`d-${cat.id ?? 'all'}`"
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="selectedCategoryId === cat.id
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="selectedCategoryId = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- ========== MOBILE VIEW: Cards (< md) ========== -->
    <div class="md:hidden">
      <!-- Skeleton Loading -->
      <div v-if="pending" class="space-y-2">
        <div v-for="i in 6" :key="i" class="flex flex-col rounded-xl bg-(--ui-bg) border border-(--ui-border) overflow-hidden">
          <div class="flex items-center gap-3 p-3">
            <USkeleton class="size-16 rounded-lg shrink-0" />
            <div class="flex-1 space-y-1.5">
              <USkeleton class="h-4 w-32" />
              <USkeleton class="h-3 w-20" />
              <USkeleton class="h-3 w-16" />
            </div>
          </div>
          <div class="grid grid-cols-2 border-t border-(--ui-border)">
            <USkeleton class="h-11 rounded-none" />
            <USkeleton class="h-11 rounded-none" />
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredProducts.length === 0"
        class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-(--ui-bg) border border-(--ui-border)"
      >
        <UIcon name="i-lucide-package-x" class="size-14 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ (searchQuery || selectedCategoryId) ? t('products.noProductsFiltered') : t('products.noProducts') }}</p>
      </div>

      <!-- Product cards -->
      <div v-else class="space-y-2">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="flex flex-col rounded-xl bg-(--ui-bg) border border-(--ui-border) overflow-hidden"
        >
          <!-- Top: tap to edit -->
          <button
            type="button"
            class="flex items-center gap-3 p-3 text-left active:bg-(--ui-bg-elevated) transition-colors min-h-16"
            @click="openEditDialog(product)"
          >
            <div
              class="size-16 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) overflow-hidden shrink-0 flex items-center justify-center"
            >
              <img
                v-if="getProductImageUrl(product)"
                :src="getProductImageUrl(product) ?? undefined"
                :alt="product.name"
                class="size-full object-cover"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <UIcon v-else name="i-lucide-image-off" class="size-5 text-muted" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span v-if="product.code" class="text-xs font-mono font-semibold text-(--ui-primary) shrink-0">{{ product.code }}</span>
                <span class="font-semibold text-sm text-highlighted truncate">{{ product.name }}</span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-muted">
                <span class="truncate">{{ product.category.name }}</span>
                <span v-if="product.pieceCount" class="shrink-0">· {{ product.pieceCount }} pcs</span>
              </div>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="font-bold text-sm text-highlighted tabular-nums" data-allow-mismatch="text">
                  {{ belPriceFormat.format(Number(product.price)) }}
                </span>
                <!-- Dietary dots -->
                <span v-if="product.isHalal" class="size-1.5 rounded-full bg-emerald-500" :title="t('products.halal')" />
                <span v-if="product.isVegetarian" class="size-1.5 rounded-full bg-emerald-500" :title="t('products.vegetarian')" />
                <span v-if="product.isSpicy" class="size-1.5 rounded-full bg-red-500" :title="t('products.spicy')" />
                <!-- Missing translations warning -->
                <UIcon
                  v-if="hasMissingTranslations(product)"
                  name="i-lucide-languages"
                  class="size-3.5 text-[#D08A2E]"
                  :title="t('products.translations')"
                />
              </div>
            </div>

            <UIcon name="i-lucide-chevron-right" class="size-5 text-muted shrink-0" />
          </button>

          <!-- Bottom: dual toggles (50/50 full-width touch targets) -->
          <div class="grid grid-cols-2 border-t border-(--ui-border) divide-x divide-(--ui-border)">
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-colors active:scale-[0.98]"
              :class="product.isVisible
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'text-(--ui-text-muted) opacity-70'
              "
              :disabled="togglingField === `${product.id}-isVisible`"
              :aria-pressed="product.isVisible"
              :aria-label="t('common.visibility')"
              @click="toggleProductField(product, 'isVisible', !product.isVisible)"
            >
              <UIcon
                :name="togglingField === `${product.id}-isVisible` ? 'i-lucide-loader-2' : (product.isVisible ? 'i-lucide-eye' : 'i-lucide-eye-off')"
                class="size-4"
                :class="{ 'animate-spin': togglingField === `${product.id}-isVisible` }"
              />
              {{ product.isVisible ? t('common.visible') : t('common.invisible') }}
            </button>

            <button
              type="button"
              class="flex items-center justify-center gap-1.5 h-12 text-sm font-medium transition-colors active:scale-[0.98]"
              :class="product.isAvailable
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                : 'text-(--ui-text-muted) opacity-70'
              "
              :disabled="togglingField === `${product.id}-isAvailable`"
              :aria-pressed="product.isAvailable"
              :aria-label="t('common.availability')"
              @click="toggleProductField(product, 'isAvailable', !product.isAvailable)"
            >
              <UIcon
                :name="togglingField === `${product.id}-isAvailable` ? 'i-lucide-loader-2' : (product.isAvailable ? 'i-lucide-circle-check' : 'i-lucide-circle-x')"
                class="size-4"
                :class="{ 'animate-spin': togglingField === `${product.id}-isAvailable` }"
              />
              {{ product.isAvailable ? t('common.available') : t('common.unavailable') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== TABLET+ VIEW: Table (md+) ========== -->
    <div class="hidden md:block rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!pending && filteredProducts.length > 0"
        :data="paginatedProducts"
        :columns="columns"
        :loading="pending"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4',
          tr: 'cursor-pointer hover:bg-(--ui-bg-elevated) transition-colors'
        }"
        @select="onRowSelect"
      >
        <!-- Product name + image -->
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <div
              class="size-9 rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) overflow-hidden shrink-0 flex items-center justify-center"
            >
              <img
                v-if="getProductImageUrl(row.original)"
                :src="getProductImageUrl(row.original) ?? undefined"
                :alt="row.original.name"
                class="size-full object-cover"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
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
          <span class="text-sm font-semibold tabular-nums" data-allow-mismatch="text">{{ belPriceFormat.format(Number(row.original.price)) }}</span>
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
              :name="togglingField === `${row.original.id}-isVisible` ? 'i-lucide-loader-2' : (row.original.isVisible ? 'i-lucide-eye' : 'i-lucide-eye-off')"
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
              :name="togglingField === `${row.original.id}-isAvailable` ? 'i-lucide-loader-2' : (row.original.isAvailable ? 'i-lucide-circle-check' : 'i-lucide-circle-x')"
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
            <UBadge v-if="row.original.isVegetarian" color="success" variant="subtle" size="xs">
              {{ t('products.vegetarian') }}
            </UBadge>
            <UBadge v-if="row.original.isSpicy" color="success" variant="subtle" size="xs">
              {{ t('products.spicy') }}
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
              {{ lang.toUpperCase() }}
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
        <p class="text-muted text-sm">{{ (searchQuery || selectedCategoryId) ? t('products.noProductsFiltered') : t('products.noProducts') }}</p>
      </div>

      <!-- Pagination -->
      <div v-if="!pending && filteredProducts.length > pageSize" class="flex justify-center py-4 border-t border-(--ui-border)">
        <UPagination
          v-model:page="page"
          :total="filteredProducts.length"
          :items-per-page="pageSize"
          show-edges
        />
      </div>
    </div>
  </div>

  <!-- Modals (UModal handles its own teleport) -->
  <ProductDialog
    v-if="createDialog"
    mode="create"
    :on-create="handleCreate"
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
  </div>
</template>

<script lang="ts" setup>
import type { CreateProductInput, Product, ProductCategory, UpdateProductRequest } from '~/types'
import { computed, ref, watch } from 'vue'
import { useCategoriesStore, useGqlMutation, useGqlQuery, useGqlSubscription, useNuxtApp } from '#imports'
import ProductDialog from '~/components/ProductDialog.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

const { $api } = useNuxtApp()
const config = useRuntimeConfig()
const graphqlUrl = config.public.graphqlHttp as string
const s3bucketUrl = config.public.s3bucketUrl as string
const { t, availableLocales } = useI18n()
const categoryStore = useCategoriesStore()
const toast = useToast()

// Helper: Check if a translation is complete.
const hasTranslation = (product: Product, lang: string) => {
  const translation = product.translations.find(tr => tr.language === lang)
  return translation && translation.name && translation.name.trim() !== ''
}

// Helper: True if any of the available locales is missing a translation.
const hasMissingTranslations = (product: Product) =>
  availableLocales.some(lang => !hasTranslation(product, lang))

// Helper: Return the flag emoji for each language.
const getFlagEmoji = (lang: string) => {
  switch (lang) {
    case 'fr':
      return '🇫🇷'
    case 'en':
      return '🇬🇧'
    case 'zh':
      return '🇨🇳'
    case 'nl':
      return '🇳🇱'
    default:
      return ''
  }
}

const imageCacheBust = reactive<Record<string, number>>({})

// Helper: Get product thumbnail URL
const getProductImageUrl = (product: Product) => {
  if (!s3bucketUrl || !product.id) return null
  const bust = imageCacheBust[product.id]
  return `${s3bucketUrl}/images/thumbnails/${product.id}.png${bust ? `?v=${bust}` : ''}`
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
      isSpicy
      isVegetarian
      isDiscountable
      vatCategory
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        choiceGroupId
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
      isSpicy
      isVegetarian
      isDiscountable
      vatCategory
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        choiceGroupId
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
  mutation ($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      price
      code
      slug
      pieceCount
      isVisible
      isAvailable
      isHalal
      isSpicy
      isVegetarian
      isDiscountable
      vatCategory
      name
      description
      category {
        id
        name
      }
      choices {
        id
        productId
        choiceGroupId
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
      isSpicy
      isVegetarian
      isDiscountable
      vatCategory
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

    // Update local data — reassign dataProducts.value because useAsyncData uses shallowRef
    if (dataProducts.value?.products) {
      const idx = dataProducts.value.products.findIndex(p => p.id === product.id)
      if (idx !== -1) {
        dataProducts.value = {
          ...dataProducts.value,
          products: dataProducts.value.products.map((p, i) =>
            i === idx ? { ...p, [field]: value } as Product : p
          )
        }
      }
    }
  } catch (err) {
    if (import.meta.dev) console.error(`Toggle ${field} failed:`, err)
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  } finally {
    togglingField.value = null
  }
}

// Row select handler for UTable
const onRowSelect = (_e: Event, row: any) => {
  openEditDialog(row.original)
}

// Open the edit dialog
const openEditDialog = (product: Product) => {
  selectedProduct.value = product
}

// Open the create dialog
const openCreateDialog = () => {
  createDialog.value = true
}

const handleCreate = async (newProductInput: CreateProductInput): Promise<Product | null> => {
  let newProduct: Product
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

      const res = await $api<{ data: { createProduct: Product }; errors?: { message: string }[] }>(graphqlUrl, {
        method: 'POST',
        body: form
      })

      if (res.errors?.length) {
        if (import.meta.dev) console.error('GraphQL errors:', res.errors)
        toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
        return null
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
      dataProducts.value = {
        ...dataProducts.value,
        products: [newProduct, ...dataProducts.value.products]
      }
    }

    return newProduct
  } catch (err) {
    if (import.meta.dev) console.error('handleCreate failed:', err)
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    return null
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

      const res = await $api<{ data: { updateProduct: Product }; errors?: { message: string }[] }>(graphqlUrl, {
        method: 'POST',
        body: form
      })

      if (res.errors?.length) {
        if (import.meta.dev) console.error('GraphQL errors:', res.errors)
        toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
        return
      }

      updated = res.data.updateProduct
      imageCacheBust[updated.id] = Date.now()
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
        dataProducts.value = {
          ...dataProducts.value,
          products: dataProducts.value.products.map((p, i) => (i === idx ? updated : p))
        }
      }
    }

    selectedProduct.value = null
  } catch (err) {
    if (import.meta.dev) console.error('handleUpdate failed:', err)
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  }
}

// Handle choices changed (created/updated/deleted)
const handleChoicesChanged = async () => {
  await refetchProducts()
}

// Subscribe in setup so onScopeDispose ties to the component scope; in onMounted it leaks the WebSocket.
const { data: liveProduct } = useGqlSubscription<{ productUpdated: Partial<Product> }>(
  print(SUB_PRODUCT_UPDATED)
)
watch(liveProduct, (val) => {
  if (!val?.productUpdated?.id || !dataProducts.value?.products) return
  const idx = dataProducts.value.products.findIndex(p => p.id === val.productUpdated.id)
  if (idx !== -1) {
    dataProducts.value.products.splice(idx, 1, {
      ...dataProducts.value.products[idx]!,
      ...val.productUpdated,
    } as Product)
  }
})
</script>
