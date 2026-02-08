<template>
  <div
    class="image-upload-zone"
    @click="onZoneClick"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
    :class="{ 'drag-over': isDragging }"
  >
    <div class="image-upload-zone-icon"><i class="fas fa-cloud-upload-alt"></i></div>
    <div class="image-upload-zone-text">Перетащите картинки сюда</div>
    <div class="image-upload-btn">Выбрать файлы</div>
    <div class="image-upload-zone-hint">Или вставьте из буфера (Ctrl+V)</div>
    <input
      ref="fileInputRef"
      type="file"
      class="image-file-input"
      accept="image/*"
      multiple
      @change="onFileInputChange"
    />
  </div>
  <div class="image-preview-container">
    <div class="image-preview-counter" v-show="store.uploadedImages.length > 0">
      Загружено: <span>{{ store.uploadedImages.length }}</span> из {{ field.maxFiles }}
    </div>
    <div class="image-preview-grid">
      <div v-for="(file, index) in store.uploadedImages" :key="index" class="image-preview-item">
        <img :src="getObjectUrl(file)" />
        <button type="button" class="image-preview-remove" @click.stop="removeImage(index)">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { FormField } from '../../../types'
import { useFormConfigStore } from '../../../stores/formConfig'

const props = defineProps<{
  field: FormField
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const store = useFormConfigStore()
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const objectUrls = ref<string[]>([])

function onZoneClick(): void {
  fileInputRef.value?.click()
}

function onFileInputChange(event: Event): void {
  const target = event.target as HTMLInputElement
  if (target.files) {
    addFiles(target.files)
    target.value = ''
  }
}

function onDrop(event: DragEvent): void {
  isDragging.value = false
  if (event.dataTransfer?.files) {
    addFiles(event.dataTransfer.files)
  }
}

function addFiles(files: FileList): void {
  const maxFiles = props.field.maxFiles || 10
  const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))

  for (const file of imageFiles) {
    if (store.uploadedImages.length >= maxFiles) break
    store.uploadedImages.push(file)
  }
}

function removeImage(index: number): void {
  const url = objectUrls.value[index]
  if (url) {
    URL.revokeObjectURL(url)
    objectUrls.value.splice(index, 1)
  }
  store.uploadedImages.splice(index, 1)
}

function getObjectUrl(file: File): string {
  const existingIndex = store.uploadedImages.indexOf(file)
  if (existingIndex !== -1 && objectUrls.value[existingIndex]) {
    return objectUrls.value[existingIndex]
  }
  const url = URL.createObjectURL(file)
  if (existingIndex !== -1) {
    objectUrls.value[existingIndex] = url
  } else {
    objectUrls.value.push(url)
  }
  return url
}

function onPaste(event: ClipboardEvent): void {
  if (!event.clipboardData?.files.length) return
  addFiles(event.clipboardData.files)
}

onMounted(() => {
  document.addEventListener('paste', onPaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', onPaste)
  objectUrls.value.forEach((url) => URL.revokeObjectURL(url))
})
</script>
