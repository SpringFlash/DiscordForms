<template>
  <div class="field-config-item field-options-editor" style="grid-column: 1 / -1">
    <label>Options</label>
    <div class="options-list">
      <div v-for="(option, index) in field.options" :key="index" class="option-row">
        <input
          type="text"
          class="option-label-input"
          v-model="option.label"
          placeholder="Label"
          @input="store.updateConfig()"
        />
        <button
          type="button"
          class="option-value-toggle"
          :class="{ active: expandedValues.has(index) }"
          :title="expandedValues.has(index) ? 'Hide value' : 'Set custom value'"
          @click="toggleValue(index)"
        >
          <i class="fas fa-tag"></i>
        </button>
        <input
          v-if="expandedValues.has(index)"
          type="text"
          class="option-value-input"
          v-model="option.value"
          placeholder="= label if empty"
          @input="store.updateConfig()"
        />
        <button
          type="button"
          class="field-action-btn delete option-delete-btn"
          title="Remove option"
          @click="removeOption(index)"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <button type="button" class="add-option-btn" @click="addOption">
      <i class="fas fa-plus"></i> Add option
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()

const expandedValues = reactive(new Set<number>())

// Show value inputs for options that already have a custom value
for (let i = 0; i < props.field.options.length; i++) {
  if (props.field.options[i]!.value) {
    expandedValues.add(i)
  }
}

function toggleValue(index: number) {
  if (expandedValues.has(index)) {
    expandedValues.delete(index)
  } else {
    expandedValues.add(index)
  }
}

function addOption() {
  props.field.options.push({ label: '', value: '' })
  store.updateConfig()
}

function removeOption(index: number) {
  props.field.options.splice(index, 1)
  expandedValues.delete(index)
  // Rebuild expanded set since indices shifted
  const newExpanded = new Set<number>()
  for (const i of expandedValues) {
    if (i > index) {
      newExpanded.add(i - 1)
    } else {
      newExpanded.add(i)
    }
  }
  expandedValues.clear()
  for (const i of newExpanded) {
    expandedValues.add(i)
  }
  store.updateConfig()
}
</script>

<style scoped>
.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.option-label-input {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.85rem;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.option-value-input {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.85rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  border-style: dashed;
}

.option-value-toggle {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: color 0.15s, border-color 0.15s;
}

.option-value-toggle:hover,
.option-value-toggle.active {
  color: var(--accent-color);
  border-color: var(--accent-color);
}

.option-delete-btn {
  flex-shrink: 0;
  padding: 0.35rem 0.5rem;
}

.add-option-btn {
  margin-top: 0.35rem;
  padding: 0.4rem 0.75rem;
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: color 0.15s, border-color 0.15s;
}

.add-option-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
}
</style>
