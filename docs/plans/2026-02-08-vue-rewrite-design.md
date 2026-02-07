# Vue 3 Rewrite Design

## Summary

Rewrite DiscordForms from vanilla JS to Vue 3 + Vite + TypeScript + Pinia.
Maintain GitHub Pages deployment compatibility.

## Decisions

| Decision | Choice |
|----------|--------|
| Framework | Vue 3 + Vite |
| UI/CSS | Keep current CSS, adapt to Vue components |
| State management | Pinia |
| Migration strategy | Full rewrite from scratch |
| TypeScript | Strict mode, no `any` |

## Project Structure

```
src/
├── App.vue
├── main.ts
├── components/
│   ├── editor/
│   │   ├── EditorLayout.vue
│   │   ├── EditorSidebar.vue
│   │   ├── FormSettings.vue
│   │   ├── FieldList.vue
│   │   ├── FieldEditor.vue
│   │   ├── ConditionalEditor.vue
│   │   ├── ComputedFieldEditor.vue
│   │   └── ConditionalMessageEditor.vue
│   ├── form/
│   │   ├── FormView.vue
│   │   ├── FormField.vue
│   │   └── fields/
│   │       ├── TextField.vue
│   │       ├── EmailField.vue
│   │       ├── TextareaField.vue
│   │       ├── SelectField.vue
│   │       ├── RadioField.vue
│   │       ├── CheckboxField.vue
│   │       └── ImageField.vue
│   └── common/
│       ├── ThemeToggle.vue
│       ├── WelcomeScreen.vue
│       └── EmojiPicker.vue
├── stores/
│   ├── formConfig.ts
│   └── ui.ts
├── services/
│   ├── discord.ts
│   └── config.ts
├── utils/
│   └── index.ts
├── types/
│   └── index.ts
└── assets/
    ├── style.css
    └── images/
```

## Types

```typescript
type FieldType = 'text' | 'email' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'image'

interface FieldOption {
  id: string
  label: string
  emoji?: string
}

interface ConditionalRule {
  dependsOn: string
  operator: 'equals' | 'not_equals' | 'contains'
  value: string
}

interface ComputedField {
  targetFieldId: string
  formula: string
}

interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required: boolean
  options?: FieldOption[]
  conditional?: ConditionalRule
  computed?: ComputedField
  multiselect?: boolean
}

interface ConditionalMessage {
  condition: { fieldId: string; value: string }
  embed: DiscordEmbed
}

interface FormConfig {
  title: string
  description: string
  webhookUrl: string
  organization?: string
  color?: string
  fields: FormField[]
  conditionalMessages: ConditionalMessage[]
}
```

## Stores

### `formConfig.ts` (Pinia)

Main store. Holds `FormConfig`, CRUD actions for fields, config encode/decode from URL.

### `ui.ts` (Pinia)

Minimal: `theme` (light/dark), `mode` (editor/viewer/welcome), `selectedFieldId`, `previewMode`.

## Services

### `discord.ts`

Pure functions. Builds Discord embed object from `FormConfig` + form data, sends via `fetch` POST to webhook URL. Images sent as `multipart/form-data`.

### `config.ts`

`encodeConfig()` / `decodeConfig()` via LZ-String. URL hash manipulation (`#config=...&mode=...`).

## Data Flow

### App Init

1. `main.ts` creates Vue app, registers Pinia
2. `App.vue` onMounted reads `window.location.hash`
3. If `#config=...` present — decode via `configService`, load into `formConfigStore`
4. `mode=` param determines mode → `uiStore.mode`
5. No config → show `WelcomeScreen`

### Editing

All editor components write to `formConfigStore`. Preview panel (`FormView`) reactively reads the same store. No manual sync — Vue reactivity handles it.

### Form Submission (viewer)

1. User fills fields → local `reactive` state in `FormView`
2. Click submit → validate required fields
3. `discordService.sendWebhook(formConfig, formData)` → build embed, fetch POST
4. Images as `multipart/form-data`

### Config Sharing

"Copy link" button → `configService.encode(formConfigStore.config)` → LZ-String → `#config=...&mode=view` → clipboard.

## Deployment (GitHub Pages)

### GitHub Actions (`.github/workflows/deploy.yml`)

On push to branch → `npm ci` → `npm run build` → deploy `dist/` via `actions/deploy-pages@v4`.

### Vite Config

```typescript
export default defineConfig({
  base: '/DiscordForms/',
})
```

### Change from current

- **Before:** push to master → GH Pages serves files as-is
- **After:** push → GitHub Actions builds → deploys `dist/` via Pages API
