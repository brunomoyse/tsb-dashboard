<template>
  <div class="login-root">
    <!-- Ambient glow -->
    <div class="login-glow" />

    <!-- Subtle grid pattern overlay -->
    <div class="login-grid" />

    <!-- Content -->
    <div class="login-container">
      <!-- Left: Branding -->
      <div class="login-brand">
        <div class="login-brand-inner">
          <!-- Decorative vertical line -->
          <div class="login-accent-line" />

          <!-- Japanese decorative text (vertical) -->
          <p class="login-jp-text">東京寿司</p>

          <!-- Main branding -->
          <div class="login-brand-content">
            <div class="login-brand-icon">
              <UIcon name="i-lucide-utensils" class="size-7 text-amber-500" />
            </div>
            <h1 class="login-brand-name">
              Tokyo<br />Sushi Bar
            </h1>
            <div class="login-brand-divider" />
            <p class="login-brand-tagline">Dashboard</p>
          </div>

          <!-- Bottom decorative element -->
          <div class="login-brand-footer">
            <span class="login-brand-footer-dot" />
            <span class="login-brand-footer-line" />
            <span class="login-brand-footer-dot" />
          </div>
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

          <!-- Form -->
          <form class="login-form" @submit.prevent="onSubmit">
            <!-- Email -->
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
                />
              </div>
            </div>

            <!-- Password -->
            <div class="login-field">
              <label for="password" class="login-label">{{ t('login.password') }}</label>
              <div class="login-input-wrap">
                <UIcon name="i-lucide-lock" class="login-input-icon" />
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  :placeholder="t('login.passwordPlaceholder')"
                  class="login-input login-input-password"
                />
                <button
                  type="button"
                  class="login-password-toggle"
                  tabindex="-1"
                  @click="showPassword = !showPassword"
                >
                  <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
                </button>
              </div>
            </div>

            <!-- Error -->
            <Transition name="login-error">
              <div v-if="errorMessage" class="login-error">
                <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
                <span>{{ errorMessage }}</span>
              </div>
            </Transition>

            <!-- Submit -->
            <button
              type="submit"
              class="login-submit"
              :disabled="loading"
            >
              <span v-if="loading" class="login-spinner" />
              <span v-else>{{ t('login.submit') }}</span>
            </button>
          </form>

          <!-- Footer -->
          <p class="login-footer-text">
            Tokyo Sushi Bar &middot; Admin
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LoginResponse, User } from '~/types'
import { navigateTo, useLocalePath, useNuxtApp } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'

definePageMeta({
  public: true,
  layout: false
})

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap' }
  ]
})

const { $api, $gqlFetch } = useNuxtApp()
const { t } = useI18n()
const localePath = useLocalePath()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMessage = ref('')
const loading = ref(false)

const ME = gql`
  query {
    me {
      id
      email
      firstName
      lastName
      phoneNumber
      isAdmin
      address {
        id
        streetName
        houseNumber
        municipalityName
        postcode
        distance
      }
    }
  }
`

const login = async (emailVal: string, passwordVal: string): Promise<boolean> => {
  errorMessage.value = ''
  try {
    await $api<LoginResponse>('/login', {
      method: 'POST',
      body: { email: emailVal, password: passwordVal },
    })
    return true
  } catch {
    errorMessage.value = t('login.invalidCredentials')
    return false
  }
}

const loginSuccess = async (): Promise<boolean> => {
  if (import.meta.client) {
    const data = await $gqlFetch<{ me: User }>(print(ME))
    if (data) {
      if (!data.me.isAdmin) {
        await authStore.logout()
        return false
      }
      authStore.setUser(data.me)
    }
  }
  return true
}

const onSubmit = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const success = await login(email.value, password.value)
    if (!success) return

    const isAdmin = await loginSuccess()
    if (!isAdmin) {
      errorMessage.value = t('login.accessDenied')
      return
    }
    navigateTo(localePath('orders'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Root ── */
.login-root {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: #0c0907;
  font-family: system-ui, -apple-system, sans-serif;
}

/* ── Ambient glow ── */
.login-glow {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 30% 50%, rgba(217, 119, 6, 0.06) 0%, transparent 70%),
    radial-gradient(ellipse 40% 60% at 70% 60%, rgba(180, 83, 9, 0.04) 0%, transparent 70%);
  pointer-events: none;
}

/* ── Grid pattern ── */
.login-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(217, 119, 6, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(217, 119, 6, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 50%, black 20%, transparent 70%);
  pointer-events: none;
}

/* ── Container ── */
.login-container {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100dvh;
}

/* ── Brand panel ── */
.login-brand {
  display: none;
  position: relative;
  width: 42%;
  min-height: 100dvh;
  border-right: 1px solid rgba(217, 119, 6, 0.1);
}

@media (min-width: 1024px) {
  .login-brand {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.login-brand-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  animation: login-fade-up 0.8s ease-out both;
}

/* Vertical accent line */
.login-accent-line {
  position: absolute;
  left: 50%;
  top: -6rem;
  width: 1px;
  height: 4rem;
  background: linear-gradient(to bottom, transparent, rgba(217, 119, 6, 0.4));
  animation: login-fade-in 1.2s ease-out 0.3s both;
}

/* Japanese vertical text */
.login-jp-text {
  position: absolute;
  right: -3rem;
  top: 50%;
  transform: translateY(-50%);
  writing-mode: vertical-rl;
  font-size: 0.75rem;
  letter-spacing: 0.5em;
  color: rgba(217, 119, 6, 0.15);
  user-select: none;
}

.login-brand-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.login-brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(217, 119, 6, 0.2);
  background: rgba(217, 119, 6, 0.06);
}

.login-brand-name {
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 3rem;
  font-weight: 300;
  line-height: 1.1;
  text-align: center;
  letter-spacing: 0.04em;
  color: #faf5ef;
}

.login-brand-divider {
  width: 2.5rem;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(217, 119, 6, 0.5), transparent);
}

.login-brand-tagline {
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  color: rgba(217, 119, 6, 0.5);
}

.login-brand-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  animation: login-fade-in 1.2s ease-out 0.5s both;
}

.login-brand-footer-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(217, 119, 6, 0.3);
}

.login-brand-footer-line {
  width: 2rem;
  height: 1px;
  background: rgba(217, 119, 6, 0.15);
}

/* ── Form panel ── */
.login-form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}

.login-form-wrapper {
  width: 100%;
  max-width: 24rem;
  animation: login-fade-up 0.8s ease-out 0.15s both;
}

/* ── Form header ── */
.login-form-header {
  margin-bottom: 2.5rem;
}

.login-form-title {
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  font-size: 2rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: #faf5ef;
  margin-bottom: 0.5rem;
}

@media (min-width: 1024px) {
  .login-form-title {
    font-size: 1.75rem;
  }
}

.login-form-subtitle {
  font-size: 0.875rem;
  color: rgba(250, 245, 239, 0.4);
}

/* ── Form ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Field ── */
.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(250, 245, 239, 0.35);
}

/* ── Input ── */
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
  color: rgba(250, 245, 239, 0.2);
  pointer-events: none;
  transition: color 0.2s ease;
}

.login-input-wrap:focus-within .login-input-icon {
  color: rgba(217, 119, 6, 0.6);
}

.login-input {
  width: 100%;
  height: 3.25rem;
  padding: 0 1rem 0 2.75rem;
  border: 1px solid rgba(250, 245, 239, 0.08);
  border-radius: 0.75rem;
  background: rgba(250, 245, 239, 0.03);
  color: #faf5ef;
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.login-input::placeholder {
  color: rgba(250, 245, 239, 0.2);
}

.login-input:focus {
  border-color: rgba(217, 119, 6, 0.4);
  background: rgba(217, 119, 6, 0.03);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.06);
}

.login-input-password {
  padding-right: 3rem;
}

.login-password-toggle {
  position: absolute;
  right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: rgba(250, 245, 239, 0.25);
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.login-password-toggle:hover {
  color: rgba(250, 245, 239, 0.5);
  background: rgba(250, 245, 239, 0.05);
}

/* ── Error ── */
.login-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.06);
  color: #fca5a5;
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

/* ── Submit ── */
.login-submit {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 3.25rem;
  margin-top: 0.5rem;
  border: none;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, #b45309, #92400e);
  color: #fef3c7;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(217, 119, 6, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.login-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow:
    0 4px 12px rgba(180, 83, 9, 0.3),
    0 0 0 1px rgba(217, 119, 6, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transform: translateY(-1px);
}

.login-submit:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(217, 119, 6, 0.15),
    inset 0 1px 4px rgba(0, 0, 0, 0.2);
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ── Spinner ── */
.login-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(254, 243, 199, 0.25);
  border-top-color: #fef3c7;
  border-radius: 50%;
  animation: login-spin 0.6s linear infinite;
}

/* ── Footer ── */
.login-footer-text {
  margin-top: 3rem;
  text-align: center;
  font-size: 0.6875rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(250, 245, 239, 0.12);
}

/* ── Animations ── */
@keyframes login-fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes login-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes login-spin {
  to { transform: rotate(360deg); }
}
</style>
