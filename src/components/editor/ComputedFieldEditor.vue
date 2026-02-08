<template>
  <div class="field-config-item field-formula-container" style="grid-column: 1 / -1">
    <label>Формула</label>
    <div class="formula-input-wrapper">
      <input
        ref="formulaInputRef"
        type="text"
        class="field-formula"
        v-model="field.formula"
        @input="store.updateConfig()"
        placeholder="Пример: {field1} - {field2,0,5}"
      />
    </div>
    <div class="formula-hint">
      Используйте <code>{'{fieldId}'}</code> для вставки значения поля или
      <code>{'{fieldId,start,end}'}</code> для подстроки.
    </div>
    <div class="formula-variable-panel">
      <button type="button" class="add-variable-btn" @click="showVariables = !showVariables">
        <i class="fas fa-plus"></i> Добавить переменную
      </button>
      <div v-if="showVariables" class="variable-selector">
        <select v-model="selectedFieldId" class="variable-field-select">
          <option value="">Выберите поле...</option>
          <option v-for="f in availableFields" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
        <div class="variable-substring-inputs">
          <input type="number" v-model.number="substringStart" placeholder="Начало" class="variable-start-input" />
          <input type="number" v-model.number="substringEnd" placeholder="Конец" class="variable-end-input" />
        </div>
        <button type="button" class="insert-variable-btn" :disabled="!selectedFieldId" @click="insertVariable">
          <i class="fas fa-check"></i> Вставить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()

const showVariables = ref(false)
const selectedFieldId = ref('')
const substringStart = ref<number | undefined>(undefined)
const substringEnd = ref<number | undefined>(undefined)
const formulaInputRef = ref<HTMLInputElement | null>(null)

const availableFields = computed(() => {
  return store.config.fields.filter(
    (f) => f.id !== props.field.id && f.type !== 'computed' && f.type !== 'image',
  )
})

function insertVariable() {
  if (!selectedFieldId.value) return

  let variable = `{${selectedFieldId.value}}`
  if (substringStart.value !== undefined && substringEnd.value !== undefined) {
    variable = `{${selectedFieldId.value},${substringStart.value},${substringEnd.value}}`
  }

  const input = formulaInputRef.value
  if (input) {
    const start = input.selectionStart ?? props.field.formula.length
    const end = input.selectionEnd ?? props.field.formula.length
    props.field.formula =
      props.field.formula.substring(0, start) + variable + props.field.formula.substring(end)
  } else {
    props.field.formula += variable
  }

  store.updateConfig()
  selectedFieldId.value = ''
  substringStart.value = undefined
  substringEnd.value = undefined
  showVariables.value = false
}
</script>
