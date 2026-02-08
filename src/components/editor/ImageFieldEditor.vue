<template>
  <div class="field-item" :data-field-id="field.id">
    <div class="field-header" @click="onHeaderClick">
      <div class="field-header-left">
        <span class="field-title">&#x1F5BC;&#xFE0F; {{ field.label }}</span>
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
          class="field-action-btn delete"
          title="Удалить"
          @click="onDelete"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="field-config" v-show="expanded">
      <div class="field-config-item" style="grid-column: 1 / -1">
        <label>Название поля</label>
        <input
          type="text"
          class="field-label"
          v-model="field.label"
          @input="store.updateConfig()"
        />
      </div>
      <div class="field-config-item">
        <label>Максимум файлов</label>
        <select v-model.number="field.maxFiles" @change="store.updateConfig()">
          <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>
      <ConditionalEditor :field="field" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'
import ConditionalEditor from './ConditionalEditor.vue'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()
const expanded = ref(true)

function onHeaderClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.field-actions') || target.closest('.field-required-inline')) return
  expanded.value = !expanded.value
}

function onDelete() {
  if (confirm('Удалить это поле?')) {
    store.removeField(props.field.id)
    store.updateConfig()
  }
}
</script>
