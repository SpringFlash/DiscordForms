<template>
  <input
    type="email"
    :id="field.id"
    :name="field.id"
    :placeholder="field.placeholder"
    :required="field.required"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
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
