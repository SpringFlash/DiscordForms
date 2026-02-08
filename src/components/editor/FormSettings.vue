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
      <select v-model="config.organization" @change="store.updateConfig()">
        <option value="LSPD">LSPD</option>
        <option value="LSSD">LSSD</option>
        <option value="WN">WN</option>
        <option value="EMS">EMS</option>
      </select>
    </div>
    <div class="setting-group">
      <label>Тема оформления</label>
      <ThemeToggle />
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
import ThemeToggle from '../common/ThemeToggle.vue'

const store = useFormConfigStore()
const config = store.config
</script>
