<template>
  <UModal
    v-model:open="dialog"
    :title="dialogTitle"
    description=" "
    :overlay="true"
    :ui="{
      content: 'max-lg:h-full max-lg:max-h-full max-lg:rounded-none lg:max-w-4xl',
      overlay: 'backdrop-blur-sm bg-gray-950/75',
      body: 'max-lg:p-4',
      footer: 'max-lg:flex-col max-lg:gap-2 lg:justify-end'
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
                    accept="image/png,image/jpeg,image/webp"
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

        <!-- Row 4: Product Choices (edit mode only) -->
        <div v-if="props.mode === 'edit' && props.product" class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">{{ t('products.choices.title') }}</h3>
            <UButton
              icon="i-lucide-plus"
              size="xs"
              variant="outline"
              @click="addNewChoice"
            >
              {{ t('products.choices.add') }}
            </UButton>
          </div>

          <div v-if="editedChoices.length === 0" class="text-sm text-muted italic">
            {{ t('products.choices.none') }}
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(choice, cIdx) in editedChoices"
              :key="choice.id || `new-${cIdx}`"
              class="border rounded-lg p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-muted">
                  {{ choice.id ? `#${cIdx + 1}` : t('products.choices.new') }}
                </span>
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="removeChoice(cIdx)"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <UFormField :label="t('products.choices.priceModifier')" :name="`choice-${cIdx}-price`">
                  <UInput
                    v-model="choice.priceModifier"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </UFormField>
                <UFormField :label="t('products.choices.sortOrder')" :name="`choice-${cIdx}-sort`">
                  <UInput
                    v-model.number="choice.sortOrder"
                    type="number"
                    placeholder="0"
                  />
                </UFormField>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <UFormField
                  v-for="lang in languages"
                  :key="lang"
                  :label="`${lang.toUpperCase()} ${t('common.name')}`"
                  :name="`choice-${cIdx}-${lang}`"
                >
                  <UInput
                    v-model="getChoiceTranslation(choice, lang).name"
                    :placeholder="t('common.name')"
                  />
                </UFormField>
              </div>
            </div>
          </div>
        </div>

        <!-- Validation Errors -->
        <div v-if="validationErrors.length > 0" class="rounded-md bg-red-50 p-3">
          <ul class="list-disc list-inside text-sm text-red-600 space-y-1">
            <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
          </ul>
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
    ChoiceTranslation,
    Product,
    ProductChoice,
    Translation,
    TranslationInput,
    UpdateProductInput,
    UpdateProductRequest
} from '~/types'
// Local UI type: keep categoryId for form binding, map to categoryID for API
type UIUpdateProductInput = Omit<UpdateProductInput, 'categoryID'> & { categoryId?: string }
import { useCategoriesStore } from '~/stores/categories'
import { useI18n } from 'vue-i18n'
import gql from 'graphql-tag'

// Props and emits definition.
const props = defineProps<{
    product?: Product
    mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
    (e: 'update', updatedProduct: UpdateProductRequest): void
    (e: 'create', newProduct: CreateProductInput): void
    (e: 'choicesChanged'): void
    (e: 'close'): void
}>()

const { t, locale } = useI18n()
const toast = useToast()

// Languages used for translations.
const languages = ['fr', 'en', 'zh']

// Create a copy of an existing product with exactly the languages we need.
const createProductCopy = (product: Product): UIUpdateProductInput => {
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
const editedProduct = ref<CreateProductInput | UIUpdateProductInput>(
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

const validationErrors = ref<string[]>([])
const dialog = ref(true)

// ---- Product Choices Management ----
interface EditableChoice {
    id?: string
    priceModifier: string
    sortOrder: number
    translations: ChoiceTranslation[]
    _deleted?: boolean
    _isNew?: boolean
}

const editedChoices = ref<EditableChoice[]>(
    props.product?.choices?.map(c => ({
        id: c.id,
        priceModifier: c.priceModifier,
        sortOrder: c.sortOrder,
        translations: languages.map(lang => {
            const existing = c.translations?.find(t => t.locale === lang)
            return { locale: lang, name: existing?.name || '' }
        })
    })) ?? []
)

const getChoiceTranslation = (choice: EditableChoice, lang: string) => {
    let t = choice.translations.find(tr => tr.locale === lang)
    if (!t) {
        t = { locale: lang, name: '' }
        choice.translations.push(t)
    }
    return t
}

const addNewChoice = () => {
    editedChoices.value.push({
        priceModifier: '0',
        sortOrder: editedChoices.value.length,
        translations: languages.map(lang => ({ locale: lang, name: '' })),
        _isNew: true
    })
}

const removeChoice = async (idx: number) => {
    const choice = editedChoices.value[idx]
    if (choice.id) {
        // Delete existing choice via GraphQL
        try {
            const DELETE_CHOICE = gql`
              mutation ($id: ID!) {
                deleteProductChoice(id: $id)
              }
            `
            const { mutate } = useGqlMutation<{ deleteProductChoice: boolean }>(DELETE_CHOICE)
            await mutate({ id: choice.id })
        } catch (err) {
            console.error('Failed to delete choice:', err)
            return
        }
    }
    editedChoices.value.splice(idx, 1)
    emit('choicesChanged')
}

const saveChoices = async () => {
    if (!props.product?.id) return

    const CREATE_CHOICE = gql`
      mutation ($input: CreateProductChoiceInput!) {
        createProductChoice(input: $input) {
          id
          productId
          priceModifier
          sortOrder
          name
          translations { locale name }
        }
      }
    `
    const UPDATE_CHOICE = gql`
      mutation ($id: ID!, $input: UpdateProductChoiceInput!) {
        updateProductChoice(id: $id, input: $input) {
          id
          productId
          priceModifier
          sortOrder
          name
          translations { locale name }
        }
      }
    `

    for (const choice of editedChoices.value) {
        if (choice._isNew) {
            const { mutate } = useGqlMutation<{ createProductChoice: ProductChoice }>(CREATE_CHOICE)
            await mutate({
                input: {
                    productId: props.product.id,
                    priceModifier: choice.priceModifier,
                    sortOrder: choice.sortOrder,
                    translations: choice.translations.filter(t => t.name.trim() !== '')
                }
            })
        } else if (choice.id) {
            const { mutate } = useGqlMutation<{ updateProductChoice: ProductChoice }>(UPDATE_CHOICE)
            await mutate({
                id: choice.id,
                input: {
                    priceModifier: choice.priceModifier,
                    sortOrder: choice.sortOrder,
                    translations: choice.translations.filter(t => t.name.trim() !== '')
                }
            })
        }
    }

    emit('choicesChanged')
}

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

const LANG_LABELS: Record<string, string> = { fr: 'FR', en: 'EN', zh: 'ZH' }
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
const CODE_REGEX = /^[A-Z]+\d+$/

const saveChanges = async () => {
    validationErrors.value = []

    // Category required
    if (!editedProduct.value.categoryId || editedProduct.value.categoryId.trim() === '') {
        validationErrors.value.push(t('validation.categoryRequired'))
    }

    // French name required
    const frTranslations = editedProduct.value.translations ?? []
    const frTranslation = frTranslations.find(t => t.language === 'fr')
    if (!frTranslation?.name || frTranslation.name.trim() === '') {
        validationErrors.value.push(t('validation.frenchNameRequired'))
    }

    // Price required and positive
    if (!editedProduct.value.price || editedProduct.value.price === '') {
        validationErrors.value.push(t('validation.priceRequired'))
    } else {
        const priceNum = parseFloat(String(editedProduct.value.price).replace(',', '.'))
        if (isNaN(priceNum) || priceNum <= 0) {
            validationErrors.value.push(t('validation.pricePositive'))
        }
    }

    // Description max 500 chars per language
    for (const tr of (editedProduct.value.translations ?? [])) {
        if (tr.description && tr.description.length > 500) {
            validationErrors.value.push(t('validation.descriptionTooLong', { lang: LANG_LABELS[tr.language] || tr.language }))
        }
    }

    // Image validation
    if (selectedImage.value) {
        if (selectedImage.value.size > MAX_IMAGE_SIZE) {
            validationErrors.value.push(t('validation.imageTooLarge'))
        }
        if (!ALLOWED_IMAGE_TYPES.includes(selectedImage.value.type)) {
            validationErrors.value.push(t('validation.imageInvalidType'))
        }
    }

    // Code format (optional field)
    if (editedProduct.value.code && editedProduct.value.code.trim() !== '') {
        if (!CODE_REGEX.test(editedProduct.value.code.trim())) {
            validationErrors.value.push(t('validation.codeFormat'))
        }
    }

    // Piece count: positive integer (optional field)
    if (editedProduct.value.pieceCount != null) {
        const pc = Number(editedProduct.value.pieceCount)
        if (!Number.isInteger(pc) || pc <= 0) {
            validationErrors.value.push(t('validation.pieceCountPositive'))
        }
    }

    // Choice validation (edit mode only)
    if (props.mode === 'edit') {
        for (let i = 0; i < editedChoices.value.length; i++) {
            const choice = editedChoices.value[i]
            const hasAnyName = choice.translations.some(tr => tr.name.trim() !== '')
            if (!hasAnyName) {
                validationErrors.value.push(t('validation.choiceNameRequired', { index: i + 1 }))
            }
            const pm = parseFloat(String(choice.priceModifier).replace(',', '.'))
            if (isNaN(pm)) {
                validationErrors.value.push(t('validation.choicePriceRequired', { index: i + 1 }))
            }
        }
    }

    if (validationErrors.value.length > 0) {
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

        // Save choices first
        await saveChoices()

        let updateProductInput: UpdateProductInput = editedProduct.value as UpdateProductInput

        if (selectedImage.value) {
            updateProductInput.image = selectedImage.value
        }

        const { categoryId, ...rest } = (updateProductInput as any)
        const inputForApi = categoryId ? { ...rest, categoryID: categoryId } : rest
        let updateProductRequest: UpdateProductRequest = {
            id: props.product?.id,
            input: inputForApi as UpdateProductInput
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
