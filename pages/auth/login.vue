<template>
  <div class="login-root">
    <!-- Content -->
    <div class="login-container">
      <!-- Left: Branding -->
      <div class="login-brand">
        <div class="login-brand-inner">
          <img src="/pili-wordmark.svg" alt="Pili" class="login-brand-wordmark" />
          <p class="login-brand-zh" lang="zh">霹雳</p>
          <p class="login-brand-tagline">Dashboard</p>
        </div>
      </div>

      <!-- Right: Form -->
      <div class="login-form-panel">
        <div class="login-form-wrapper">
          <!-- Header -->
          <div class="login-form-header">
            <h2 class="login-form-title">{{ t('login.title') }}</h2>
            <p class="login-form-subtitle">{{ t('login.subtitle') }}</p>
          </div>

          <!-- Step 1: Email -->
          <form v-if="step === 'email'" class="login-form" @submit.prevent="requestCode">
            <div class="login-field">
              <label for="email" class="login-label">{{ t('login.email') }}</label>
              <div class="login-input-wrap">
                <UIcon name="i-lucide-mail" class="login-input-icon" />
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  :placeholder="t('login.emailPlaceholder')"
                  class="login-input"
                  :disabled="loading"
                />
              </div>
            </div>

            <Transition name="login-error">
              <div v-if="errorMessage" class="login-error" role="alert">
                <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>
            </Transition>

            <button
              type="submit"
              class="login-submit"
              :disabled="loading"
            >
              <span v-if="loading" class="login-spinner" />
              <span v-else>{{ t('login.sendCode') }}</span>
            </button>
          </form>

          <!-- Step 2: Code -->
          <form v-else class="login-form" @submit.prevent="verifyCode">
            <p class="login-code-hint">{{ t('login.codeSent', { email }) }}</p>

            <div class="login-field">
              <label for="otp-code" class="login-label">{{ t('login.codeLabel') }}</label>
              <div class="login-input-wrap">
                <UIcon name="i-lucide-key-round" class="login-input-icon" />
                <input
                  id="otp-code"
                  v-model="code"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  required
                  autocomplete="one-time-code"
                  :placeholder="t('login.codePlaceholder')"
                  class="login-input login-input-code"
                  :disabled="loading"
                />
              </div>
            </div>

            <Transition name="login-error">
              <div v-if="errorMessage" class="login-error" role="alert">
                <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>
            </Transition>

            <button
              type="submit"
              class="login-submit"
              :disabled="loading || code.length < 6"
            >
              <span v-if="loading" class="login-spinner" />
              <span v-else>{{ t('login.verify') }}</span>
            </button>

            <div class="login-code-actions">
              <button type="button" class="login-link-button" @click="backToEmail">
                {{ t('login.backToEmail') }}
              </button>
              <button
                type="button"
                class="login-link-button login-link-button-accent"
                :disabled="resendCooldown > 0 || loading"
                @click="resendCode"
              >
                {{ resendCooldown > 0 ? t('login.resendCooldown', { seconds: resendCooldown }) : t('login.resendCode') }}
              </button>
            </div>
          </form>

          <!-- Footer -->
          <p class="login-footer-text">
            PILI &middot; ADMIN
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, definePageMeta, onMounted, ref, useRoute, useRuntimeConfig } from '#imports'
import { useI18n } from 'vue-i18n'
import { useZitadelApi } from '~/composables/useZitadelApi'

definePageMeta({
  public: true,
  layout: false
})

const config = useRuntimeConfig()
const isCapacitor = config.public.appBuild === 'capacitor'

const { t } = useI18n()
const route = useRoute()
const { requestOtpLogin, verifyOtpLogin, resendOtpLogin, finalizeOidcAuth } = useZitadelApi()

const step = ref<'email' | 'code'>('email')
const email = ref('')
const code = ref('')
const otpSessionId = ref('')
const otpSessionToken = ref('')
const errorMessage = ref('')
const loading = ref(false)
const initializing = ref(false)
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

// Zitadel passes authRequestID when redirecting to custom login (URL query param)
const authRequestIdFromUrl = (route.query.authRequestID as string) || ''
// Fetched via authorize-proxy when no URL param (so we stay on dashboard domain)
const fetchedAuthRequestId = ref('')

const effectiveAuthRequestId = computed(() => authRequestIdFromUrl || fetchedAuthRequestId.value)

// Show session expired message if redirected from auth middleware
if (route.query.session === 'expired') {
  errorMessage.value = t('login.sessionExpired')
}

// Fetch authRequestId via authorize-proxy when navigated directly (no authRequestID in URL),
// So the user never leaves the dashboard domain
onMounted(async () => {
  if (!authRequestIdFromUrl && !route.query.session) {
    initializing.value = true
    try {
      const { useOidc } = await import('~/composables/useOidc')
      const { getAuthRequestId } = useOidc()
      fetchedAuthRequestId.value = await getAuthRequestId()
    } catch (error: any) {
      if (import.meta.dev) console.error('Failed to fetch authRequestId:', error)
    } finally {
      initializing.value = false
    }
  }
})

const startCooldown = (seconds = 20) => {
  resendCooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer)
      cooldownTimer = null
    }
  }, 1000)
}

/*
 * Synchronous in-flight flags. The reactive `loading` ref drives the UI but
 * Vue's reactivity is async, a tight double-fire (form submit + click,
 * hydration remount, retry path) can sneak past `if (loading.value) return`.
 * These plain JS booleans flip atomically inside the handler, blocking the
 * duplicate before it ever reaches the network.
 */
let requestInFlight = false
let verifyInFlight = false

const requestCode = async () => {
  if (requestInFlight || loading.value) return
  requestInFlight = true
  errorMessage.value = ''
  loading.value = true

  try {
    const session = await requestOtpLogin(email.value)
    otpSessionId.value = session.sessionId
    otpSessionToken.value = session.sessionToken
    step.value = 'code'
    startCooldown()
  } catch (error: any) {
    if (import.meta.dev) console.error('OTP request error:', error)
    const status = error?.response?.status || error?.statusCode
    const errorCode = error?.data?.error
    if (status === 429) {
      errorMessage.value = t('login.tooManyRequests')
    } else if (errorCode === 'email_not_verified') {
      errorMessage.value = t('login.emailNotVerified')
    } else {
      errorMessage.value = t('login.requestFailed')
    }
  } finally {
    requestInFlight = false
    loading.value = false
  }
}

const backToEmail = () => {
  step.value = 'email'
  code.value = ''
  errorMessage.value = ''
  otpSessionId.value = ''
  otpSessionToken.value = ''
}

const resendCode = async () => {
  if (!otpSessionId.value || !otpSessionToken.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    await resendOtpLogin(otpSessionId.value, otpSessionToken.value)
    startCooldown()
  } catch (error: any) {
    const status = error?.response?.status || error?.statusCode
    errorMessage.value = status === 429
      ? t('login.tooManyRequests')
      : t('login.requestFailed')
  } finally {
    loading.value = false
  }
}

const verifyCode = async () => {
  if (verifyInFlight || loading.value) return
  verifyInFlight = true
  errorMessage.value = ''
  loading.value = true

  try {
    const verified = await verifyOtpLogin(otpSessionId.value, otpSessionToken.value, code.value)

    if (effectiveAuthRequestId.value) {
      const result = await finalizeOidcAuth(effectiveAuthRequestId.value, verified.sessionId, verified.sessionToken)

      if (isCapacitor) {
        // Capacitor: exchange the auth code for tokens directly.
        // We can't follow result.callbackUrl, the WebView runs at https://localhost
        // And navigating there would lose the OIDC state.
        const callbackUrl = new URL(result.callbackUrl)
        const authCode = callbackUrl.searchParams.get('code')
        if (!authCode) throw new Error('No authorization code in callback URL')

        const { useOidc } = await import('~/composables/useOidc')
        const { exchangeCodeForTokens } = useOidc()
        await exchangeCodeForTokens(authCode)

        const { useAuthCallback } = await import('~/composables/useAuthCallback')
        const { processCallback } = useAuthCallback()
        const outcome = await processCallback()
        if (!outcome.ok) {
          loading.value = false
          errorMessage.value = outcome.reason === 'not_admin'
            ? t('login.accessDenied')
            : t('login.callbackError')
        }
      } else {
        window.location.href = result.callbackUrl
      }
    } else {
      const { useOidc } = await import('~/composables/useOidc')
      const { signIn } = useOidc()
      await signIn({ login_hint: email.value })
    }
  } catch (error: any) {
    loading.value = false
    if (import.meta.dev) console.error('OTP verify error:', error)

    // Refresh the authRequestId so subsequent retries get a fresh one.
    if (isCapacitor) {
      try {
        const { useOidc } = await import('~/composables/useOidc')
        fetchedAuthRequestId.value = await useOidc().getAuthRequestId()
      } catch { /* Best-effort */ }
    }

    const status = error?.response?.status || error?.statusCode
    if (status === 429) {
      errorMessage.value = t('login.tooManyRequests')
    } else {
      errorMessage.value = t('login.invalidCode')
    }
  } finally {
    /*
     * Always release the in-flight flag so retries (after error or after a
     * not_admin outcome that keeps us on the page) can re-fire. The success
     * path triggers a navigation; clearing the flag there is a no-op.
     */
    verifyInFlight = false
  }
}
</script>

<style scoped>
/* Root */
.login-root {
  min-height: 100dvh;
  background: var(--ui-bg);
  color: var(--ui-text);
  font-family: var(--font-sans);
}

.login-container {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}

@media (min-width: 1024px) {
  .login-container {
    flex-direction: row;
    padding: 0;
  }
}

/* Brand panel */
.login-brand {
  display: flex;
  flex: 1;
  min-height: 280px;
  align-items: center;
  justify-content: center;
  background: var(--ui-bg);
}

@media (min-width: 1024px) {
  .login-brand {
    flex: none;
    width: 42%;
    min-height: 100dvh;
    border-right: 1px solid var(--ui-border);
  }
}

.login-brand-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

@media (min-width: 1024px) {
  .login-brand-inner {
    gap: 1.25rem;
  }
}

.login-brand-wordmark {
  height: 84px;
  width: auto;
  max-width: 100%;
}

@media (min-width: 1024px) {
  .login-brand-wordmark {
    height: 96px;
  }
}

.login-brand-zh {
  font-family: var(--font-zh);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ui-text-muted);
}

.login-brand-tagline {
  display: none;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

@media (min-width: 1024px) {
  .login-brand-tagline {
    display: block;
  }
}

/* Form panel */
.login-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px 24px;
}

@media (min-width: 1024px) {
  .login-form-panel {
    flex: 1;
    padding: 2rem 1.5rem;
  }
}

.login-form-wrapper {
  width: 100%;
  max-width: 24rem;
}

.login-form-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

@media (min-width: 1024px) {
  .login-form-header {
    display: block;
    margin-bottom: 2.5rem;
  }
}

.login-form-title {
  font-family: var(--font-brand);
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ui-text);
}

@media (min-width: 1024px) {
  .login-form-title {
    font-size: 1.75rem;
    letter-spacing: normal;
    margin-bottom: 0.5rem;
  }
}

.login-form-subtitle {
  font-size: 15px;
  color: var(--ui-text-muted);
}

@media (min-width: 1024px) {
  .login-form-subtitle {
    font-size: 0.875rem;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (min-width: 1024px) {
  .login-form {
    gap: 1.5rem;
  }
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-label {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

/* Input */
.login-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.login-input-icon {
  position: absolute;
  left: 1rem;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
  pointer-events: none;
  transition: color 0.2s ease;
}

.login-input-wrap:focus-within .login-input-icon {
  color: var(--ui-border-inverted);
}

.login-input {
  width: 100%;
  height: 56px;
  padding: 0 1rem 0 2.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  font-size: 17px;
  outline: none;
  transition: border-color 0.2s ease;
}

@media (min-width: 1024px) {
  .login-input {
    background: var(--ui-bg-accented);
    font-size: 0.9375rem;
  }
}

.login-input::placeholder {
  color: var(--ui-text-muted);
}

.login-input:focus {
  border-color: var(--ui-border-inverted);
}

.login-input-code {
  font-family: var(--font-mono);
  font-size: 1.125rem;
  letter-spacing: 0.5em;
  text-align: center;
  padding-left: 2.75rem;
  padding-right: 1rem;
}

/* Code step */
.login-code-hint {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  line-height: 1.5;
}

.login-code-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
}

.login-link-button {
  background: none;
  border: none;
  padding: 0.5rem 0.25rem;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: color 0.2s ease;
}

.login-link-button:hover:not(:disabled) {
  color: var(--ui-text);
}

.login-link-button:focus-visible {
  outline: 2px solid var(--ui-border-inverted);
  outline-offset: 2px;
}

.login-link-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.login-link-button-accent {
  color: var(--ui-text);
  font-weight: 500;
  text-decoration: underline;
}

/* Error */
.login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--ui-error);
  background: var(--ui-bg-elevated);
  color: var(--ui-error);
  font-size: 0.8125rem;
}

.login-error-enter-active,
.login-error-leave-active {
  transition: all 0.3s ease;
}

.login-error-enter-from,
.login-error-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

/* Submit: the Volt button */
.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 56px;
  border: none;
  border-radius: 12px;
  background: var(--ui-primary);
  color: var(--ui-text-inverted);
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.login-submit:active:not(:disabled) {
  transform: scale(0.97);
}

.login-submit:focus-visible {
  outline: 2px solid var(--ui-border-inverted);
  outline-offset: 2px;
}

.login-submit:disabled {
  background: var(--ui-bg-accented);
  color: var(--ui-text-muted);
  cursor: not-allowed;
}

/* Spinner */
.login-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid var(--ui-border);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: login-spin 0.6s linear infinite;
}

/* Footer */
.login-footer-text {
  margin-top: 20px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

@media (min-width: 1024px) {
  .login-footer-text {
    margin-top: 3rem;
  }
}

@keyframes login-spin {
  to { transform: rotate(360deg); }
}
</style>
