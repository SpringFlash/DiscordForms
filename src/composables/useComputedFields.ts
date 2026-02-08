import { watch } from 'vue'
import type { FormConfig, FormField } from '../types'

export function calculateFormula(
  formula: string,
  formData: Record<string, string>,
  fields: FormField[],
): string {
  if (!formula) return ''

  let result = formula
  const matches = formula.match(/\{([^}]+)\}/g)

  if (!matches) return result

  for (const match of matches) {
    const content = match.slice(1, -1)
    const parts = content.split(',').map((p) => p.trim())
    const fieldId = parts[0]
    let value = ''

    const fieldConfig = fields.find((f) => f.id === fieldId)
    if (!fieldConfig) {
      result = result.replace(match, value)
      continue
    }

    const rawValue = formData[fieldId] ?? ''

    if (fieldConfig.type === 'checkboxes') {
      value = rawValue
    } else if (fieldConfig.type === 'checkbox') {
      value = rawValue === 'on' ? '\u0414\u0430' : '\u041d\u0435\u0442'
    } else if (fieldConfig.type === 'radio') {
      value = rawValue
    } else {
      value = rawValue
    }

    if (parts.length > 1) {
      const operation = parts[1]

      if (operation === 'count') {
        value = value
          .split('\n')
          .filter((line) => line.trim())
          .length.toString()
      } else if (operation === 'line') {
        const lineIndex = parseInt(parts[2])
        const lines = value.split('\n').filter((line) => line.trim())
        value =
          lineIndex < 0
            ? lines[lines.length + lineIndex] || ''
            : lines[lineIndex] || ''
      } else if (operation === 'lines') {
        const lines = value.split('\n').filter((line) => line.trim())
        const separator = parts.length > 2 ? parts[2] : ', '
        value = lines.join(separator)
      } else if (operation === 'map') {
        value = processMapOperation(parts, value, formData)
      } else {
        const startIndex = parseInt(parts[1])
        const endIndex = parts.length > 2 ? parseInt(parts[2]) : null
        if (value && !isNaN(startIndex)) {
          value =
            endIndex !== null && !isNaN(endIndex)
              ? value.substring(startIndex, endIndex)
              : value.substring(startIndex)
        }
      }
    }

    result = result.replace(match, value)
  }

  return result
}

function processMapOperation(
  parts: string[],
  value: string,
  formData: Record<string, string>,
): string {
  if (parts.length < 3) return ''

  let mapExpression = parts.slice(2).join(',')

  if (
    mapExpression.match(/^["']/) &&
    mapExpression.match(/["']$/)
  ) {
    mapExpression = mapExpression.slice(1, -1)
  }

  if (
    mapExpression.startsWith("\\'") &&
    mapExpression.endsWith("\\'")
  ) {
    mapExpression = mapExpression.slice(2, -2)
  } else if (
    mapExpression.startsWith('\\"') &&
    mapExpression.endsWith('\\"')
  ) {
    mapExpression = mapExpression.slice(2, -2)
  }

  const lines = value.split('\n').filter((line) => line.trim())

  const mappedLines = lines.map((line) => {
    let lineExpression = mapExpression.replace(/\[line\]/g, line)

    const lineMatches = lineExpression.match(/\{([^}]+)\}/g)
    if (lineMatches) {
      for (const lineMatch of lineMatches) {
        const lineContent = lineMatch.slice(1, -1)
        const lineParts = lineContent.split(',').map((p) => p.trim())

        if (lineParts.length === 1 && lineParts[0] !== 'line') {
          const otherValue = formData[lineParts[0]] || ''
          lineExpression = lineExpression.replace(lineMatch, otherValue)
        } else if (lineParts.length >= 2) {
          const lineOp = lineParts[1]
          let lineValue = line

          if (lineOp === 'length') {
            lineValue = line.length.toString()
          } else if (lineOp === 'upper') {
            lineValue = line.toUpperCase()
          } else if (lineOp === 'lower') {
            lineValue = line.toLowerCase()
          } else if (lineOp === 'trim') {
            lineValue = line.trim()
          } else if (!isNaN(parseInt(lineOp))) {
            const startIdx = parseInt(lineOp)
            const endIdx =
              lineParts.length > 2 ? parseInt(lineParts[2]) : null
            lineValue =
              endIdx !== null
                ? line.substring(startIdx, endIdx)
                : line.substring(startIdx)
          }

          lineExpression = lineExpression.replace(lineMatch, lineValue)
        }
      }
    }

    return lineExpression
  })

  return mappedLines.join('\n')
}

export function useComputedFields(
  config: FormConfig,
  formData: Record<string, string>,
): void {
  watch(
    () => ({ ...formData }),
    () => {
      for (const field of config.fields) {
        if (field.type === 'computed' && field.formula) {
          formData[field.id] = calculateFormula(
            field.formula,
            formData,
            config.fields,
          )
        }
      }
    },
    { deep: true },
  )
}
