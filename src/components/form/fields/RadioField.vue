<template>
  <div class="radio-group">
    <label v-for="option in field.options" :key="option.label" class="radio-label">
      <input
        type="radio"
        :name="field.id"
        :value="option.value || option.label"
        :checked="modelValue === (option.value || option.label)"
        @change="emit('update:modelValue', option.value || option.label)"
      />
      <span class="radio-custom"></span>
      {{ option.label }}
    </label>
  </div>
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
