<template>
  <div class="organization-logo">
    <img :src="orgLogoSrc" :alt="config.organization + ' Logo'" />
  </div>
  <div class="vinewood-logo">VINEWOOD</div>
  <div class="header">
    <div class="header-top">
      <h1>{{ config.title }}</h1>
      <div v-if="!preview" class="form-menu">
        <button class="edit-form-btn" title="Меню формы" @click.stop="showDropdown = !showDropdown">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div v-if="showDropdown" class="form-dropdown show">
          <button class="dropdown-item" @click="onDuplicate">
            <i class="fas fa-copy"></i> Дублировать и настроить
          </button>
        </div>
      </div>
    </div>
    <p>{{ config.description }}</p>
  </div>
  <form class="contact-form" @submit.prevent="onSubmit">
    <FormField
      v-for="field in config.fields"
      :key="field.id"
      :field="field"
      :model-value="formData[field.id] ?? ''"
      @update:model-value="formData[field.id] = $event"
      :is-visible="visibilityMap[field.id] ?? true"
    />
    <button type="submit" class="submit-btn" :disabled="isLoading">
      <span class="btn-text">{{ isLoading ? 'Отправка...' : 'Отправить сообщение' }}</span>
      <i :class="isLoading ? 'fas fa-spinner loading' : 'fas fa-arrow-right'"></i>
    </button>
  </form>
  <div class="response-message" :class="[responseType, { show: responseVisible }]">
    {{ responseText }}
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { useUiStore } from '../../stores/ui'
import { useConditionalFields } from '../../composables/useConditionalFields'
import { useComputedFields } from '../../composables/useComputedFields'
import { sendToDiscord } from '../../services/discord'
import FormField from './FormField.vue'

withDefaults(
  defineProps<{
    preview?: boolean
  }>(),
  {
    preview: false,
  },
)

const formConfigStore = useFormConfigStore()
const uiStore = useUiStore()
const config = computed(() => formConfigStore.config)

const formData = reactive<Record<string, string>>({})

const { visibilityMap } = useConditionalFields(config, formData)
useComputedFields(config.value, formData)

// Clear hidden field values
watch(visibilityMap, (map, oldMap) => {
  if (!oldMap) return
  for (const fieldId of Object.keys(map)) {
    if (!map[fieldId] && oldMap[fieldId]) {
      formData[fieldId] = ''
    }
  }
})

const showDropdown = ref(false)
const isLoading = ref(false)
const responseText = ref('')
const responseType = ref<'success' | 'error'>('success')
const responseVisible = ref(false)

let hideTimeout: ReturnType<typeof setTimeout> | undefined

const orgLogoSrc = computed(() => {
  return `${import.meta.env.BASE_URL}images/${config.value.organization || 'LSPD'}.png`
})

function initFormData(): void {
  for (const field of config.value.fields) {
    if (!(field.id in formData)) {
      formData[field.id] = field.defaultValue || ''
    }
  }
  // Clean up keys for removed fields
  const fieldIds = new Set(config.value.fields.map((f) => f.id))
  for (const key of Object.keys(formData)) {
    if (!fieldIds.has(key)) {
      delete formData[key]
    }
  }
}

watch(
  () => config.value.fields,
  () => initFormData(),
  { immediate: true, deep: true },
)

function showMessage(msg: string, type: 'success' | 'error'): void {
  responseText.value = msg
  responseType.value = type
  responseVisible.value = true

  if (hideTimeout) clearTimeout(hideTimeout)
  hideTimeout = setTimeout(() => {
    responseVisible.value = false
  }, 5000)
}

function onDuplicate(): void {
  showDropdown.value = false
  formConfigStore.config.webhookUrl = ''
  uiStore.setMode('editor')
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(): string[] {
  const errors: string[] = []

  for (const field of config.value.fields) {
    const isVisible = visibilityMap.value[field.id] ?? true
    if (!isVisible) continue

    // Skip validation for computed fields that are hidden
    if (field.type === 'computed') continue

    const value = formData[field.id]

    // Required field validation
    if (field.required) {
      if (field.type === 'image') {
        if (formConfigStore.uploadedImages.length === 0) {
          errors.push(`Поле "${field.label}" обязательно для заполнения`)
        }
      } else if (!value || !value.trim()) {
        errors.push(`Поле "${field.label}" обязательно для заполнения`)
      }
    }

    // Email format validation
    if (field.type === 'email' && value && value.trim() && !EMAIL_REGEX.test(value.trim())) {
      errors.push(`Поле "${field.label}" содержит некорректный email`)
    }
  }

  return errors
}

async function onSubmit(): Promise<void> {
  const errors = validateForm()
  if (errors.length > 0) {
    showMessage(errors.join('. '), 'error')
    return
  }

  // Collect data: skip hidden fields and hidden computed fields
  const submitData: Record<string, string> = {}
  for (const field of config.value.fields) {
    const isVisible = visibilityMap.value[field.id] ?? true
    if (!isVisible) continue
    if (field.type === 'image') continue

    const value = formData[field.id]
    if (value !== undefined) {
      submitData[field.id] = value
    }
  }

  isLoading.value = true
  try {
    const result = await sendToDiscord(config.value, submitData, formConfigStore.uploadedImages)
    if (result.success) {
      showMessage(result.message, 'success')
      // Reset form data
      for (const key of Object.keys(formData)) {
        const field = config.value.fields.find((f) => f.id === key)
        formData[key] = field?.defaultValue || ''
      }
      // Clear uploaded images
      formConfigStore.uploadedImages = []
    } else {
      showMessage(result.message, 'error')
    }
  } catch {
    showMessage('Произошла неожиданная ошибка. Попробуйте еще раз.', 'error')
  } finally {
    isLoading.value = false
  }
}

function onDocumentClick(): void {
  showDropdown.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>
