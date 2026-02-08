<template>
  <textarea
    v-if="isMultiline"
    :id="field.id"
    :name="field.id"
    rows="3"
    readonly
    class="computed-field"
    :value="modelValue"
    tabindex="-1"
  ></textarea>
  <input
    v-else
    type="text"
    :id="field.id"
    :name="field.id"
    readonly
    class="computed-field"
    :value="modelValue"
    tabindex="-1"
  />
  <div class="input-line"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormField } from '../../../types'

const props = defineProps<{
  field: FormField
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const isMultiline = computed(() => {
  return props.field.formula.includes(',map,') || props.field.formula.includes(',lines,')
})
</script>
