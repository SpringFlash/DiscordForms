import { ref, type ComputedRef, type Ref, type InjectionKey } from 'vue'
import type { FormField } from '../types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ValidationContext {
  errors: Ref<Record<string, string>>
  validateField: (fieldId: string) => boolean
  clearError: (fieldId: string) => void
}

export const VALIDATION_KEY: InjectionKey<ValidationContext> = Symbol('validation')

export interface FormValidation extends ValidationContext {
  validateAll: () => boolean
}

export function useFormValidation(
  fields: ComputedRef<FormField[]> | Ref<FormField[]>,
  formData: Record<string, string>,
  visibilityMap: Ref<Record<string, boolean>>,
  imagesCount: Ref<number>,
): FormValidation {
  const errors = ref<Record<string, string>>({})

  function clearError(fieldId: string): void {
    if (errors.value[fieldId] !== undefined) {
      const next = { ...errors.value }
      delete next[fieldId]
      errors.value = next
    }
  }

  function validateField(fieldId: string): boolean {
    const field = fields.value.find((f) => f.id === fieldId)
    if (!field) return true

    const isVisible = visibilityMap.value[fieldId] ?? true
    if (!isVisible) {
      clearError(fieldId)
      return true
    }

    if (field.type === 'computed') {
      clearError(fieldId)
      return true
    }

    const value = formData[fieldId]

    if (field.required) {
      if (field.type === 'image') {
        if (imagesCount.value === 0) {
          errors.value = { ...errors.value, [fieldId]: 'Загрузите хотя бы одно изображение' }
          return false
        }
      } else if (!value || !value.trim()) {
        errors.value = { ...errors.value, [fieldId]: 'Поле обязательно' }
        return false
      }
    }

    if (field.type === 'email' && value && value.trim() && !EMAIL_REGEX.test(value.trim())) {
      errors.value = { ...errors.value, [fieldId]: 'Некорректный email' }
      return false
    }

    clearError(fieldId)
    return true
  }

  function validateAll(): boolean {
    let allValid = true
    for (const field of fields.value) {
      const isVisible = visibilityMap.value[field.id] ?? true
      if (!isVisible) continue
      if (field.type === 'computed') continue
      const valid = validateField(field.id)
      if (!valid) allValid = false
    }
    return allValid
  }

  return { errors, validateField, clearError, validateAll }
}
