<template>
  <div
    class="field-item"
    :class="{ 'is-dragging': isDragging, 'is-over': isOver }"
    :data-field-id="field.id"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="field-header" @click="onHeaderClick">
      <div class="field-header-left">
        <span
          class="field-drag-handle"
          draggable="true"
          title="Перетащите для изменения порядка"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
          @click.stop
        >⠿</span>
        <span
          v-if="!editing"
          class="field-title"
          @click.stop="startEdit"
        >{{ displayIcon }} {{ field.label }}</span>
        <input
          v-else
          ref="titleInput"
          class="field-title-input"
          v-model="localLabel"
          @blur="saveLabel"
          @keydown.enter.prevent="saveLabel"
          @keydown.esc.prevent="cancelLabel"
          @click.stop
        />
        <label class="field-required-inline" @click.stop>
          <input
            type="checkbox"
            class="field-required"
            v-model="field.required"
            @change="store.updateConfig()"
          />
          <span>обязательное</span>
        </label>
      </div>
      <div class="field-actions" @click.stop style="position: relative;">
        <button
          class="field-overflow-btn"
          title="Действия"
          @click.stop="overflowOpen = !overflowOpen"
        >⋯</button>
        <div v-if="overflowOpen" class="field-overflow-menu">
          <button
            class="field-overflow-item"
            @click.stop="onClone"
          >📋 Клонировать</button>
          <button
            class="field-overflow-item field-overflow-item--danger"
            @click.stop="onDelete"
          >🗑️ Удалить</button>
        </div>
      </div>
    </div>
    <div class="field-config" v-show="expanded">
      <div class="field-config-item field-label-with-icon" style="grid-column: 1 / -1">
        <div class="field-label-container">
          <div class="field-label-wrapper">
            <label>Название поля</label>
            <input
              type="text"
              class="field-label"
              v-model="field.label"
              @input="store.updateConfig()"
            />
          </div>
          <div class="field-icon-wrapper">
            <label style="visibility: hidden">Иконка</label>
            <EmojiPicker
              v-model="field.icon"
              @update:model-value="store.updateConfig()"
            />
          </div>
        </div>
      </div>
      <div class="field-config-item">
        <label>Тип поля</label>
        <select class="field-type" v-model="field.type" @change="store.updateConfig()">
          <option value="text">Текст</option>
          <option value="email">Email</option>
          <option value="textarea">Текстовая область</option>
          <option value="select">Выпадающий список</option>
          <option value="radio">Радиокнопки</option>
          <option value="checkboxes">Чекбоксы (множественный выбор)</option>
          <option value="checkbox">Чекбокс</option>
          <option value="computed">Вычисляемое поле</option>
        </select>
      </div>
      <div
        class="field-config-item field-placeholder-container"
        v-show="field.type !== 'checkbox'"
      >
        <label>Placeholder</label>
        <input
          type="text"
          class="field-placeholder"
          v-model="field.placeholder"
          @input="store.updateConfig()"
        />
      </div>
      <div
        class="field-config-item field-checkbox-text-container"
        v-show="field.type === 'checkbox'"
      >
        <label class="checkbox-text-label">
          <input
            type="checkbox"
            v-model="field.showTextInResponse"
            @change="store.updateConfig()"
          />
          <span>Показывать текст в ответе</span>
        </label>
      </div>
      <OptionsEditor v-if="hasOptions" :field="field" />
      <ComputedFieldEditor v-if="field.type === 'computed'" :field="field" />
      <ConditionalEditor v-show="config.showAdvancedSettings" :field="field" />
      <CustomWebhookEditor v-show="config.showAdvancedSettings" :field="field" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'
import { useToast } from '../../composables/useToast'
import { iconMap } from '../../utils'
import EmojiPicker from '../common/EmojiPicker.vue'
import ComputedFieldEditor from './ComputedFieldEditor.vue'
import ConditionalEditor from './ConditionalEditor.vue'
import CustomWebhookEditor from './CustomWebhookEditor.vue'
import OptionsEditor from './OptionsEditor.vue'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()
const config = store.config
const toast = useToast()

const expanded = ref(true)
const overflowOpen = ref(false)

const editing = ref(false)
const localLabel = ref(props.field.label)
const titleInput = ref<HTMLInputElement | null>(null)

const isDragging = ref(false)
const isOver = ref(false)
let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null

const displayIcon = computed(() => {
  return iconMap[props.field.icon] || props.field.icon || '❓'
})

const hasOptions = computed(() => {
  return ['select', 'radio', 'checkboxes'].includes(props.field.type)
})

function onHeaderClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (
    target.closest('.field-actions') ||
    target.closest('.field-required-inline') ||
    target.closest('.field-drag-handle') ||
    target.closest('.field-title-input')
  )
    return
  expanded.value = !expanded.value
}

function startEdit() {
  localLabel.value = props.field.label
  editing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

function saveLabel() {
  const trimmed = localLabel.value.trim()
  if (trimmed) {
    props.field.label = trimmed
    store.updateConfig()
  } else {
    localLabel.value = props.field.label
  }
  editing.value = false
}

function cancelLabel() {
  localLabel.value = props.field.label
  editing.value = false
}

function onClone() {
  overflowOpen.value = false
  store.cloneField(props.field.id)
  store.updateConfig()
}

function onDelete() {
  overflowOpen.value = false
  const index = config.fields.findIndex((f) => f.id === props.field.id)
  const removed = JSON.parse(JSON.stringify(props.field)) as FormField
  store.removeField(props.field.id)
  store.updateConfig()
  toast.show({
    type: 'warning',
    title: 'Поле удалено',
    description: removed.label,
    duration: 5000,
    action: {
      label: 'Отменить',
      onClick: () => {
        store.restoreField(removed, index)
        store.updateConfig()
      },
    },
  })
}

function onDragStart(e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('text/plain', props.field.id)
  e.dataTransfer.effectAllowed = 'move'
  isDragging.value = true
}

function onDragEnd() {
  isDragging.value = false
}

function onDragOver(e: DragEvent) {
  if (!e.dataTransfer) return
  e.dataTransfer.dropEffect = 'move'
  if (dragLeaveTimer !== null) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }
  isOver.value = true
}

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  if (dragLeaveTimer !== null) {
    clearTimeout(dragLeaveTimer)
    dragLeaveTimer = null
  }
  isOver.value = true
}

function onDragLeave() {
  dragLeaveTimer = setTimeout(() => {
    isOver.value = false
    dragLeaveTimer = null
  }, 50)
}

function onDrop(e: DragEvent) {
  isOver.value = false
  if (!e.dataTransfer) return
  const fromId = e.dataTransfer.getData('text/plain')
  if (!fromId || fromId === props.field.id) return
  const fields = config.fields
  const fromIndex = fields.findIndex((f) => f.id === fromId)
  const toIndex = fields.findIndex((f) => f.id === props.field.id)
  if (fromIndex === -1 || toIndex === -1) return
  store.reorderFields(fromIndex, toIndex)
  store.updateConfig()
}

function onOutsideClick(e: MouseEvent) {
  if (!overflowOpen.value) return
  const target = e.target as HTMLElement
  if (!target.closest('.field-actions')) {
    overflowOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
  if (dragLeaveTimer !== null) clearTimeout(dragLeaveTimer)
})
</script>
