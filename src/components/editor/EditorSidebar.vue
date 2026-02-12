<template>
  <div class="editor-header">
    <h2><i class="fas fa-cog"></i> Настройка формы</h2>
  </div>
  <div class="editor-content">
    <FormSettings />
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
    <FieldList />
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
    <Teleport to="body">
      <div v-if="showAiPrompt" class="field-variable-popup" @click.self="showAiPrompt = false">
        <div class="popup-content ai-prompt-popup">
          <h3>Промпт для ИИ</h3>
          <p class="section-hint">
            Скопируйте промпт, вставьте в чат с ИИ вместе с примером отчёта — получите готовый JSON для импорта.
          </p>
          <pre class="ai-prompt-text">{{ aiPrompt }}</pre>
          <div class="popup-buttons">
            <button class="popup-btn cancel-btn" @click="showAiPrompt = false">Закрыть</button>
            <button
              class="popup-btn insert-btn"
              :class="{ copied: isPromptCopied }"
              @click="onCopyPrompt"
            >
              <i :class="isPromptCopied ? 'fas fa-check' : 'fas fa-copy'"></i>
              {{ isPromptCopied ? 'Скопировано!' : 'Скопировать' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { copyToClipboard } from '../../utils'
import FormSettings from './FormSettings.vue'
import ConditionalMessageEditor from './ConditionalMessageEditor.vue'
import FieldList from './FieldList.vue'

const store = useFormConfigStore()
const config = store.config
const fileInput = ref<HTMLInputElement | null>(null)
const showAiPrompt = ref(false)
const isPromptCopied = ref(false)

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
  const success = await copyToClipboard(aiPrompt)
  if (success) {
    isPromptCopied.value = true
    setTimeout(() => { isPromptCopied.value = false }, 2000)
  }
}

function onExport(): void {
  store.exportConfig()
}

function onImportClick(): void {
  fileInput.value?.click()
}

async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const success = await store.importConfig(file)
  if (!success) {
    alert('Не удалось импортировать файл. Проверьте формат JSON.')
  }
  input.value = ''
}

async function onCopyLink(): Promise<void> {
  if (!config.webhookUrl) {
    alert('Укажите Webhook URL перед генерацией ссылки')
    return
  }

  const url = store.getShareUrl()
  const success = await copyToClipboard(url)
  if (success) showCopied()
}
</script>
