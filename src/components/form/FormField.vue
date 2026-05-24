<template>
  <div
    class="form-group"
    :class="{ 'has-error': !!error }"
    :data-field-id="field.id"
    v-if="isVisible"
    @focusout="onFocusOut"
  >
    <label v-if="field.type !== 'checkbox'" :for="field.id">
      <span v-html="field.type === 'image' ? '🖼️' : iconHtml"></span>
      {{ field.label }}{{ field.required ? ' *' : '' }}
    </label>
    <component :is="fieldComponent" :field="field" v-model="localValue" />
    <div v-if="error" class="field-error">✗ {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { FormField } from '../../types'
import { getFieldIcon } from '../../utils'
import { VALIDATION_KEY } from '../../composables/useFormValidation'
import TextField from './fields/TextField.vue'
import EmailField from './fields/EmailField.vue'
import TextareaField from './fields/TextareaField.vue'
import SelectField from './fields/SelectField.vue'
import RadioField from './fields/RadioField.vue'
import CheckboxField from './fields/CheckboxField.vue'
import CheckboxesField from './fields/CheckboxesField.vue'
import ComputedField from './fields/ComputedField.vue'
import ImageField from './fields/ImageField.vue'
import type { Component } from 'vue'

const props = withDefaults(
  defineProps<{
    field: FormField
    modelValue: string
    isVisible?: boolean
  }>(),
  {
    isVisible: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { errors, validateField, clearError } = inject(VALIDATION_KEY, {
  errors: ref<Record<string, string>>({}),
  validateField: () => true,
  clearError: () => {},
})

const error = computed(() => errors.value[props.field.id])

const iconHtml = computed(() => getFieldIcon(props.field.icon))

const fieldComponentMap: Record<string, Component> = {
  text: TextField,
  email: EmailField,
  textarea: TextareaField,
  select: SelectField,
  radio: RadioField,
  checkbox: CheckboxField,
  checkboxes: CheckboxesField,
  computed: ComputedField,
  image: ImageField,
}

const fieldComponent = computed(() => {
  return fieldComponentMap[props.field.type] || TextField
})

const localValue = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    clearError(props.field.id)
    emit('update:modelValue', value)
  },
})

function onFocusOut(): void {
  validateField(props.field.id)
}
</script>
