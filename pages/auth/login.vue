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

            <button type="submit" class="login-submit" :disabled="loading">
              <span v-if="loading" class="login-spinner" />
              <span v-else>{{ t('login.sendCode') }}</span>
            </button>
          </form>

          <!-- Step 2: Code -->
          <form v-else-if="step === 'code'" class="login-form" @submit.prevent="verifyCode">
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

            <button type="submit" class="login-submit" :disabled="loading || code.length < 6">
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
                {{
                  resendCooldown > 0
                    ? t('login.resendCooldown', { seconds: resendCooldown })
                    : t('login.resendCode')
                }}
              </button>
            </div>
          </form>

          <!-- Step 3 (optional): authenticator app code -->
          <form v-else class="login-form" @submit.prevent="verifyTotp">
            <p class="login-code-hint">{{ t('login.totpHint') }}</p>

            <div class="login-field">
              <label for="totp-code" class="login-label">{{ t('login.totpLabel') }}</label>
              <div class="login-input-wrap">
                <UIcon name="i-lucide-shield-check" class="login-input-icon" />
                <input
                  id="totp-code"
                  v-model="totpCode"
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

            <button type="submit" class="login-submit" :disabled="loading || totpCode.length < 6">
              <span v-if="loading" class="login-spinner" />
              <span v-else>{{ t('login.verify') }}</span>
            </button>

            <div class="login-code-actions">
              <button type="button" class="login-link-button" @click="backToEmail">
                {{ t('login.backToEmail') }}
              </button>
            </div>
          </form>

          <!-- Footer -->
          <p class="login-footer-text">PILI &middot; ADMIN</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { definePageMeta } from '#imports'
import { useI18n } from 'vue-i18n'
import { useLoginFlow } from '~/composables/useLoginFlow'

definePageMeta({
  public: true,
  layout: false,
})

const { t } = useI18n()
const {
  step,
  email,
  code,
  totpCode,
  errorMessage,
  loading,
  resendCooldown,
  requestCode,
  backToEmail,
  resendCode,
  verifyCode,
  verifyTotp,
} = useLoginFlow()
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
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
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
  to {
    transform: rotate(360deg);
  }
}
</style>
