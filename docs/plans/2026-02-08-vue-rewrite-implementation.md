# Vue 3 Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite DiscordForms from vanilla JS to Vue 3 + Vite + TypeScript + Pinia, maintaining full feature parity and GitHub Pages deployment.

**Architecture:** SPA with two modes (editor/viewer) driven by URL hash. Pinia store holds form config; editor components write to store, form preview reads reactively. Config encoded via LZ-String into URL hash for sharing. Discord webhook integration as pure service functions.

**Tech Stack:** Vue 3 (Composition API), Vite, TypeScript (strict), Pinia, lz-string (npm), emoji-picker-element (npm), FontAwesome 6 (CDN)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.ts`, `src/App.vue`, `src/vite-env.d.ts`
- Create: `.github/workflows/deploy.yml`

**Step 1: Create branch and init Vite project**

```bash
cd /home/vadim/Study/DiscordForms
git checkout -b vue-rewrite
npm create vite@latest . -- --template vue-ts
```

> Note: Since directory is not empty, Vite will ask — choose to ignore existing files. If it refuses, init in a temp dir and copy files over.

**Step 2: Install dependencies**

```bash
npm install
npm install pinia lz-string emoji-picker-element
npm install -D @types/lz-string
```

**Step 3: Configure vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'emoji-picker',
        },
      },
    }),
  ],
  base: '/DiscordForms/',
})
```

**Step 4: Configure tsconfig.json for strict mode**

Ensure `"strict": true` and `"noImplicitAny": true` in tsconfig.json.

**Step 5: Set up index.html**

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Форма обратной связи</title>
    <link rel="icon" type="image/x-icon" href="/images/favicon/favicon.ico" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 6: Set up main.ts with Pinia**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

**Step 7: Minimal App.vue**

```vue
<template>
  <div>Vue app works</div>
</template>
```

**Step 8: Copy assets**

- Copy `style.css` → `src/assets/style.css`
- Copy `images/` → `public/images/`

**Step 9: Create GitHub Actions deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [vue-rewrite]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Step 10: Verify dev server runs**

```bash
npm run dev
```

Expected: Vite dev server starts, page shows "Vue app works".

**Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vue 3 + Vite + TypeScript + Pinia project"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

Reference: `js/constants.js`, `js/config.js:createEmptyConfig()`, `js/editor.js`, `js/discord.js`

**Step 1: Write all types**

```typescript
// src/types/index.ts

export type FieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'computed'
  | 'image'

export interface ConditionalCondition {
  field: string
  value: string
}

export interface ConditionalConfig {
  enabled: boolean
  conditions: ConditionalCondition[]
  // Legacy single-condition fields (for migration)
  field?: string
  value?: string
}

export interface CustomWebhookConfig {
  enabled: boolean
  url: string
  splitLines: boolean
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  icon: string
  options: string[]
  formula: string
  showTextInResponse: boolean
  defaultValue: string
  maxFiles: number
  conditional: ConditionalConfig | null
  customWebhook: CustomWebhookConfig | null
}

export interface ConditionalMessage {
  id: string
  field: string
  value: string
  message: string
}

export interface FormConfig {
  title: string
  description: string
  customMessage: string
  webhookUrl: string
  webhookUsername: string
  webhookAvatarUrl: string
  organization: string
  sendAsPlainText: boolean
  displayUsername: boolean
  showAdvancedSettings: boolean
  sendQuestionNumbers: boolean
  sendEmojis: boolean
  sendColons: boolean
  fields: FormField[]
  conditionalMessages: ConditionalMessage[]
}

export type AppMode = 'welcome' | 'editor' | 'viewer'

export type Theme = 'light' | 'dark'

export interface DiscordEmbedField {
  name: string
  value: string
  inline: boolean
}

export interface DiscordEmbed {
  title?: string
  color: number
  fields: DiscordEmbedField[]
  timestamp?: string
  footer?: {
    text: string
    icon_url: string
  }
  url?: string
  image?: {
    url: string
  }
}

export interface DiscordPayload {
  content: string | null
  embeds?: DiscordEmbed[]
  username: string
  avatar_url: string
}

export interface SendResult {
  success: boolean
  message: string
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Utility Functions and Services

**Files:**
- Create: `src/utils/index.ts`
- Create: `src/services/config.ts`
- Create: `src/services/discord.ts`

Reference: `js/utils.js`, `js/config.js`, `js/discord.js`

**Step 1: Write utils**

Port from `js/utils.js`: `generateId()`, `copyToClipboard()`, `getFieldIcon()` (from `js/form.js:7-24`), `iconMap` (from `js/constants.js:57-66`).

```typescript
// src/utils/index.ts

export const iconMap: Record<string, string> = {
  user: '👤',
  envelope: '📧',
  tag: '🏷️',
  'exclamation-triangle': '⚡',
  comment: '💬',
  newspaper: '📰',
  question: '❓',
  calculator: '🧮',
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function getFieldIcon(icon: string): string {
  if (!icon) return ''
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u
  if (emojiRegex.test(icon)) return icon
  if (iconMap[icon]) return iconMap[icon]
  return `<i class="fas fa-${icon}"></i>`
}
```

**Step 2: Write config service**

Port from `js/utils.js`: `encodeConfig()`, `decodeConfig()`, `optimizeConfig()`, `getUrlParams()`, `updateUrl()`.

```typescript
// src/services/config.ts
import LZString from 'lz-string'
import type { FormConfig } from '../types'

export function optimizeConfig(config: FormConfig): Record<string, unknown> { ... }
export function encodeConfig(config: FormConfig): string { ... }
export function decodeConfig(encoded: string): FormConfig | null { ... }
export function getUrlParams(): { config: string | null; mode: string | null } { ... }
export function updateUrl(config: FormConfig | null, mode: boolean | null): void { ... }
export function generateShareUrl(config: FormConfig): string { ... }
```

Port logic verbatim from `js/utils.js:14-121` and `js/config.js:93-99`. Replace `typeof LZString !== 'undefined'` with direct import.

**Step 3: Write discord service**

Port from `js/discord.js`: all functions. Accept `FormConfig` and form data as parameters instead of reading global `currentConfig`.

```typescript
// src/services/discord.ts
import type { FormConfig, DiscordEmbed, DiscordPayload, SendResult } from '../types'
import { getFieldIcon } from '../utils'

export function createDiscordEmbeds(config: FormConfig, formData: Record<string, string>, imagesLength: number): DiscordEmbed[] { ... }
export function createPlainTextMessage(config: FormConfig, formData: Record<string, string>): string { ... }
export function getConditionalMessage(config: FormConfig, formData: Record<string, string>): string | null { ... }
export function createFormDataPayload(payload: DiscordPayload, files: File[]): FormData { ... }
export function createGalleryEmbeds(embeds: DiscordEmbed[], fileCount: number): DiscordEmbed[] { ... }
export async function sendToDiscord(config: FormConfig, formData: Record<string, string>, uploadedImages: File[]): Promise<SendResult> { ... }
```

Port all logic from `js/discord.js:1-414`. Replace `currentConfig` references with `config` parameter. Replace `uploadedImages` global with parameter.

**Step 4: Verify TypeScript compiles**

```bash
npx vue-tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/utils/ src/services/
git commit -m "feat: add utility functions and config/discord services"
```

---

### Task 4: Pinia Stores

**Files:**
- Create: `src/stores/formConfig.ts`
- Create: `src/stores/ui.ts`

Reference: `js/constants.js`, `js/config.js:createEmptyConfig()`, `js/form.js:27-53`

**Step 1: Write formConfig store**

```typescript
// src/stores/formConfig.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FormConfig, FormField, ConditionalMessage } from '../types'
import { generateId } from '../utils'
import { decodeConfig, encodeConfig, getUrlParams, updateUrl, generateShareUrl } from '../services/config'

export const useFormConfigStore = defineStore('formConfig', () => {
  const config = ref<FormConfig>(createEmptyConfig())
  const uploadedImages = ref<File[]>([])

  function createEmptyConfig(): FormConfig {
    return {
      title: 'Моя форма',
      description: 'Описание формы',
      customMessage: '',
      webhookUrl: '',
      webhookUsername: 'Форма обратной связи',
      webhookAvatarUrl: 'https://pngimg.com/uploads/discord/discord_PNG3.png',
      organization: 'LSPD',
      sendAsPlainText: false,
      displayUsername: true,
      showAdvancedSettings: false,
      sendQuestionNumbers: true,
      sendEmojis: false,
      sendColons: true,
      fields: [
        { id: generateId(), type: 'text', label: 'Имя', placeholder: '', required: true, icon: 'user', options: [], formula: '', showTextInResponse: true, defaultValue: '', maxFiles: 10, conditional: null, customWebhook: null },
        { id: generateId(), type: 'email', label: 'Email', placeholder: '', required: true, icon: 'envelope', options: [], formula: '', showTextInResponse: true, defaultValue: '', maxFiles: 10, conditional: null, customWebhook: null },
        { id: generateId(), type: 'textarea', label: 'Сообщение', placeholder: '', required: true, icon: 'comment', options: [], formula: '', showTextInResponse: true, defaultValue: '', maxFiles: 10, conditional: null, customWebhook: null },
      ],
      conditionalMessages: [],
    }
  }

  function loadFromUrl(): boolean { ... }
  function addField(type?: string): void { ... }
  function addImageField(): void { ... }
  function removeField(fieldId: string): void { ... }
  function moveField(fieldId: string, direction: 'up' | 'down'): void { ... }
  function cloneField(fieldId: string): void { ... }
  function updateField(fieldId: string, updates: Partial<FormField>): void { ... }
  function addConditionalMessage(): void { ... }
  function removeConditionalMessage(id: string): void { ... }
  function updateConfig(): void { ... } // calls updateUrl
  function getShareUrl(): string { ... }
  function resetConfig(): void { ... }
  function hasImageField(): boolean { ... }

  return { config, uploadedImages, createEmptyConfig, loadFromUrl, addField, addImageField, removeField, moveField, cloneField, updateField, addConditionalMessage, removeConditionalMessage, updateConfig, getShareUrl, resetConfig, hasImageField }
})
```

**Step 2: Write ui store**

```typescript
// src/stores/ui.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppMode, Theme } from '../types'

export const useUiStore = defineStore('ui', () => {
  const mode = ref<AppMode>('welcome')
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')
  const selectedFieldId = ref<string | null>(null)

  function setMode(newMode: AppMode): void { mode.value = newMode }
  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }
  function initTheme(): void { setTheme(theme.value) }

  return { mode, theme, selectedFieldId, setMode, setTheme, initTheme }
})
```

**Step 3: Verify TypeScript compiles**

```bash
npx vue-tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/stores/
git commit -m "feat: add Pinia stores for form config and UI state"
```

---

### Task 5: App.vue and Common Components

**Files:**
- Create: `src/App.vue`
- Create: `src/components/common/ThemeToggle.vue`
- Create: `src/components/common/WelcomeScreen.vue`

Reference: `js/app.js`, `js/form.js:112-164`, `js/theme.js`

**Step 1: Write App.vue**

Root component. On mount: init theme, read URL params, load config, determine mode. Renders WelcomeScreen, EditorLayout, or FormView based on `uiStore.mode`.

```vue
<template>
  <div class="container" :class="{ 'editor-mode': uiStore.mode === 'editor' }">
    <EditorLayout v-if="uiStore.mode === 'editor'" />
    <FormView v-if="uiStore.mode === 'editor' || uiStore.mode === 'viewer'" :preview="uiStore.mode === 'editor'" />
    <WelcomeScreen v-if="uiStore.mode === 'welcome'" />
    <div class="background-decoration">
      <div class="decoration-1"></div>
      <div class="decoration-2"></div>
      <div class="decoration-3"></div>
    </div>
  </div>
  <p class="watermark">© SpringFlash (Geralt Spring)</p>
</template>
```

Logic in `onMounted`: call `uiStore.initTheme()`, call `formConfigStore.loadFromUrl()`, set mode.

**Step 2: Write WelcomeScreen.vue**

Port HTML from `js/form.js:118-151`. Emit `create` event → parent calls `formConfigStore.resetConfig()`, sets mode to `editor`.

**Step 3: Write ThemeToggle.vue**

Two buttons (light/dark), reads and writes `uiStore.theme`.

**Step 4: Verify renders correctly**

```bash
npm run dev
```

Navigate to `http://localhost:5173/DiscordForms/` — should show WelcomeScreen.

**Step 5: Commit**

```bash
git add src/App.vue src/components/common/
git commit -m "feat: add App.vue, WelcomeScreen, ThemeToggle"
```

---

### Task 6: Form Field Components (Viewer)

**Files:**
- Create: `src/components/form/FormView.vue`
- Create: `src/components/form/FormField.vue`
- Create: `src/components/form/fields/TextField.vue`
- Create: `src/components/form/fields/EmailField.vue`
- Create: `src/components/form/fields/TextareaField.vue`
- Create: `src/components/form/fields/SelectField.vue`
- Create: `src/components/form/fields/RadioField.vue`
- Create: `src/components/form/fields/CheckboxField.vue`
- Create: `src/components/form/fields/CheckboxesField.vue`
- Create: `src/components/form/fields/ComputedField.vue`
- Create: `src/components/form/fields/ImageField.vue`

Reference: `js/form.js:167-496`

**Step 1: Write individual field components**

Each field component:
- Props: `field: FormField`, `modelValue: string`
- Emits: `update:modelValue`
- Renders the appropriate HTML matching current CSS classes

Example `TextField.vue`:
```vue
<template>
  <input :type="field.type" :id="field.id" :name="field.id" :placeholder="field.placeholder" :required="field.required" :value="modelValue" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
  <div class="input-line"></div>
</template>
```

`ImageField.vue` — most complex. Port drag-drop, paste, file input logic from `js/form.js:316-495`. Use `formConfigStore.uploadedImages` for state.

`ComputedField.vue` — port `calculateFormula()` from `js/computed-fields.js`. Use `watch` on form data to recompute.

**Step 2: Write FormField.vue (dispatcher)**

```vue
<template>
  <div class="form-group" :data-field-id="field.id" :class="{ 'conditional-field': hasConditional }" v-show="isVisible">
    <label :for="field.id">
      <span v-html="iconHtml"></span>
      {{ field.label }}{{ field.required ? ' *' : '' }}
    </label>
    <component :is="fieldComponent" :field="field" v-model="localValue" />
  </div>
</template>
```

Uses `computed` to pick the right component based on `field.type`.

**Step 3: Write FormView.vue**

Port from `js/form.js:167-653`:
- Renders header (title, description, org logo, menu button)
- Loops `formConfigStore.config.fields` → `<FormField>`
- Submit handler: collect data, validate, call `sendToDiscord()`, handle response
- Conditional visibility logic (port from `js/conditional.js`)

```vue
<template>
  <div class="form-wrapper" :class="{ preview: preview }">
    <div class="organization-logo">
      <img :src="orgLogoSrc" :alt="config.organization + ' Logo'" />
    </div>
    <div class="vinewood-logo">VINEWOOD</div>
    <div class="header">
      <div class="header-top">
        <h1>{{ config.title }}</h1>
        <FormMenu v-if="!preview" @duplicate="onDuplicate" />
      </div>
      <p>{{ config.description }}</p>
    </div>
    <form class="contact-form" @submit.prevent="onSubmit">
      <FormField v-for="field in config.fields" :key="field.id" :field="field" v-model="formData[field.id]" />
      <button type="submit" class="submit-btn" :disabled="isLoading">
        <span class="btn-text">{{ isLoading ? 'Отправка...' : 'Отправить сообщение' }}</span>
        <i :class="isLoading ? 'fas fa-spinner loading' : 'fas fa-arrow-right'"></i>
      </button>
    </form>
    <div class="response-message" :class="[responseType, { show: responseVisible }]">{{ responseText }}</div>
  </div>
</template>
```

**Step 4: Verify form renders from config**

Test with hardcoded config → form should render with all field types.

**Step 5: Commit**

```bash
git add src/components/form/
git commit -m "feat: add form viewer components with all field types"
```

---

### Task 7: Editor Components

**Files:**
- Create: `src/components/editor/EditorLayout.vue`
- Create: `src/components/editor/EditorSidebar.vue`
- Create: `src/components/editor/FormSettings.vue`
- Create: `src/components/editor/FieldList.vue`
- Create: `src/components/editor/FieldEditor.vue`
- Create: `src/components/editor/ImageFieldEditor.vue`
- Create: `src/components/editor/ConditionalEditor.vue`
- Create: `src/components/editor/CustomWebhookEditor.vue`
- Create: `src/components/editor/ComputedFieldEditor.vue`
- Create: `src/components/editor/ConditionalMessageEditor.vue`
- Create: `src/components/common/EmojiPicker.vue`

Reference: `js/editor.js` (1735 lines)

**Step 1: Write EditorLayout.vue**

Simple two-panel layout:
```vue
<template>
  <div class="editor-panel show">
    <EditorSidebar />
  </div>
</template>
```

**Step 2: Write FormSettings.vue**

Port from `js/editor.js:13-129`. Two-way bind all form settings to `formConfigStore.config` using `v-model`.

Fields: title, description, webhook URL, webhook username, display username checkbox, webhook avatar URL, send as plain text checkbox, organization select, theme toggle, custom message, send question numbers, send emojis, send colons.

All inputs call `formConfigStore.updateConfig()` on change.

**Step 3: Write FieldEditor.vue**

Port from `js/editor.js:219-519` (addFieldToEditor) and `js/editor.js:526-1152` (setupFieldEventHandlers).

Props: `field: FormField`

Contains:
- Header with title, required checkbox, action buttons (move up/down, clone, delete)
- Collapsible config section
- Field label input with EmojiPicker
- Type select
- Placeholder input (hidden for checkbox)
- Options input (visible for select/radio/checkboxes)
- Formula editor (visible for computed)
- ConditionalEditor (visible when advanced settings on)
- CustomWebhookEditor (visible when advanced settings on)

All changes directly mutate the field in `formConfigStore.config.fields` (Pinia reactive).

**Step 4: Write ImageFieldEditor.vue**

Separate component for image field card. Port from `js/editor.js:225-314` and `js/editor.js:1155-1351`.

Simpler than FieldEditor — no type select, no placeholder, no formula. Has max files select and conditional editor.

**Step 5: Write ConditionalEditor.vue**

Port from `js/editor.js:607-680` (renderConditionalConditions) and `js/editor.js:682-757` (updateConditionValueContainer).

Props: `field: FormField`

Renders list of conditions with field select + value checkboxes/input. Add/remove conditions.

**Step 6: Write CustomWebhookEditor.vue**

Port from `js/editor.js:1079-1145`.

Props: `field: FormField`

Collapsible section: enabled checkbox, URL input, split lines checkbox (for textarea/computed).

**Step 7: Write ComputedFieldEditor.vue**

Port from `js/editor.js:428-460` (formula editor section) and `js/editor.js:1354-1460` (showFieldVariablePopup).

Props: `field: FormField`

Formula input with "Add variable" button that shows popup.

**Step 8: Write ConditionalMessageEditor.vue**

Port from `js/conditional.js:187-333` (addConditionalMessageToEditor).

Props: `condMsg: ConditionalMessage`

Field select, value checkboxes, message textarea, delete button.

**Step 9: Write EmojiPicker.vue**

Wrapper around `emoji-picker-element`. Button shows current icon, click opens picker popup, selection updates field icon.

**Step 10: Write EditorSidebar.vue**

Assembles everything:
```vue
<template>
  <div class="editor-header">
    <h2><i class="fas fa-cog"></i> Настройка формы</h2>
  </div>
  <div class="editor-content">
    <FormSettings />
    <ConditionalMessagesSection />
    <FieldList />
    <ShareSection />
  </div>
</template>
```

**Step 11: Write FieldList.vue**

Renders list of FieldEditor/ImageFieldEditor components. Add field buttons. Advanced settings toggle.

**Step 12: Verify editor works**

Create new form → all settings editable, fields add/remove/reorder, form preview updates reactively.

**Step 13: Commit**

```bash
git add src/components/editor/ src/components/common/EmojiPicker.vue
git commit -m "feat: add editor components"
```

---

### Task 8: Conditional Visibility and Computed Fields (Runtime)

**Files:**
- Create: `src/composables/useConditionalFields.ts`
- Create: `src/composables/useComputedFields.ts`

Reference: `js/conditional.js:1-184`, `js/computed-fields.js:1-217`

**Step 1: Write useConditionalFields composable**

Port conditional visibility logic from `js/conditional.js`. Instead of DOM queries, use reactive form data to compute visibility per field.

```typescript
// src/composables/useConditionalFields.ts
export function useConditionalFields(config: FormConfig, formData: Record<string, string>) {
  const visibilityMap = computed(() => { ... })
  return { visibilityMap }
}
```

Returns `Record<string, boolean>` — field ID → visible.

**Step 2: Write useComputedFields composable**

Port `calculateFormula()` from `js/computed-fields.js`. Watch form data changes, recompute all computed fields.

```typescript
// src/composables/useComputedFields.ts
export function useComputedFields(config: FormConfig, formData: Record<string, string>) {
  // Watch formData, recalculate all computed field values
  // Return computed values map
}
```

**Step 3: Integrate into FormView.vue**

Use both composables in FormView. Pass visibility map to FormField components. Auto-update computed field values in formData.

**Step 4: Verify conditional and computed fields work**

Test: create form with conditional field → change trigger → field shows/hides. Create computed field with formula → values update.

**Step 5: Commit**

```bash
git add src/composables/
git commit -m "feat: add conditional visibility and computed fields composables"
```

---

### Task 9: URL Config Integration and Full Flow

**Files:**
- Modify: `src/App.vue`
- Modify: `src/stores/formConfig.ts`
- Modify: `src/components/editor/EditorSidebar.vue` (share URL button)

Reference: `js/app.js`, `js/config.js:93-129`

**Step 1: Implement loadFromUrl in formConfig store**

Read URL hash → decode → load config. Handle old `?config=` format migration. Set mode based on `mode` param.

**Step 2: Implement share URL generation**

"Copy link" button → encode config → build URL → copy to clipboard. Show success/error feedback.

**Step 3: Implement URL updates on editor changes**

Every time config changes in editor → update URL hash (without reload). Port `updateUrl()` logic.

**Step 4: Handle popstate**

Listen for browser back/forward → reload.

**Step 5: Update page title and favicon**

Watch `config.title` and `config.organization` → update `document.title` and favicon link.

**Step 6: Verify full flow**

1. Open app → Welcome screen
2. Create form → editor loads with defaults
3. Edit fields → preview updates
4. Copy link → open in new tab → form renders in viewer mode
5. Submit form → Discord webhook fires (test with actual webhook)
6. Browser back → app handles correctly

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement URL config loading, sharing, and full app flow"
```

---

### Task 10: Form Submission and Discord Integration

**Files:**
- Modify: `src/components/form/FormView.vue`

Reference: `js/form.js:499-653`, `js/discord.js:264-414`

**Step 1: Implement form submission handler**

- Collect all form data (handle checkboxes → array → joined string)
- Validate required fields (skip hidden conditional fields, skip computed)
- Validate email format
- Validate image required
- Show errors if any
- Call `sendToDiscord()` service
- Handle custom webhook fields (splitLines, separate URL)
- Show success/error message
- Reset form on success
- Loading state on submit button

**Step 2: Implement "Duplicate and configure" menu**

Port from `js/form.js:558-571`. Menu dropdown on form → click → switch to editor mode with cleared webhook.

**Step 3: Verify submission**

Set up a test Discord webhook → create form → fill → submit → verify message appears in Discord channel.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement form submission and Discord webhook integration"
```

---

### Task 11: Polish, CSS Fixes, and Edge Cases

**Files:**
- Modify: `src/assets/style.css` (adjust paths if needed)
- Various component tweaks

**Step 1: Fix asset paths in CSS**

If CSS references `images/` paths, adjust for Vite's `public/` directory. Use `/DiscordForms/images/...` or relative paths.

**Step 2: Form entrance animation**

Port from `js/app.js:52-62`. Use Vue `<Transition>` component.

**Step 3: Editor field header collapse**

Clicking field header toggles config visibility. Currently done via DOM manipulation — replace with reactive `expanded` state per field.

**Step 4: Field variable popup for computed fields**

Port popup from `js/editor.js:1354-1460`. Can be a Vue component with v-if, teleported to body.

**Step 5: Verify dark/light themes work**

Toggle themes → all elements style correctly.

**Step 6: Test backward compatibility**

Old format URLs (`?config=...`) should still work (auto-migrate to hash). Old base64 encoded configs (without `v2:` prefix) should decode correctly.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: polish UI, animations, CSS fixes, backward compatibility"
```

---

### Task 12: Build Verification and Cleanup

**Step 1: Run production build**

```bash
npm run build
```

Expected: No errors. `dist/` contains index.html + assets.

**Step 2: Preview production build**

```bash
npm run preview
```

Navigate to preview URL → verify all features work.

**Step 3: TypeScript check**

```bash
npx vue-tsc --noEmit
```

Expected: No errors.

**Step 4: Remove old vanilla JS files from src**

The old `js/`, `style.css` (root), and `index.html` (root) are still in the repo on master branch. On `vue-rewrite` branch, these can be removed or left for reference (they won't be deployed since only `dist/` is deployed).

Decision: Remove old files to keep the branch clean.

```bash
rm -rf js/
rm style.css
# Keep images/ in public/
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove old vanilla JS files, finalize Vue rewrite"
```

**Step 6: Push branch**

```bash
git push -u origin vue-rewrite
```

---

## Summary

| Task | Description | Estimated Complexity |
|------|-------------|---------------------|
| 1 | Project scaffolding | Low |
| 2 | TypeScript types | Low |
| 3 | Utils and services | Medium |
| 4 | Pinia stores | Medium |
| 5 | App.vue and common components | Low |
| 6 | Form field components (viewer) | High |
| 7 | Editor components | Very High |
| 8 | Conditional/computed composables | Medium |
| 9 | URL config integration | Medium |
| 10 | Form submission/Discord | Medium |
| 11 | Polish and edge cases | Medium |
| 12 | Build verification and cleanup | Low |
