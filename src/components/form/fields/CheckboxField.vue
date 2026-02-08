<template>
  <label class="checkbox-label">
    <input
      type="checkbox"
      :id="field.id"
      :name="field.id"
      :checked="modelValue === 'on'"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked ? 'on' : '')"
    />
    <span class="checkbox-custom"></span>
    {{ field.label }}
  </label>
</template>

<script setup lang="ts">
import type { FormField } from '../../../types'

defineProps<{
  field: FormField
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
