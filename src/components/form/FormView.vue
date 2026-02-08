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
      v-model="formData[field.id]"
      :is-visible="true"
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
const showDropdown = ref(false)
const isLoading = ref(false)
const responseText = ref('')
const responseType = ref<'success' | 'error'>('success')
const responseVisible = ref(false)

let hideTimeout: ReturnType<typeof setTimeout> | undefined

const orgLogoSrc = computed(() => {
  return `${import.meta.env.BASE_URL}images/${config.value.organization}.png`
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

function onSubmit(): void {
  // Validate required fields
  for (const field of config.value.fields) {
    if (field.required && field.type !== 'image') {
      const value = formData[field.id]
      if (!value || !value.trim()) {
        showMessage(`Поле "${field.label}" обязательно для заполнения`, 'error')
        return
      }
    }
  }

  showMessage('Форма успешно отправлена!', 'success')
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
