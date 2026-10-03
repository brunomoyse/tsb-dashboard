<template>
  <div class="flex-1 flex flex-col">
    <PiliSubHeader v-if="isMobile" :title="t('assistant.title')" />

    <div
      class="flex flex-col gap-3 w-full"
      :class="isMobile ? 'px-4 pt-1 pb-5' : 'p-3 sm:p-4 md:p-6 max-w-2xl mx-auto'"
    >
      <h1 v-if="!isMobile" class="text-lg sm:text-2xl font-bold">{{ t('assistant.title') }}</h1>
      <p class="text-[13px] sm:text-sm text-muted leading-snug">{{ t('assistant.description') }}</p>

      <!-- Connection -->
      <div class="p-4 rounded-[14px] bg-elevated border border-default flex flex-col gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-base font-bold">{{ t('assistant.connection') }}</span>
          <PiliChip :tone="stateTone" size="sm">{{ t(stateKey(connection)) }}</PiliChip>
        </div>
        <p v-if="stateDetail" class="text-[13px] text-muted leading-snug">{{ stateDetail }}</p>

        <div v-if="connection?.enabled && !login" class="flex flex-wrap gap-2">
          <UButton
            :label="connection.everConnected ? t('assistant.reconnect') : t('assistant.connect')"
            icon="i-lucide-qr-code"
            size="lg"
            :loading="starting"
            :disabled="connection.state === 'UNAVAILABLE'"
            @click="startLogin(false)"
          />
          <template v-if="connection.state === 'CONNECTED'">
            <UButton
              v-if="!confirmingDisconnect"
              :label="t('assistant.disconnect')"
              color="neutral"
              variant="outline"
              size="lg"
              @click="confirmingDisconnect = true"
            />
            <template v-else>
              <UButton
                :label="t('assistant.disconnectConfirm')"
                color="error"
                size="lg"
                :loading="disconnecting"
                @click="disconnect"
              />
              <UButton
                :label="t('common.cancel')"
                color="neutral"
                variant="ghost"
                size="lg"
                @click="confirmingDisconnect = false"
              />
            </template>
          </template>
        </div>
      </div>

      <!-- QR login -->
      <div
        v-if="login"
        class="p-4 rounded-[14px] bg-elevated border border-default flex flex-col gap-3"
        aria-live="polite"
      >
        <span class="text-base font-bold">{{ t(`assistant.login.${loginKey}`) }}</span>

        <template v-if="!isLoginFinished(login.status)">
          <img
            v-if="qrPng"
            :src="qrPng"
            :alt="t('assistant.qr.alt')"
            class="bg-white p-3 rounded-xl w-60 h-60 self-center sm:self-start"
          />
          <p class="text-[13px] text-muted leading-snug">{{ t('assistant.qr.scanHint') }}</p>
          <p class="text-[13px] text-muted leading-snug">{{ t('assistant.qr.saveHint') }}</p>
          <div v-if="isWeChatLink(login.qrContent)" class="flex flex-col gap-2">
            <p class="text-[13px] text-muted leading-snug">{{ t('assistant.qr.linkHint') }}</p>
            <div class="flex flex-wrap gap-2">
              <UButton
                :label="copied ? t('assistant.qr.copied') : t('assistant.qr.copyLink')"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                color="neutral"
                variant="outline"
                @click="copyLink"
              />
              <UButton
                :label="t('assistant.qr.openInWeChat')"
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                :to="login.qrContent"
                external
              />
            </div>
          </div>
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            class="self-start"
            @click="closeLogin"
          />
        </template>

        <template v-else-if="login.status === 'REFUSED_OTHER_ACCOUNT'">
          <p class="text-[13px] text-muted leading-snug">{{ t('assistant.login.refusedHint') }}</p>
          <UCheckbox v-model="replaceOwner" :label="t('assistant.login.replaceOwner')" />
          <div class="flex flex-wrap gap-2">
            <UButton
              :label="t('assistant.newQr')"
              :loading="starting"
              @click="startLogin(replaceOwner)"
            />
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="closeLogin"
            />
          </div>
        </template>

        <template v-else-if="login.status !== 'CONFIRMED'">
          <div class="flex flex-wrap gap-2">
            <UButton :label="t('assistant.newQr')" :loading="starting" @click="startLogin(false)" />
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="closeLogin"
            />
          </div>
        </template>
      </div>

      <p v-if="error" class="text-sm text-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { renderSVG } from 'uqr'
import type { PiliChipTone } from '~/components/pili/PiliChip.vue'
import {
  type AssistantConnection,
  type AssistantLogin,
  isLoginFinished,
  isWeChatLink,
  stateKey,
} from '~/utils/assistant'

const { t, locale } = useI18n()
const isMobile = useIsMobile()
const { $gqlFetch } = useNuxtApp()
const { connection, reload } = useAssistantStatus()

const LOGIN_FIELDS = 'id status qrContent expiresAt'

const START_LOGIN = print(gql`
  mutation StartAssistantLogin($replaceOwner: Boolean) {
    startAssistantLogin(replaceOwner: $replaceOwner) {
      ${LOGIN_FIELDS}
    }
  }
`)

const LOGIN_STATUS = print(gql`
  query AssistantLogin($id: String!) {
    assistantLogin(id: $id) {
      ${LOGIN_FIELDS}
    }
  }
`)

const DISCONNECT = print(gql`
  mutation DisconnectAssistant {
    disconnectAssistant {
      enabled
      state
      account
      since
      expiredAt
      everConnected
      loginInProgress
    }
  }
`)

const login = ref<AssistantLogin | null>(null)
const qrPng = ref('')
const starting = ref(false)
const disconnecting = ref(false)
const confirmingDisconnect = ref(false)
const replaceOwner = ref(false)
const copied = ref(false)
const error = ref('')

const STATE_TONES: Record<string, PiliChipTone> = {
  CONNECTED: 'success',
  EXPIRED: 'danger',
  UNAVAILABLE: 'warning',
  DISCONNECTED: 'neutral',
}

const stateTone = computed<PiliChipTone>(() =>
  connection.value?.enabled ? (STATE_TONES[connection.value.state] ?? 'neutral') : 'neutral',
)

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Europe/Brussels',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))

const stateDetail = computed(() => {
  const c = connection.value
  if (!c?.enabled) return c ? t('assistant.notConfiguredHint') : ''
  if (c.state === 'CONNECTED' && c.since) return t('assistant.since', { time: formatTime(c.since) })
  if (c.state === 'EXPIRED' && c.expiredAt) {
    return t('assistant.expiredSince', { time: formatTime(c.expiredAt) })
  }
  if (c.state === 'UNAVAILABLE') return t('assistant.unavailableHint')
  return ''
})

const loginKey = computed(() => {
  const s = login.value?.status ?? 'WAIT'
  return s === 'REFUSED_OTHER_ACCOUNT' ? 'refused' : s.toLowerCase()
})

/*
 * The QR code is shown as a PNG, not inline SVG: on a phone, the owner can
 * long-press it to save it, then scan it from the album in WeChat.
 */
const renderPng = async (content: string): Promise<string> => {
  const svg = renderSVG(content, { border: 2 })
  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 600
  canvas.height = 600
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 600, 600)
  ctx.drawImage(img, 0, 0, 600, 600)
  return canvas.toDataURL('image/png')
}

watch(
  () => login.value?.qrContent,
  async (content) => {
    qrPng.value = ''
    if (!content) return
    // ILink sends a link to encode; an image (base64 PNG) is shown as is.
    qrPng.value = isWeChatLink(content)
      ? await renderPng(content).catch(() => '')
      : `data:image/png;base64,${content}`
  },
)

let timer: ReturnType<typeof setInterval> | undefined

const stopPolling = () => {
  if (timer) clearInterval(timer)
  timer = undefined
}

const poll = async () => {
  if (!login.value) return
  try {
    const data = await $gqlFetch<{ assistantLogin: AssistantLogin }>(LOGIN_STATUS, {
      variables: { id: login.value.id },
    })
    if (!data) return
    login.value = data.assistantLogin
    if (isLoginFinished(data.assistantLogin.status)) {
      stopPolling()
      await reload()
      if (data.assistantLogin.status === 'CONFIRMED') setTimeout(closeLogin, 3000)
    }
  } catch {
    stopPolling()
    login.value = { ...login.value, status: 'FAILED' }
  }
}

const startLogin = async (replace: boolean) => {
  error.value = ''
  starting.value = true
  try {
    const data = await $gqlFetch<{ startAssistantLogin: AssistantLogin }>(START_LOGIN, {
      variables: { replaceOwner: replace },
    })
    if (!data) return
    login.value = data.startAssistantLogin
    replaceOwner.value = false
    stopPolling()
    timer = setInterval(poll, 2000)
  } catch {
    error.value = t('assistant.errors.start')
  } finally {
    starting.value = false
  }
}

const closeLogin = () => {
  stopPolling()
  login.value = null
  qrPng.value = ''
}

const copyLink = async () => {
  if (!login.value) return
  try {
    await navigator.clipboard.writeText(login.value.qrContent)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    error.value = t('assistant.errors.copy')
  }
}

const disconnect = async () => {
  disconnecting.value = true
  error.value = ''
  try {
    const data = await $gqlFetch<{ disconnectAssistant: AssistantConnection }>(DISCONNECT)
    if (data) connection.value = data.disconnectAssistant
    confirmingDisconnect.value = false
  } catch {
    error.value = t('assistant.errors.disconnect')
  } finally {
    disconnecting.value = false
  }
}

onBeforeUnmount(stopPolling)
</script>
