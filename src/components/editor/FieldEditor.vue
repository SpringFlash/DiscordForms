<template>
  <div class="field-item" :data-field-id="field.id">
    <div class="field-header" @click="onHeaderClick">
      <div class="field-header-left">
        <span class="field-title">{{ displayIcon }} {{ field.label }}</span>
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
      <div class="field-actions" @click.stop>
        <button
          class="field-action-btn move-up"
          title="Переместить вверх"
          @click="store.moveField(field.id, 'up'); store.updateConfig()"
        >
          <i class="fas fa-arrow-up"></i>
        </button>
        <button
          class="field-action-btn move-down"
          title="Переместить вниз"
          @click="store.moveField(field.id, 'down'); store.updateConfig()"
        >
          <i class="fas fa-arrow-down"></i>
        </button>
        <button
          class="field-action-btn clone"
          title="Клонировать"
          @click="store.cloneField(field.id); store.updateConfig()"
        >
          <i class="fas fa-clone"></i>
        </button>
        <button
          class="field-action-btn delete"
          title="Удалить"
          @click="onDelete"
        >
          <i class="fas fa-trash"></i>
        </button>
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
      <div class="field-config-item field-options" v-show="hasOptions">
        <label>Варианты (через запятую)</label>
        <input
          type="text"
          class="field-options-input"
          :value="field.options.join(', ')"
          @input="onOptionsInput"
        />
      </div>
      <ComputedFieldEditor v-if="field.type === 'computed'" :field="field" />
      <ConditionalEditor v-show="config.showAdvancedSettings" :field="field" />
      <CustomWebhookEditor v-show="config.showAdvancedSettings" :field="field" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'
import { iconMap } from '../../utils'
import EmojiPicker from '../common/EmojiPicker.vue'
import ComputedFieldEditor from './ComputedFieldEditor.vue'
import ConditionalEditor from './ConditionalEditor.vue'
import CustomWebhookEditor from './CustomWebhookEditor.vue'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()
const config = store.config

const expanded = ref(true)

const displayIcon = computed(() => {
  return iconMap[props.field.icon] || props.field.icon || '\u2753'
})

const hasOptions = computed(() => {
  return ['select', 'radio', 'checkboxes'].includes(props.field.type)
})

function onHeaderClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (
    target.closest('.field-actions') ||
    target.closest('.field-required-inline')
  )
    return
  expanded.value = !expanded.value
}

function onOptionsInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  props.field.options = value.split(',').map((s) => s.trim())
  store.updateConfig()
}

function onDelete() {
  if (confirm('Удалить это поле?')) {
    store.removeField(props.field.id)
    store.updateConfig()
  }
}
</script>
