<template>
  <div class="editor-section">
    <h3>Основные настройки</h3>
    <div class="setting-group">
      <label>Название формы</label>
      <input
        type="text"
        v-model="config.title"
        @input="store.updateConfig()"
        placeholder="Название формы"
      />
    </div>
    <div class="setting-group">
      <label>Описание</label>
      <textarea
        v-model="config.description"
        @input="store.updateConfig()"
        placeholder="Описание формы"
        rows="2"
      ></textarea>
    </div>
    <div class="setting-group">
      <label>Webhook URL</label>
      <input
        type="url"
        v-model="config.webhookUrl"
        @input="store.updateConfig()"
        placeholder="https://discord.com/api/webhooks/..."
        data-webhook-url-input
      />
    </div>
    <div class="setting-group">
      <label>Имя пользователя Webhook</label>
      <input
        type="text"
        v-model="config.webhookUsername"
        @input="store.updateConfig()"
        placeholder="Имя бота"
      />
    </div>
    <div class="setting-group">
      <label class="checkbox-setting">
        <input
          type="checkbox"
          v-model="config.displayUsername"
          @change="store.updateConfig()"
        />
        <span>Показывать имя пользователя</span>
      </label>
    </div>
    <div class="setting-group">
      <label>Аватар Webhook (URL)</label>
      <input
        type="url"
        v-model="config.webhookAvatarUrl"
        @input="store.updateConfig()"
        placeholder="https://example.com/avatar.png"
      />
    </div>
    <div class="setting-group">
      <label class="checkbox-setting">
        <input
          type="checkbox"
          v-model="config.sendAsPlainText"
          @change="store.updateConfig()"
        />
        <span>Отправлять как простой текст</span>
      </label>
    </div>
    <div class="setting-group">
      <label>Организация</label>
      <div class="org-picker-grid" role="radiogroup">
        <div
          v-for="org in organizations"
          :key="org.code"
          class="org-picker-card"
          :class="{ 'org-picker-card--active': config.organization === org.code }"
          role="radio"
          :aria-checked="config.organization === org.code"
          tabindex="0"
          @click="selectOrg(org.code)"
          @keydown.enter="selectOrg(org.code)"
          @keydown.space.prevent="selectOrg(org.code)"
        >
          <img
            class="org-picker-img"
            :src="`${baseUrl}images/${org.code}.png`"
            :alt="org.name"
            loading="lazy"
          />
          <div class="org-picker-label">{{ org.code }}</div>
          <div class="org-picker-check">✓</div>
        </div>
      </div>
    </div>
    <div class="setting-group">
      <label>Кастомное сообщение</label>
      <textarea
        v-model="config.customMessage"
        @input="store.updateConfig()"
        placeholder="Дополнительное сообщение в Discord..."
        rows="3"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormConfigStore } from '../../stores/formConfig'

const store = useFormConfigStore()
const config = store.config
const baseUrl = import.meta.env.BASE_URL

const organizations = [
  { code: 'LSPD', name: 'LSPD' },
  { code: 'LSSD', name: 'LSSD' },
  { code: 'WN', name: 'WN' },
  { code: 'EMS', name: 'EMS' },
]

function selectOrg(code: string): void {
  config.organization = code
  store.updateConfig()
}
</script>
