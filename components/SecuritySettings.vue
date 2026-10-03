<template>
  <SettingsSection
    v-model:open="open"
    :title="t('settings.security.title')"
    :description="t('settings.security.description')"
    :summary="statusLabel"
  >
    <div class="flex flex-col gap-4 py-3" :class="{ 'border-t border-default': isMobile }">
      <div v-if="loadingStatus" class="flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        {{ t('settings.security.loading') }}
      </div>

      <p v-else-if="statusError" class="text-sm text-error">
        {{ t('settings.security.loadFailed') }}
      </p>

      <!-- Enabled -->
      <template v-else-if="enabled">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield-check" class="size-5 text-success shrink-0" />
          <span class="text-sm font-medium">{{ t('settings.security.enabled') }}</span>
        </div>

        <form v-if="disabling" class="flex flex-col gap-3" @submit.prevent="confirmDisable">
          <p class="text-sm text-muted">{{ t('settings.security.disableHint') }}</p>
          <UInput
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            :placeholder="t('settings.security.codePlaceholder')"
            :aria-label="t('settings.security.codeLabel')"
            class="font-mono max-w-48"
            size="lg"
          />
          <p v-if="actionError" class="text-sm text-error" role="alert">{{ actionError }}</p>
          <div class="flex gap-2 flex-wrap">
            <UButton
              type="submit"
              color="error"
              :loading="busy"
              :disabled="code.length < 6"
              :label="t('settings.security.disableConfirm')"
            />
            <UButton
              color="neutral"
              variant="ghost"
              :label="t('common.cancel')"
              @click="resetAction"
            />
          </div>
        </form>
        <div v-else>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-shield-off"
            :label="t('settings.security.disable')"
            @click="disabling = true"
          />
        </div>
      </template>

      <!-- Enrollment in progress -->
      <form v-else-if="enrollment" class="flex flex-col gap-4" @submit.prevent="confirmEnable">
        <p class="text-sm text-muted">{{ t('settings.security.scanHint') }}</p>
        <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally by uqr from the otpauth URI -->
        <div class="bg-white p-3 rounded-xl w-48 h-48 self-start" v-html="qrSvg" />
        <div class="flex flex-col gap-2">
          <UButton
            :to="enrollment.uri"
            external
            color="neutral"
            variant="outline"
            icon="i-lucide-smartphone"
            class="self-start"
            :label="t('settings.security.openInApp')"
          />
          <span class="text-xs text-muted">{{ t('settings.security.manualKey') }}</span>
          <div class="flex items-center gap-2">
            <code class="font-mono text-sm break-all bg-accented rounded-md px-2 py-1">{{
              enrollment.secret
            }}</code>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              :aria-label="t('settings.security.copyKey')"
              @click="copySecret"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <label for="totp-enroll-code" class="text-sm font-medium">{{
            t('settings.security.codeLabel')
          }}</label>
          <UInput
            id="totp-enroll-code"
            v-model="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            :placeholder="t('settings.security.codePlaceholder')"
            class="font-mono max-w-48"
            size="lg"
          />
        </div>
        <p v-if="actionError" class="text-sm text-error" role="alert">{{ actionError }}</p>
        <div class="flex gap-2 flex-wrap">
          <UButton
            type="submit"
            :loading="busy"
            :disabled="code.length < 6"
            :label="t('settings.security.activate')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('common.cancel')"
            @click="resetAction"
          />
        </div>
      </form>

      <!-- Disabled -->
      <template v-else>
        <p class="text-sm text-muted">{{ t('settings.security.disabledHint') }}</p>
        <p v-if="actionError" class="text-sm text-error" role="alert">{{ actionError }}</p>
        <div>
          <UButton
            icon="i-lucide-shield-plus"
            :loading="busy"
            :label="t('settings.security.enable')"
            @click="startEnable"
          />
        </div>
      </template>
    </div>
  </SettingsSection>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNuxtApp, useToast } from '#imports'
import SettingsSection from '~/components/SettingsSection.vue'
import { renderSVG } from 'uqr'
import { useI18n } from 'vue-i18n'

interface Enrollment {
  uri: string
  secret: string
}

const { t } = useI18n()
const { $api } = useNuxtApp()
const toast = useToast()
const isMobile = useIsMobile()

const open = ref(false)
const loadingStatus = ref(true)
const statusError = ref(false)
const enabled = ref(false)
const enrollment = ref<Enrollment | null>(null)
const disabling = ref(false)
const code = ref('')
const busy = ref(false)
const actionError = ref('')

const qrSvg = computed(() =>
  enrollment.value ? renderSVG(enrollment.value.uri, { border: 0 }) : '',
)

const statusLabel = computed(() => {
  if (loadingStatus.value) return ''
  return enabled.value ? t('settings.security.statusOn') : t('settings.security.statusOff')
})

const errorStatus = (error: unknown): number | undefined => {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status?: number }).status
  }
  return undefined
}

const describeError = (error: unknown): string => {
  const status = errorStatus(error)
  if (status === 422) return t('settings.security.invalidCode')
  if (status === 429) return t('login.tooManyRequests')
  return t('settings.security.actionFailed')
}

const resetAction = () => {
  enrollment.value = null
  disabling.value = false
  code.value = ''
  actionError.value = ''
}

onMounted(async () => {
  try {
    const status = await $api<{ totp: boolean }>('/auth/mfa')
    enabled.value = status.totp
  } catch {
    statusError.value = true
  } finally {
    loadingStatus.value = false
  }
})

const startEnable = async () => {
  busy.value = true
  actionError.value = ''
  try {
    enrollment.value = await $api<Enrollment>('/auth/mfa/totp', { method: 'POST', body: {} })
    code.value = ''
  } catch (error) {
    actionError.value = describeError(error)
  } finally {
    busy.value = false
  }
}

const confirmEnable = async () => {
  busy.value = true
  actionError.value = ''
  try {
    await $api('/auth/mfa/totp/verify', { method: 'POST', body: { code: code.value } })
    enabled.value = true
    resetAction()
    toast.add({ title: t('settings.security.enabledToast'), color: 'success' })
  } catch (error) {
    actionError.value = describeError(error)
  } finally {
    busy.value = false
  }
}

const confirmDisable = async () => {
  busy.value = true
  actionError.value = ''
  try {
    await $api('/auth/mfa/totp/remove', { method: 'POST', body: { code: code.value } })
    enabled.value = false
    resetAction()
    toast.add({ title: t('settings.security.disabledToast'), color: 'success' })
  } catch (error) {
    actionError.value = describeError(error)
  } finally {
    busy.value = false
  }
}

const copySecret = async () => {
  if (!enrollment.value) return
  try {
    await navigator.clipboard.writeText(enrollment.value.secret)
    toast.add({ title: t('settings.security.keyCopied'), color: 'success' })
  } catch {
    // Clipboard blocked (permissions/insecure context): the key stays visible.
  }
}
</script>
