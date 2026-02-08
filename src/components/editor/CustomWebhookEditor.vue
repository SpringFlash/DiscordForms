<template>
  <div class="field-config-item field-custom-webhook-container" style="grid-column: 1 / -1">
    <div class="custom-webhook-section-header" @click="onHeaderClick">
      <label class="custom-webhook-checkbox-label-header" @click.stop>
        <input type="checkbox" :checked="isEnabled" @change="onToggleEnabled" />
        <span>Кастомная отправка</span>
      </label>
      <i class="fas fa-chevron-down custom-webhook-toggle-icon" :class="{ open: isOpen }"></i>
    </div>
    <div class="custom-webhook-config" v-show="isOpen">
      <div class="custom-webhook-hint">Отправлять форму с этим полем на отдельный webhook:</div>
      <input
        type="url"
        class="custom-webhook-url-input"
        :value="field.customWebhook?.url ?? ''"
        @input="onUrlInput"
        :disabled="!isEnabled"
        placeholder="https://discord.com/api/webhooks/..."
      />
      <label
        class="custom-webhook-split-lines"
        v-show="field.type === 'textarea' || field.type === 'computed'"
      >
        <input
          type="checkbox"
          :checked="field.customWebhook?.splitLines ?? false"
          @change="onSplitLinesChange"
          :disabled="!isEnabled"
        />
        <span>Каждая строка отдельным сообщением</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FormField } from '../../types'
import { useFormConfigStore } from '../../stores/formConfig'

const props = defineProps<{
  field: FormField
}>()

const store = useFormConfigStore()
const isOpen = ref(false)

const isEnabled = computed(() => props.field.customWebhook?.enabled ?? false)

function ensureCustomWebhook() {
  if (!props.field.customWebhook) {
    props.field.customWebhook = {
      enabled: false,
      url: '',
      splitLines: false,
    }
  }
}

function onHeaderClick() {
  isOpen.value = !isOpen.value
}

function onToggleEnabled(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  ensureCustomWebhook()
  props.field.customWebhook!.enabled = checked
  if (checked) {
    isOpen.value = true
  }
  store.updateConfig()
}

function onUrlInput(e: Event) {
  ensureCustomWebhook()
  props.field.customWebhook!.url = (e.target as HTMLInputElement).value
  store.updateConfig()
}

function onSplitLinesChange(e: Event) {
  ensureCustomWebhook()
  props.field.customWebhook!.splitLines = (e.target as HTMLInputElement).checked
  store.updateConfig()
}
</script>
