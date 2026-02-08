<template>
  <div class="editor-header">
    <h2><i class="fas fa-cog"></i> Настройка формы</h2>
  </div>
  <div class="editor-content">
    <FormSettings />
    <div class="editor-section">
      <h3>Условные сообщения</h3>
      <p class="section-hint">
        Отправляйте разные сообщения в Discord в зависимости от выбранных значений
      </p>
      <div class="conditional-messages-list">
        <ConditionalMessageEditor
          v-for="condMsg in config.conditionalMessages"
          :key="condMsg.id"
          :cond-msg="condMsg"
        />
      </div>
      <button
        class="add-field-btn"
        @click="store.addConditionalMessage(); store.updateConfig()"
      >
        <i class="fas fa-plus"></i> Добавить условное сообщение
      </button>
    </div>
    <FieldList />
    <div class="editor-section">
      <h3>Ссылка на форму</h3>
      <div class="url-buttons-group">
        <button
          class="generate-url-btn"
          :class="{ copied: isCopied }"
          @click="onCopyLink"
        >
          <i :class="isCopied ? 'fas fa-check' : 'fas fa-copy'"></i>
          {{ isCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку на форму' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { copyToClipboard } from '../../utils'
import FormSettings from './FormSettings.vue'
import ConditionalMessageEditor from './ConditionalMessageEditor.vue'
import FieldList from './FieldList.vue'

const store = useFormConfigStore()
const config = store.config

const isCopied = ref(false)

async function onCopyLink() {
  if (!config.webhookUrl) {
    alert('Укажите Webhook URL перед генерацией ссылки')
    return
  }

  const url = store.getShareUrl()
  const success = await copyToClipboard(url)

  if (success) {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  }
}
</script>
