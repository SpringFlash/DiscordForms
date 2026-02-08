<template>
  <div class="conditional-message-item" :data-cond-msg-id="condMsg.id">
    <div class="condmsg-header">
      <span class="condmsg-title">&#x1F4AC; Условное сообщение</span>
      <button class="field-action-btn delete" @click="onDelete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="condmsg-config">
      <div class="condmsg-condition">
        <label>Когда поле:</label>
        <select
          class="condmsg-field-select"
          v-model="condMsg.field"
          @change="onFieldChange"
        >
          <option value="">Выберите поле...</option>
          <option v-for="f in selectableFields" :key="f.id" :value="f.id">
            {{ f.label }}
          </option>
        </select>
        <span>включает</span>
        <div class="condmsg-value-container">
          <div
            v-if="fieldOptions.length > 0"
            class="conditional-checkboxes"
          >
            <label
              v-for="opt in fieldOptions"
              :key="opt"
              class="conditional-checkbox-label"
            >
              <input
                type="checkbox"
                :value="opt"
                :checked="conditionValues.includes(opt)"
                @change="onValueToggle(opt, $event)"
              />
              {{ opt }}
            </label>
          </div>
          <input
            v-else
            type="text"
            class="condmsg-value-input"
            v-model="condMsg.value"
            @input="store.updateConfig()"
            placeholder="Значение"
          />
        </div>
      </div>
      <div class="condmsg-message-input">
        <label>Отправить сообщение:</label>
        <textarea
          class="condmsg-message-textarea"
          rows="3"
          v-model="condMsg.message"
          @input="store.updateConfig()"
          placeholder="Введите кастомное сообщение для Discord..."
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ConditionalMessage } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  condMsg: ConditionalMessage
}>()

const store = useFormConfigStore()

const selectableFields = computed(() => {
  return store.config.fields.filter((f) =>
    ['select', 'radio', 'checkboxes'].includes(f.type),
  )
})

const fieldOptions = computed(() => {
  if (!props.condMsg.field) return []
  const f = store.config.fields.find(
    (field) => field.id === props.condMsg.field,
  )
  return f?.options ?? []
})

const conditionValues = computed(() => {
  if (!props.condMsg.value) return [] as string[]
  try {
    const parsed: unknown = JSON.parse(props.condMsg.value)
    if (Array.isArray(parsed)) return parsed as string[]
    return [props.condMsg.value]
  } catch {
    return [props.condMsg.value]
  }
})

function onValueToggle(opt: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const values = [...conditionValues.value]
  if (checked) {
    values.push(opt)
  } else {
    const idx = values.indexOf(opt)
    if (idx !== -1) values.splice(idx, 1)
  }
  props.condMsg.value = JSON.stringify(values)
  store.updateConfig()
}

function onFieldChange() {
  props.condMsg.value = ''
  store.updateConfig()
}

function onDelete() {
  store.removeConditionalMessage(props.condMsg.id)
  store.updateConfig()
}
</script>
