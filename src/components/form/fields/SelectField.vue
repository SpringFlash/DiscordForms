<template>
  <select
    :id="field.id"
    :name="field.id"
    :required="field.required"
    :value="modelValue"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="">Выберите вариант</option>
    <option v-for="option in field.options" :key="option.label" :value="option.value || option.label">{{ option.label }}</option>
  </select>
  <div class="input-line"></div>
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
