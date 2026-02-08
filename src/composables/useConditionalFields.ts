import { computed, type Ref } from 'vue'
import type { FormConfig } from '../types'

export function useConditionalFields(
  config: Ref<FormConfig>,
  formData: Record<string, string>,
) {
  const visibilityMap = computed<Record<string, boolean>>(() => {
    const cfg = config.value
    const map: Record<string, boolean> = {}

    for (const field of cfg.fields) {
      if (!field.conditional?.enabled || !field.conditional.conditions?.length) {
        map[field.id] = true
        continue
      }

      let allMet = true
      for (const condition of field.conditional.conditions) {
        if (!condition.field) {
          allMet = false
          break
        }

        const triggerField = cfg.fields.find((f) => f.id === condition.field)
        const currentValue = formData[condition.field] ?? ''

        let requiredValues: string[]
        try {
          const parsed: unknown = JSON.parse(condition.value)
          requiredValues = Array.isArray(parsed)
            ? (parsed as string[])
            : [condition.value]
        } catch {
          requiredValues = [condition.value]
        }

        let conditionMet: boolean
        if (triggerField?.type === 'checkboxes') {
          const selectedValues = currentValue ? currentValue.split('\n') : []
          conditionMet = selectedValues.some((v) => requiredValues.includes(v))
        } else {
          conditionMet = requiredValues.includes(currentValue)
        }

        if (!conditionMet) {
          allMet = false
          break
        }
      }

      map[field.id] = allMet
    }

    return map
  })

  return { visibilityMap }
}
