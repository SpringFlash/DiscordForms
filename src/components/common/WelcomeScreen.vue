<template>
  <div class="welcome-screen">
    <div class="welcome-kicker">GTA 5 RP · FORMS</div>
    <h1 class="welcome-title">Отправка в Discord одним кликом</h1>
    <p class="welcome-subtitle">Кастомные формы для вашей организации</p>

    <div class="welcome-templates-grid">
      <button
        v-for="tpl in templates"
        :key="tpl.id"
        class="welcome-template-card"
        @click="onTemplate(tpl)"
      >
        <div class="welcome-template-icon">{{ tpl.icon }}</div>
        <div class="welcome-template-name">{{ tpl.name }}</div>
        <div class="welcome-template-meta">{{ tpl.fieldCount }} {{ pluralFields(tpl.fieldCount) }}</div>
        <div class="welcome-template-desc">{{ tpl.description }}</div>
      </button>
    </div>

    <button class="welcome-create-empty" @click="$emit('create')">
      + Создать пустую форму
    </button>

    <div v-if="history.length > 0" class="welcome-history">
      <div class="welcome-history-title">Недавние формы</div>
      <ul class="welcome-history-list">
        <li v-for="entry in history" :key="entry.url" class="welcome-history-item">
          <a :href="entry.url" class="welcome-history-link">
            <span class="welcome-history-name">{{ entry.title }}</span>
            <span class="welcome-history-org">· {{ entry.organization }}</span>
            <span class="welcome-history-time">{{ formatTime(entry.savedAt) }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formTemplates } from '../../utils/formTemplates'
import type { FormTemplate } from '../../utils/formTemplates'
import { loadHistory } from '../../utils/formHistory'
import { useFormConfigStore } from '../../stores/formConfig'
import { useUiStore } from '../../stores/ui'

defineEmits<{
  create: []
}>()

const store = useFormConfigStore()
const uiStore = useUiStore()

const templates = formTemplates
const history = ref(loadHistory())

function onTemplate(tpl: FormTemplate): void {
  store.applyTemplate(tpl.build())
  uiStore.setMode('editor')
}

function pluralFields(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'полей'
  if (mod10 === 1) return 'поле'
  if (mod10 >= 2 && mod10 <= 4) return 'поля'
  return 'полей'
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 2) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`
  if (hours === 1) return 'час назад'
  if (hours < 24) return `${hours} ч. назад`
  if (days === 1) return 'вчера'
  return `${days} дн. назад`
}
</script>
