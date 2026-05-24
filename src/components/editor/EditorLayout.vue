<template>
  <div class="editor-shell">
    <aside class="editor-pane">
      <WebhookBanner />
      <EditorSidebar />
    </aside>
    <main class="preview-pane" v-show="previewOpen">
      <div class="form-wrapper preview" id="formPreview">
        <FormView :preview="true" />
      </div>
    </main>
    <button
      class="preview-toggle"
      type="button"
      @click="previewOpen = !previewOpen"
    >
      <i :class="previewOpen ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
      {{ previewOpen ? 'Скрыть превью' : 'Показать превью' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EditorSidebar from './EditorSidebar.vue'
import WebhookBanner from './WebhookBanner.vue'
import FormView from '../form/FormView.vue'

const previewOpen = ref(true)
</script>
