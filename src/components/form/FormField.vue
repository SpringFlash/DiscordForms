<template>
  <div class="form-group" :data-field-id="field.id" v-if="isVisible">
    <label v-if="field.type !== 'checkbox' && field.type !== 'image'" :for="field.id">
      <span v-html="iconHtml"></span>
      {{ field.label }}{{ field.required ? ' *' : '' }}
    </label>
    <component :is="fieldComponent" :field="field" v-model="localValue" />
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { FormField } from '../../types'
import { getFieldIcon } from '../../utils'
import TextField from './fields/TextField.vue'
import EmailField from './fields/EmailField.vue'
import TextareaField from './fields/TextareaField.vue'
import SelectField from './fields/SelectField.vue'
import RadioField from './fields/RadioField.vue'
import CheckboxField from './fields/CheckboxField.vue'
import CheckboxesField from './fields/CheckboxesField.vue'
import ComputedField from './fields/ComputedField.vue'
import ImageField from './fields/ImageField.vue'

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
  set: (value: string) => emit('update:modelValue', value),
})
</script>
