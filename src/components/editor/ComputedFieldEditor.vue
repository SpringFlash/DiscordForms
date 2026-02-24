<template>
  <div class="field-config-item field-formula-container" style="grid-column: 1 / -1">
    <label>Формула</label>
    <div
      ref="formulaEditorRef"
      class="formula-editor-rich"
      contenteditable="true"
      @input="onEditorInput"
      @keydown="onEditorKeydown"
      @paste="onEditorPaste"
    ></div>
    <div class="formula-hint">
      Используйте панель ниже для вставки переменных.
      Подстрока: укажите начало и конец.
    </div>
    <div class="formula-variable-panel">
      <button type="button" class="add-variable-btn" @click="showVariables = !showVariables">
        <i class="fas" :class="showVariables ? 'fa-minus' : 'fa-plus'"></i> Добавить переменную
      </button>
      <div v-if="showVariables" class="variable-selector">
        <select v-model="selectedFieldId" class="variable-field-select">
          <option value="">Выберите поле...</option>
          <option v-for="f in availableFields" :key="f.id" :value="f.id">{{ f.label }}</option>
        </select>
        <div class="variable-substring-inputs">
          <input type="number" v-model.number="substringStart" placeholder="Начало" class="variable-start-input" />
          <input type="number" v-model.number="substringEnd" placeholder="Конец" class="variable-end-input" />
        </div>
        <button type="button" class="insert-variable-btn" :disabled="!selectedFieldId" @click="insertVariable">
          <i class="fas fa-check"></i> Вставить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()

const showVariables = ref(false)
const selectedFieldId = ref('')
const substringStart = ref<number | undefined>(undefined)
const substringEnd = ref<number | undefined>(undefined)
const formulaEditorRef = ref<HTMLDivElement | null>(null)

const availableFields = computed(() => {
  return store.config.fields.filter(
    (f) => f.id !== props.field.id && f.type !== 'computed' && f.type !== 'image',
  )
})

const fieldLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const f of store.config.fields) {
    map.set(f.id, f.label || f.id)
  }
  return map
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formulaToHtml(formula: string): string {
  if (!formula) return ''
  return formula.replace(/\{([^}]+)\}/g, (match, inner: string) => {
    const parts = inner.split(',')
    const fieldId = parts[0]
    const label = fieldLabelMap.value.get(fieldId) || fieldId
    const hasParams = parts.length > 1
    const paramsText = hasParams ? ` [${parts.slice(1).join(',')}]` : ''
    return `<span class="formula-badge" data-var="${escapeHtml(match)}" contenteditable="false">${escapeHtml(label)}${hasParams ? `<span class="badge-params">${escapeHtml(paramsText)}</span>` : ''}</span>`
  })
}

function htmlToFormula(container: HTMLElement): string {
  let result = ''
  for (const node of container.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent || ''
    } else if (node instanceof HTMLElement) {
      if (node.classList.contains('formula-badge')) {
        result += node.dataset.var || ''
      } else if (node.tagName !== 'BR') {
        result += node.textContent || ''
      }
    }
  }
  return result
}

function renderFormula() {
  if (!formulaEditorRef.value) return
  formulaEditorRef.value.innerHTML = formulaToHtml(props.field.formula)
}

function onEditorInput() {
  if (!formulaEditorRef.value) return
  props.field.formula = htmlToFormula(formulaEditorRef.value)
  store.updateConfig()
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
  }
}

function onEditorPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

function createBadgeHtml(fieldId: string, params?: { start: number; end: number }): string {
  const label = fieldLabelMap.value.get(fieldId) || fieldId
  let varStr: string
  let paramsHtml = ''

  if (params) {
    varStr = `{${fieldId},${params.start},${params.end}}`
    paramsHtml = `<span class="badge-params"> [${params.start},${params.end}]</span>`
  } else {
    varStr = `{${fieldId}}`
  }

  return `<span class="formula-badge" data-var="${escapeHtml(varStr)}" contenteditable="false">${escapeHtml(label)}${paramsHtml}</span>`
}

function insertVariable() {
  if (!selectedFieldId.value) return

  const editor = formulaEditorRef.value
  if (!editor) return

  const params =
    substringStart.value !== undefined && substringEnd.value !== undefined
      ? { start: substringStart.value, end: substringEnd.value }
      : undefined

  const badgeHtml = createBadgeHtml(selectedFieldId.value, params)

  editor.focus()
  const selection = window.getSelection()
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      range.deleteContents()
      const temp = document.createElement('div')
      temp.innerHTML = badgeHtml
      const badge = temp.firstChild as Node
      range.insertNode(badge)
      range.setStartAfter(badge)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    } else {
      editor.innerHTML += badgeHtml
    }
  } else {
    editor.innerHTML += badgeHtml
  }

  props.field.formula = htmlToFormula(editor)
  store.updateConfig()

  selectedFieldId.value = ''
  substringStart.value = undefined
  substringEnd.value = undefined
  showVariables.value = false
}

watch(
  () => props.field.formula,
  (newVal) => {
    if (!formulaEditorRef.value) return
    const current = htmlToFormula(formulaEditorRef.value)
    if (current !== newVal) {
      renderFormula()
    }
  },
)

onMounted(() => {
  renderFormula()
})
</script>
