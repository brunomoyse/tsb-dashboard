import { resolve } from 'node:path'
import { defineConfig } from 'vite-plus'
import { runtimeFlagsPlugin } from './tests/support/flags'

const root = (path: string) => resolve(import.meta.dirname, path)
const excluded = ['**/node_modules/**', '**/.nuxt/**', '**/.output/**']

export default defineConfig({
  // Only Vite+ (vp test/lint/fmt) reads this file; Nuxt builds with its own Vite config.
  test: {
    projects: [
      {
        // Pure code: no Nuxt. Node environment, fast. `~` / `@` are Nuxt's own aliases for the project root.
        plugins: [runtimeFlagsPlugin({ server: false, client: true, dev: false })],
        resolve: { alias: { '~': root('.'), '@': root('.') } },
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts'],
          exclude: [...excluded, '**/*.nuxt.test.ts'],
          setupFiles: [root('tests/support/noNetwork.ts'), root('tests/support/flagsReset.ts')],
          unstubGlobals: true,
          unstubEnvs: true,
          restoreMocks: true,
        },
      },
      './vitest.nuxt.config.ts',
    ],
    coverage: {
      provider: 'v8',
      // The TypeScript of the dashboard. `.vue` pages and components are not part of the unit metric.
      include: [
        'composables/**/*.ts',
        'stores/**/*.ts',
        'plugins/**/*.ts',
        'middleware/**/*.ts',
        'utils/**/*.ts',
        'server/**/*.ts',
      ],
      exclude: [
        '**/node_modules/**',
        '**/.nuxt/**',
        '**/.output/**',
        '**/*.test.*',
        '**/*.d.ts',
        '**/*.config.ts',
        'plugins/capacitor-sunmi-printer/android/**',
        // Interfaces only, no runtime code.
        'plugins/capacitor-sunmi-printer/src/definitions.ts',
      ],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    semi: false,
    ignorePatterns: ['.claude/**', 'android/**', '**/android/**', 'public/**', 'coverage/**'],
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
      // The autofix capitalises the first letter of every comment line, which mangles continuation lines
      // ("Aliases, auto-imports" in the middle of a sentence) and code examples in comments.
      'capitalized-comments': 'off',
      // Two more autofixes the pre-commit hook (`vp check --fix`) applies blindly: the first strips casts that the
      // lint run (without Nuxt's generated types) believes useless, the second rewrites arrow bodies.
      'typescript/no-unnecessary-type-assertion': 'off',
      'typescript/strict-void-return': 'off',
    },
    overrides: [
      {
        // Tests cast to fakes, build partial objects and read `any` from mocks: these rules are noise there, and only there.
        files: ['tests/**/*.ts'],
        rules: {
          'typescript/prefer-readonly-parameter-types': 'off',
          'typescript/no-unsafe-type-assertion': 'off',
          'typescript/no-unsafe-member-access': 'off',
          'typescript/no-unsafe-return': 'off',
          'typescript/no-unsafe-assignment': 'off',
          'typescript/no-unsafe-call': 'off',
          'typescript/no-unsafe-argument': 'off',
          'typescript/strict-boolean-expressions': 'off',
          'typescript/no-non-null-assertion': 'off',
          // Test doubles: classes with one-line constructors, `_`-named internals of the thing they fake, throw-away
          // regexes and function expressions that need their own `this`.
          'typescript/parameter-properties': 'off',
          'max-classes-per-file': 'off',
          'no-underscore-dangle': 'off',
          'max-params': 'off',
          'prefer-named-capture-group': 'off',
          'new-cap': 'off',
          'func-names': 'off',
        },
      },
    ],
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
      'coverage',
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
