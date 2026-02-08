<template>
  <div class="editor-section">
    <div class="section-header-with-toggle">
      <h3>Поля формы</h3>
      <label class="advanced-settings-toggle">
        <input
          type="checkbox"
          v-model="config.showAdvancedSettings"
          @change="store.updateConfig()"
        />
        <span class="toggle-text">Расширенные настройки</span>
      </label>
    </div>
    <div class="fields-list">
      <template v-for="field in config.fields" :key="field.id">
        <ImageFieldEditor v-if="field.type === 'image'" :field="field" />
        <FieldEditor v-else :field="field" />
      </template>
    </div>
    <button
      class="add-field-btn"
      @click="store.addField(); store.updateConfig()"
    >
      <i class="fas fa-plus"></i> Добавить поле
    </button>
    <button
      v-if="!store.hasImageField()"
      class="add-field-btn add-image-field-btn"
      @click="store.addImageField(); store.updateConfig()"
    >
      <i class="fas fa-image"></i> Добавить поле для картинок
    </button>
    <div class="setting-group" style="margin-top: 16px">
      <label class="checkbox-setting">
        <input
          type="checkbox"
          v-model="config.sendQuestionNumbers"
          @change="store.updateConfig()"
        />
        <span>Отправлять номера вопросов</span>
      </label>
    </div>
    <div class="setting-group">
      <label class="checkbox-setting">
        <input
          type="checkbox"
          v-model="config.sendEmojis"
          @change="store.updateConfig()"
        />
        <span>Отправлять эмодзи</span>
      </label>
    </div>
    <div class="setting-group">
      <label class="checkbox-setting">
        <input
          type="checkbox"
          v-model="config.sendColons"
          @change="store.updateConfig()"
        />
        <span>Отправлять двоеточия в конце вопросов</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormConfigStore } from '../../stores/formConfig'
import FieldEditor from './FieldEditor.vue'
import ImageFieldEditor from './ImageFieldEditor.vue'

const store = useFormConfigStore()
const config = store.config
</script>
