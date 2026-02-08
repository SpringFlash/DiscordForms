<template>
  <div class="field-config-item field-conditional-container" style="grid-column: 1 / -1">
    <div class="conditional-section-header" @click="onHeaderClick">
      <label class="conditional-checkbox-label-header" @click.stop>
        <input
          type="checkbox"
          class="conditional-enabled-checkbox"
          :checked="isEnabled"
          @change="onToggleEnabled"
        />
        <span>Условная видимость</span>
      </label>
      <i
        class="fas fa-chevron-down conditional-toggle-icon"
        :class="{ open: isOpen }"
      ></i>
    </div>
    <div class="conditional-config" v-show="isOpen">
      <div class="conditional-hint">
        Показывать это поле только если выполняются все условия:
      </div>
      <div class="conditional-conditions-list">
        <div
          v-for="(condition, index) in conditions"
          :key="index"
          class="conditional-condition-item"
        >
          <div class="conditional-row">
            <select
              class="conditional-field-select"
              v-model="condition.field"
              @change="onConditionFieldChange(condition)"
              :disabled="!isEnabled"
            >
              <option value="">Выберите поле...</option>
              <option v-for="f in availableFields" :key="f.id" :value="f.id">
                {{ f.label }}
              </option>
            </select>
            включает
            <div class="conditional-value-container">
              <div
                v-if="getFieldOptions(condition.field).length > 0"
                class="conditional-checkboxes"
              >
                <label
                  v-for="opt in getFieldOptions(condition.field)"
                  :key="opt"
                  class="conditional-checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="opt"
                    :checked="getConditionValues(condition).includes(opt)"
                    @change="onConditionValueToggle(condition, opt, $event)"
                    :disabled="!isEnabled"
                  />
                  {{ opt }}
                </label>
              </div>
              <input
                v-else
                type="text"
                class="conditional-value-input"
                v-model="condition.value"
                @input="store.updateConfig()"
                :disabled="!isEnabled"
                placeholder="Значение"
              />
            </div>
          </div>
          <button
            type="button"
            class="field-action-btn delete"
            @click="removeCondition(index)"
            :disabled="!isEnabled"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <button
        type="button"
        class="add-conditional-condition-btn"
        :disabled="!isEnabled"
        @click="addCondition"
      >
        <i class="fas fa-plus"></i> Добавить условие
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormField, ConditionalCondition } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()
const isOpen = ref(false)

const isEnabled = computed(() => props.field.conditional?.enabled ?? false)

const conditions = computed(() => props.field.conditional?.conditions ?? [])

const availableFields = computed(() => {
  return store.config.fields.filter(
    (f) =>
      f.id !== props.field.id &&
      ['select', 'radio', 'checkboxes'].includes(f.type),
  )
})

function getFieldOptions(fieldId: string): string[] {
  const f = store.config.fields.find((field) => field.id === fieldId)
  return f?.options ?? []
}

function getConditionValues(condition: ConditionalCondition): string[] {
  if (!condition.value) return []
  try {
    const parsed: unknown = JSON.parse(condition.value)
    if (Array.isArray(parsed)) return parsed as string[]
    return [condition.value]
  } catch {
    return [condition.value]
  }
}

function onConditionValueToggle(
  condition: ConditionalCondition,
  opt: string,
  event: Event,
) {
  const checked = (event.target as HTMLInputElement).checked
  const values = getConditionValues(condition)
  if (checked) {
    values.push(opt)
  } else {
    const idx = values.indexOf(opt)
    if (idx !== -1) values.splice(idx, 1)
  }
  condition.value = JSON.stringify(values)
  store.updateConfig()
}

function onHeaderClick() {
  isOpen.value = !isOpen.value
}

function onToggleEnabled(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!props.field.conditional) {
    props.field.conditional = {
      enabled: checked,
      conditions: [],
    }
  } else {
    props.field.conditional.enabled = checked
  }
  if (checked) {
    isOpen.value = true
  }
  store.updateConfig()
}

function addCondition() {
  if (!props.field.conditional) {
    props.field.conditional = {
      enabled: true,
      conditions: [],
    }
  }
  props.field.conditional.conditions.push({ field: '', value: '' })
  store.updateConfig()
}

function removeCondition(index: number) {
  if (props.field.conditional) {
    props.field.conditional.conditions.splice(index, 1)
    store.updateConfig()
  }
}

function onConditionFieldChange(condition: ConditionalCondition) {
  condition.value = ''
  store.updateConfig()
}
</script>
