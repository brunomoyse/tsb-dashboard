import { resolve } from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  // Only Vite+ (vp test/lint/fmt) reads this file; Nuxt builds with its own Vite config.
  resolve: {
    alias: {
      '~': resolve(import.meta.dirname, '.'),
      '#imports': resolve(import.meta.dirname, '.nuxt/imports.d.ts'),
    },
  },
  test: {
    globals: true,
  },
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    semi: false,
    ignorePatterns: ['.claude/**', 'android/**', '**/android/**', 'public/**'],
  },
  lint: {
    plugins: ['typescript', 'vue'],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
      pedantic: 'warn',
      perf: 'warn',
      style: 'warn',
    },
    rules: {
      'no-shadow': 'warn',
      'default-case-last': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'off',
      'id-length': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-statements': 'off',
      'func-style': 'off',
      'no-magic-numbers': 'off',
      'no-ternary': 'off',
      'no-nested-ternary': 'off',
      'sort-keys': 'off',
      'no-inline-comments': 'off',
      'init-declarations': 'off',
      'no-continue': 'off',
      'no-await-in-loop': 'off',
      'unicorn/no-nested-ternary': 'off',
      'one-var': 'off',
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    env: {
      browser: true,
    },
    ignorePatterns: [
      '.nuxt',
      '.output',
      'node_modules',
      'android/**/build',
      'android/app/src/main/assets/public',
      'android/capacitor-cordova-android-plugins',
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
})
