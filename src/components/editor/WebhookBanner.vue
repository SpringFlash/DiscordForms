<template>
  <div
    class="webhook-banner"
    :class="isConfigured ? 'webhook-banner--success' : 'webhook-banner--warning'"
  >
    <span class="webhook-banner__icon">{{ isConfigured ? '✓' : '⚠' }}</span>
    <span class="webhook-banner__text">
      {{ isConfigured ? 'Webhook подключён' : 'Webhook не настроен' }}
    </span>
    <div class="webhook-banner__actions">
      <button class="webhook-banner__btn webhook-banner__btn--secondary" @click="focusWebhookInput">
        {{ isConfigured ? 'Изменить' : 'Настроить →' }}
      </button>
      <button
        v-if="isConfigured"
        class="webhook-banner__btn webhook-banner__btn--primary"
        :disabled="testing"
        @click="runTest"
      >
        <span v-if="testing">Тестирую...</span>
        <span v-else>Тест</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { useToast } from '../../composables/useToast'
import { useEditorTab } from '../../composables/useEditorTab'

const store = useFormConfigStore()
const config = store.config
const toast = useToast()
const { setTab } = useEditorTab()

const testing = ref(false)

const isConfigured = computed(() => Boolean(config.webhookUrl.trim()))

async function focusWebhookInput(): Promise<void> {
  setTab('settings')
  await nextTick()
  const input = document.querySelector<HTMLInputElement>('input[data-webhook-url-input]')
  if (input) {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    input.focus()
  }
}

async function runTest(): Promise<void> {
  if (testing.value) return
  testing.value = true
  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Test message from Discord Forms 🔔' }),
    })
    if (response.ok) {
      toast.success('Тест отправлен', 'Сообщение доставлено в Discord')
    } else {
      toast.error('Тест не прошёл', 'Проверьте URL вебхука')
    }
  } catch {
    toast.error('Тест не прошёл', 'Проверьте URL вебхука')
  } finally {
    testing.value = false
  }
}
</script>
