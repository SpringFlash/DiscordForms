<template>
  <div class="checkboxes-group">
    <label v-for="option in field.options" :key="option.label" class="checkboxes-item-label">
      <input
        type="checkbox"
        :name="field.id"
        :value="option.value || option.label"
        :checked="selectedValues.includes(option.value || option.label)"
        @change="onToggle(option.value || option.label, ($event.target as HTMLInputElement).checked)"
      />
      <span class="checkbox-custom"></span>
      {{ option.label }}
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '../../../types'

const props = defineProps<{
  field: FormField
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedValues = computed(() => {
  return props.modelValue ? props.modelValue.split('\n').filter(Boolean) : []
})

function onToggle(option: string, checked: boolean): void {
  const current = selectedValues.value.slice()
  if (checked) {
    if (!current.includes(option)) {
      current.push(option)
    }
  } else {
    const idx = current.indexOf(option)
    if (idx !== -1) {
      current.splice(idx, 1)
    }
  }
  emit('update:modelValue', current.join('\n'))
}
</script>
