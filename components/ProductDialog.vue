<template>
  <UModal
    v-model:open="dialog"
    :title="dialogTitle"
    description=" "
    :overlay="true"
    :ui="{
      content: 'max-sm:h-full max-sm:max-h-full max-sm:rounded-none sm:max-w-4xl',
      overlay: 'backdrop-blur-sm bg-gray-950/75',
      body: 'max-sm:p-4',
      footer: 'max-sm:flex-col max-sm:gap-2 sm:justify-end'
    }"
  >
    <template #body>
      <div class="space-y-4 sm:space-y-6">
        <!-- Row 1: Two Columns -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <!-- Left Column: Category, Code, Price, Piece Count -->
          <div class="space-y-3 sm:space-y-4">
            <UFormField :label="t('products.category')" name="category" required>
              <USelectMenu
                v-model="editedProduct.categoryId"
                :items="localizedCategories"
                value-key="id"
                label-key="name"
                :placeholder="t('products.category')"
                :ui="{ content: 'min-w-[200px]' }"
              />
            </UFormField>

            <UFormField :label="t('products.code')" name="code">
              <UInput
                v-model="editedProduct.code"
                :placeholder="t('products.code')"
              />
            </UFormField>

            <UFormField :label="t('products.priceEuro')" name="price" required>
              <UInput
                v-model="editedProduct.price"
                type="number"
                :placeholder="t('products.priceEuro')"
              />
            </UFormField>

            <UFormField :label="t('products.pieceCount')" name="pieceCount">
              <UInput
                v-model.number="editedProduct.pieceCount"
                type="number"
                :placeholder="t('products.pieceCount')"
              />
            </UFormField>
          </div>

          <!-- Right Column: Image Preview / Upload -->
          <div class="flex flex-col items-center justify-center">
            <div v-if="hasImage" class="flex flex-col items-center justify-center gap-3 sm:gap-4">
              <img
                :src="imageUrl"
                alt="Product image"
                class="w-32 max-h-32 sm:w-40 sm:max-h-40 object-contain rounded-lg"
              />
              <UButton
                variant="ghost"
                color="neutral"
                @click="removeImage"
              >
                {{ t('products.removeImage') }}
              </UButton>
            </div>
            <div v-else class="flex flex-col items-center justify-center gap-3 sm:gap-4 w-full">
              <!-- Image preview -->
              <img
                v-if="imagePreview"
                :src="imagePreview"
                alt="Preview"
                class="w-32 max-h-32 sm:w-40 sm:max-h-40 object-contain rounded-lg"
              />

              <!-- File input -->
              <div class="w-full max-w-xs">
                <UFormField label="Upload Image" name="image">
                  <input
                    type="file"
                    accept="image/*"
                    class="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                    @change="handleFileChange"
                  />
                </UFormField>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2: Translations (3 columns) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="translation in editedProduct.translations"
            :key="translation.language"
            class="space-y-2 sm:space-y-3"
          >
            <UFormField
              :label="translation.language.toUpperCase() + ' ' + t('common.name')"
              :name="`translation-${translation.language}-name`"
              :required="translation.language === 'fr'"
            >
              <UInput
                v-model="translation.name"
                :placeholder="t('common.name')"
              />
            </UFormField>

            <UFormField
              :label="translation.language.toUpperCase() + ' ' + t('common.description')"
              :name="`translation-${translation.language}-description`"
            >
              <UTextarea
                v-model="translation.description"
                :placeholder="t('common.description')"
                :rows="2"
                class="sm:!min-h-[4.5rem]"
              />
            </UFormField>
          </div>
        </div>

        <!-- Row 3: Checkboxes -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <UCheckbox
            v-model="editedProduct.isVisible"
            :label="t('common.visible')"
          />
          <UCheckbox
            v-model="editedProduct.isAvailable"
            :label="t('common.available')"
          />
          <UCheckbox
            v-model="editedProduct.isDiscountable"
            :label="t('products.discountable')"
          />
          <UCheckbox
            v-model="editedProduct.isHalal"
            :label="t('products.halal')"
          />
          <UCheckbox
            v-model="editedProduct.isVegan"
            :label="t('products.vegan')"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        variant="outline"
        color="neutral"
        class="max-sm:w-full"
        @click="closeDialog"
      >
        {{ t('common.cancel') }}
      </UButton>
      <UButton
        color="primary"
        class="max-sm:w-full"
        @click="saveChanges"
      >
        {{ saveLabel }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type {
    CreateProductInput,
    Product,
    Translation,
    TranslationInput,
    UpdateProductInput,
    UpdateProductRequest
} from '~/types'
import { useCategoriesStore } from '~/stores/categories'
import { useI18n } from 'vue-i18n'

// Props and emits definition.
const props = defineProps<{
    product?: Product
    mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
    (e: 'update', updatedProduct: UpdateProductRequest): void
    (e: 'create', newProduct: CreateProductInput): void
    (e: 'close'): void
}>()

const { t, locale } = useI18n()

// Languages used for translations.
const languages = ['fr', 'en', 'zh']

// Create a copy of an existing product with exactly the languages we need.
const createProductCopy = (product: Product): UpdateProductInput => {
    const categoryId = product.category?.id || ''
    const translations: TranslationInput[] = languages.map(lang => {
        const existing = product.translations.find(t => t.language === lang)
        return existing
            ? { language: lang, name: existing.name, description: existing.description }
            : { language: lang, name: '', description: '' }
    })
    return { ...product, translations, categoryId }
}

// Create a default product for create mode.
const createDefaultProduct = (): CreateProductInput => ({
    categoryId: '',
    code: null,
    isAvailable: false,
    isDiscountable: true,
    isHalal: false,
    isVegan: false,
    isVisible: false,
    pieceCount: null,
    price: '',
    translations: languages.map(language => ({ language, name: '', description: null }))
})

// Initialize the edited product based on mode.
const editedProduct = ref<CreateProductInput | UpdateProductInput>(
    props.mode === 'create' || !props.product
        ? createDefaultProduct()
        : createProductCopy(props.product)
)

// In edit mode, update the copy if the prop changes.
if (props.mode !== 'create') {
    watch(() => props.product, (newVal) => {
        if (newVal) {
            editedProduct.value = createProductCopy(newVal)
        }
    })
}

const dialog = ref(true)

// Watch dialog state and emit close when it becomes false
watch(dialog, (newValue) => {
    if (!newValue) {
        emit('close')
    }
})

const categoryStore = useCategoriesStore()
const categories = computed(() => categoryStore.getCategories(locale.value))

// Localized categories with the correct language name
const localizedCategories = computed(() => {
    return categories.value.map(cat => {
        // Find translation for current locale
        const translation = cat.translations?.find(t => t.language === locale.value)
        // Use translated name if available, otherwise fallback to default
        const localizedName = translation?.name || cat.name
        return {
            id: cat.id,
            name: localizedName,
            order: cat.order,
            translations: cat.translations
        }
    })
})

const closeDialog = () => {
    dialog.value = false
}

const saveChanges = async () => {
    // Basic validation
    if (!editedProduct.value.categoryId || editedProduct.value.categoryId.trim() === '') {
        return
    }

    const frTranslation = editedProduct.value.translations.find(t => t.language === 'fr')
    if (!frTranslation?.name || frTranslation.name.trim() === '') {
        return
    }

    if (!editedProduct.value.price || editedProduct.value.price === '') {
        return
    }

    if (props.mode === 'create') {
        let createProductInput: CreateProductInput = editedProduct.value as CreateProductInput

        if (selectedImage.value) {
            createProductInput.image = selectedImage.value
        }
        emit('create', createProductInput)
    } else {
        if (!props.product?.id) return

        let updateProductInput: UpdateProductInput = editedProduct.value as UpdateProductInput

        if (selectedImage.value) {
            updateProductInput.image = selectedImage.value
        }

        let updateProductRequest: UpdateProductRequest = {
            id: props.product?.id,
            input: updateProductInput
        }

        emit('update', updateProductRequest)
    }
    closeDialog()
}

const dialogTitle = computed(() =>
    props.mode === 'create' ? t('products.add') : t('products.edit')
)
const saveLabel = computed(() =>
    props.mode === 'create' ? t('common.create') : t('common.save')
)

// ----- Image Preview / Upload Section -----
const config = useRuntimeConfig()
// Compute the image URL based on the product slug.
const imageUrl = computed(() =>
    props.product?.slug
        ? `${config.public.s3bucketUrl}/images/thumbnails/${props.product.slug}.png`
        : ''
)

// Flag indicating if the image exists.
const hasImage = ref(false)
// Reactive property to hold the file if the user uploads one.
const selectedImage = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

const handleFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
        selectedImage.value = file
        const reader = new FileReader()
        reader.onload = (e) => {
            imagePreview.value = e.target?.result as string
        }
        reader.readAsDataURL(file)
    } else {
        selectedImage.value = null
        imagePreview.value = null
    }
}

watch(selectedImage, (file) => {
    if (!file) {
        imagePreview.value = null
    }
})

// Helper function to check if an image exists at a given URL.
const checkImageExists = (url: string) => {
    const img = new Image()
    img.src = url
    img.onload = () => {
        hasImage.value = true
    }
    img.onerror = () => {
        hasImage.value = false
    }
}

onMounted(() => {
    if (imageUrl.value) {
        checkImageExists(imageUrl.value)
    }
})

// Re-check the image whenever the URL changes.
watch(imageUrl, (newUrl) => {
    if (newUrl) {
        checkImageExists(newUrl)
    } else {
        hasImage.value = false
    }
})

// Remove the current image preview so that the file input appears.
const removeImage = () => {
    hasImage.value = false
    selectedImage.value = null
}
</script>

<style scoped>
/* Remove the spinner arrows in WebKit browsers */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Remove the spinner arrows in Firefox */
input[type="number"] {
    -moz-appearance: textfield;
}
</style>
