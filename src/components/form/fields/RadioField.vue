<template>
  <div class="radio-group">
    <label v-for="option in field.options" :key="option" class="radio-label">
      <input
        type="radio"
        :name="field.id"
        :value="option"
        :checked="modelValue === option"
        @change="emit('update:modelValue', option)"
      />
      <span class="radio-custom"></span>
      {{ option }}
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
