import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { FormConfig, FormField } from '../types'
import { generateId } from '../utils'
import { getUrlParams, decodeConfig, updateUrl, generateShareUrl } from '../services/config'

function stripWebhooks(config: FormConfig): FormConfig {
  const stripped = JSON.parse(JSON.stringify(config)) as FormConfig
  stripped.webhookUrl = ''
  stripped.fields = stripped.fields.map((f) => ({ ...f, customWebhook: null }))
  return stripped
}

function createField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: generateId(),
    type: 'text',
    label: 'Новое поле',
    placeholder: '',
    required: false,
    icon: 'question',
    options: [],
    formula: '',
    showTextInResponse: true,
    defaultValue: '',
    maxFiles: 10,
    conditional: null,
    customWebhook: null,
    ...overrides,
  }
}

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
      createField({ type: 'text', label: 'Имя', icon: 'user', required: true }),
      createField({ type: 'email', label: 'Email', icon: 'envelope', required: true }),
      createField({ type: 'textarea', label: 'Сообщение', icon: 'comment', required: true }),
    ],
    conditionalMessages: [],
  }
}

export const useFormConfigStore = defineStore('formConfig', () => {
  const config = ref<FormConfig>(createEmptyConfig())
  const uploadedImages = ref<File[]>([])

  function loadFromUrl(): { loaded: boolean; isEditor: boolean } {
    const params = getUrlParams()

    let decoded: FormConfig | null = null

    if (params.config) {
      decoded = decodeConfig(params.config)
    }

    if (!decoded) {
      return { loaded: false, isEditor: false }
    }

    const isEditor = params.mode === 'editor'
    if (isEditor) {
      decoded.webhookUrl = ''
    }

    config.value = decoded
    return { loaded: true, isEditor }
  }

  function addField(): void {
    const field = createField()
    const imageIndex = config.value.fields.findIndex((f) => f.type === 'image')
    if (imageIndex !== -1) {
      config.value.fields.splice(imageIndex, 0, field)
    } else {
      config.value.fields.push(field)
    }
  }

  function addImageField(): void {
    config.value.fields.push(
      createField({ type: 'image', label: 'Прикрепите скриншоты', maxFiles: 10 }),
    )
  }

  function removeField(fieldId: string): void {
    config.value.fields = config.value.fields.filter((f) => f.id !== fieldId)
  }

  function moveField(fieldId: string, direction: 'up' | 'down'): void {
    const fields = config.value.fields
    const index = fields.findIndex((f) => f.id === fieldId)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= fields.length) return

    // Don't allow moving image field up
    if (fields[index]!.type === 'image' && direction === 'up') return
    // Don't allow moving below image field
    if (direction === 'down' && fields[targetIndex]!.type === 'image') return

    const temp = fields[index]!
    fields[index] = fields[targetIndex]!
    fields[targetIndex] = temp
  }

  function cloneField(fieldId: string): void {
    const fields = config.value.fields
    const index = fields.findIndex((f) => f.id === fieldId)
    if (index === -1) return

    const original = fields[index]!
    const cloned: FormField = {
      ...(JSON.parse(JSON.stringify(original)) as FormField),
      id: generateId(),
      label: original.label + ' (копия)',
    }
    fields.splice(index + 1, 0, cloned)
  }

  function updateField(fieldId: string, updates: Partial<FormField>): void {
    const field = config.value.fields.find((f) => f.id === fieldId)
    if (field) {
      Object.assign(field, updates)
    }
  }

  function addConditionalMessage(): void {
    config.value.conditionalMessages.push({
      id: generateId(),
      field: '',
      value: '',
      message: '',
    })
  }

  function removeConditionalMessage(id: string): void {
    config.value.conditionalMessages = config.value.conditionalMessages.filter(
      (m) => m.id !== id,
    )
  }

  function updateConfig(): void {
    updateUrl(config.value, null)
  }

  function getShareUrl(): string {
    return generateShareUrl(config.value)
  }

  function resetConfig(): void {
    config.value = createEmptyConfig()
  }

  function hasImageField(): boolean {
    return config.value.fields.some((f) => f.type === 'image')
  }

  function exportConfig(): void {
    const stripped = stripWebhooks(config.value)
    const json = JSON.stringify(stripped, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.value.title || 'form'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importConfig(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result as string) as FormConfig
          imported.webhookUrl = ''
          imported.fields = (imported.fields ?? []).map((f) => ({ ...createField(), ...f, customWebhook: null }))
          config.value = imported
          updateUrl(config.value, null)
          resolve(true)
        } catch {
          resolve(false)
        }
      }
      reader.onerror = () => resolve(false)
      reader.readAsText(file)
    })
  }

  return {
    config,
    uploadedImages,
    loadFromUrl,
    addField,
    addImageField,
    removeField,
    moveField,
    cloneField,
    updateField,
    addConditionalMessage,
    removeConditionalMessage,
    updateConfig,
    getShareUrl,
    resetConfig,
    hasImageField,
    exportConfig,
    importConfig,
  }
})
