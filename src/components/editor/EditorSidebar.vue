<template>
  <nav class="sidebar-tabs" role="tablist">
    <button
      class="sidebar-tab"
      :class="{ 'is-active': activeTab === 'settings' }"
      role="tab"
      type="button"
      :aria-selected="activeTab === 'settings'"
      @click="activeTab = 'settings'"
    >
      <span class="sidebar-tab__icon">⚙</span>
      <span>Настройки</span>
    </button>
    <button
      class="sidebar-tab"
      :class="{ 'is-active': activeTab === 'fields' }"
      role="tab"
      type="button"
      :aria-selected="activeTab === 'fields'"
      @click="activeTab = 'fields'"
    >
      <span class="sidebar-tab__icon">🧩</span>
      <span>Поля</span>
    </button>
    <button
      class="sidebar-tab"
      :class="{ 'is-active': activeTab === 'logic' }"
      role="tab"
      type="button"
      :aria-selected="activeTab === 'logic'"
      @click="activeTab = 'logic'"
    >
      <span class="sidebar-tab__icon">⚡</span>
      <span>Логика</span>
    </button>
  </nav>

  <div class="editor-content" v-show="activeTab === 'settings'">
    <FormSettings />
    <div class="editor-section">
      <div class="section-header-with-toggle">
        <h3>Импорт / Экспорт</h3>
        <button class="ai-prompt-hint-btn" title="Промпт для ИИ" @click="showAiPrompt = true">
          <i class="fas fa-question"></i>
        </button>
      </div>
      <div class="url-buttons-group">
        <button class="generate-url-btn" @click="onExport">
          <i class="fas fa-download"></i> Экспорт JSON
        </button>
        <button class="generate-url-btn" @click="onImportClick">
          <i class="fas fa-upload"></i> Импорт JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="onImportFile"
        >
      </div>
    </div>
    <div class="editor-section">
      <h3>Ссылка на форму</h3>
      <div class="url-buttons-group">
        <button
          class="generate-url-btn"
          :class="{ copied: isCopied }"
          @click="onCopyLink"
        >
          <i :class="isCopied ? 'fas fa-check' : 'fas fa-copy'"></i>
          {{ isCopied ? 'Скопировано!' : 'Скопировать ссылку' }}
        </button>
      </div>
    </div>
  </div>

  <div class="editor-content" v-show="activeTab === 'fields'">
    <FieldList />
  </div>

  <div class="editor-content" v-show="activeTab === 'logic'">
    <div class="editor-section">
      <h3>Условные сообщения</h3>
      <p class="section-hint">
        Отправляйте разные сообщения в Discord в зависимости от выбранных значений
      </p>
      <div class="conditional-messages-list">
        <ConditionalMessageEditor
          v-for="condMsg in config.conditionalMessages"
          :key="condMsg.id"
          :cond-msg="condMsg"
        />
      </div>
      <button
        class="add-field-btn"
        @click="store.addConditionalMessage(); store.updateConfig()"
      >
        <i class="fas fa-plus"></i> Добавить условное сообщение
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showAiPrompt" class="field-variable-popup" @click.self="showAiPrompt = false">
      <div
        class="popup-content ai-prompt-popup"
        tabindex="-1"
        ref="aiPromptCard"
        @keydown.esc="showAiPrompt = false"
      >
        <div class="ai-prompt-header">
          <h3>Сгенерировать форму через ИИ</h3>
          <button class="ai-prompt-close-btn" @click="showAiPrompt = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="ai-steps">
          <div class="ai-step-card">
            <div class="ai-step-badge">1</div>
            <div class="ai-step-body">
              <div class="ai-step-title">Скопируй промпт</div>
              <button
                class="popup-btn insert-btn ai-step-btn"
                :class="{ copied: isPromptCopied }"
                @click="onCopyPrompt"
              >
                <i :class="isPromptCopied ? 'fas fa-check' : 'fas fa-copy'"></i>
                {{ isPromptCopied ? '✓ Скопировано!' : '📋 Скопировать промпт' }}
              </button>
            </div>
          </div>

          <div class="ai-step-card">
            <div class="ai-step-badge">2</div>
            <div class="ai-step-body">
              <div class="ai-step-title">Вставь в ChatGPT или Claude вместе с примером отчёта</div>
            </div>
          </div>

          <div class="ai-step-card">
            <div class="ai-step-badge">3</div>
            <div class="ai-step-body">
              <div class="ai-step-title">Импортируй полученный JSON</div>
              <button
                class="popup-btn cancel-btn ai-step-btn"
                @click="onImportFromAi"
              >
                📤 Импорт JSON
              </button>
            </div>
          </div>
        </div>

        <div class="ai-prompt-collapse">
          <button class="ai-prompt-toggle" @click="showPromptText = !showPromptText">
            {{ showPromptText ? '▾ Скрыть текст промпта' : '▸ Посмотреть текст промпта' }}
          </button>
          <pre v-if="showPromptText" class="ai-prompt-text">{{ aiPrompt }}</pre>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { useToast } from '../../composables/useToast'
import { copyToClipboard } from '../../utils'
import { saveToHistory } from '../../utils/formHistory'
import FormSettings from './FormSettings.vue'
import ConditionalMessageEditor from './ConditionalMessageEditor.vue'
import FieldList from './FieldList.vue'
import { useEditorTab } from '../../composables/useEditorTab'

const store = useFormConfigStore()
const config = store.config
const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const aiPromptCard = ref<HTMLDivElement | null>(null)
const showAiPrompt = ref(false)
const { activeTab } = useEditorTab()

watch(showAiPrompt, async (val) => {
  if (val) {
    await nextTick()
    aiPromptCard.value?.focus()
  }
})
const isPromptCopied = ref(false)
const showPromptText = ref(false)

const isCopied = ref(false)
let copiedTimeout: ReturnType<typeof setTimeout> | undefined

const aiPrompt = `Generate a JSON config for a Discord form builder. Analyze the provided report/document sample and create fields matching its structure.

JSON format:
{
  "title": "Form title",
  "description": "Form description",
  "webhookUrl": "",
  "webhookUsername": "Form Bot",
  "webhookAvatarUrl": "",
  "organization": "LSPD",
  "sendAsPlainText": false,
  "displayUsername": true,
  "sendQuestionNumbers": true,
  "sendEmojis": false,
  "sendColons": true,
  "fields": [...],
  "conditionalMessages": []
}

Each field:
{
  "id": "<unique string>",
  "type": "text|email|textarea|select|radio|checkbox|checkboxes",
  "label": "Field label",
  "placeholder": "Placeholder hint",
  "required": true/false,
  "icon": "emoji like 👤 📧 💬 📋 🏷️ ⚡ 📰 🧮 or fontawesome name: user, envelope, tag, comment, question",
  "options": ["opt1", "opt2"],  // only for select, radio, checkboxes
  "formula": "",
  "showTextInResponse": true,
  "defaultValue": "",
  "maxFiles": 10,
  "conditional": null,
  "customWebhook": null
}

Field types:
- "text" — single line input
- "email" — email input
- "textarea" — multiline text
- "select" — dropdown (needs "options")
- "radio" — radio buttons (needs "options")
- "checkbox" — single yes/no toggle
- "checkboxes" — multiple choice (needs "options")

Rules:
- Generate unique "id" for each field (e.g. "f1", "f2", "f3")
- Set "required": true for important fields
- Use appropriate emojis as "icon"
- "options" array only for select/radio/checkboxes, empty [] otherwise
- "webhookUrl" must be empty string
- Output ONLY the raw JSON, no markdown, no explanations

Now analyze the following report/document and generate the config:`

function showCopied(): void {
  if (copiedTimeout) clearTimeout(copiedTimeout)
  isCopied.value = true
  copiedTimeout = setTimeout(() => {
    isCopied.value = false
  }, 2000)
}

async function onCopyPrompt(): Promise<void> {
  const ok = await copyToClipboard(aiPrompt)
  if (ok) {
    isPromptCopied.value = true
    setTimeout(() => { isPromptCopied.value = false }, 2000)
    toastSuccess('Промпт скопирован')
  }
}

function onExport(): void {
  store.exportConfig()
}

function onImportClick(): void {
  fileInput.value?.click()
}

function onImportFromAi(): void {
  showAiPrompt.value = false
  fileInput.value?.click()
}

async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const ok = await store.importConfig(file)
  if (!ok) {
    toastError('Не удалось импортировать файл', 'Проверьте формат JSON.')
  }
  input.value = ''
}

async function onCopyLink(): Promise<void> {
  if (!config.webhookUrl) {
    toastWarning('Webhook URL не указан', 'Заполните его в настройках формы.')
    return
  }

  const url = store.getShareUrl()
  const ok = await copyToClipboard(url)
  if (ok) {
    showCopied()
    toastSuccess('Ссылка скопирована')
    saveToHistory(config, url)
  }
}
</script>
