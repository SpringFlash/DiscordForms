<template>
  <div class="container" :class="{ 'editor-mode': uiStore.mode === 'editor' }">
    <EditorLayout v-if="uiStore.mode === 'editor'" />
    <div
      class="form-wrapper"
      :class="{ preview: uiStore.mode === 'editor' }"
      v-if="uiStore.mode === 'editor' || uiStore.mode === 'viewer'"
      id="formPreview"
    >
      <FormView :preview="uiStore.mode === 'editor'" />
    </div>
    <div class="form-wrapper" v-if="uiStore.mode === 'welcome'" id="formPreview">
      <WelcomeScreen @create="onCreateForm" />
    </div>
    <div class="background-decoration">
      <div class="decoration-1"></div>
      <div class="decoration-2"></div>
      <div class="decoration-3"></div>
    </div>
  </div>
  <p class="watermark">&copy; SpringFlash (Geralt Spring)</p>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useFormConfigStore } from './stores/formConfig'
import { useUiStore } from './stores/ui'
import EditorLayout from './components/editor/EditorLayout.vue'
import FormView from './components/form/FormView.vue'
import WelcomeScreen from './components/common/WelcomeScreen.vue'

const formConfigStore = useFormConfigStore()
const uiStore = useUiStore()

function updateFavicon(org: string): void {
  const link = document.getElementById('faviconLink') as HTMLLinkElement | null
  if (link) {
    link.href = `${import.meta.env.BASE_URL}images/favicon/${org.toLowerCase()}.ico`
  }
}

export function getOrgLogoSrc(org: string): string {
  return `${import.meta.env.BASE_URL}images/${org}.png`
}

function onCreateForm(): void {
  formConfigStore.resetConfig()
  uiStore.setMode('editor')
}

function onPopState(): void {
  window.location.reload()
}

onMounted(() => {
  uiStore.initTheme()

  const { loaded, isEditor } = formConfigStore.loadFromUrl()
  if (loaded && isEditor) {
    uiStore.setMode('editor')
  } else if (loaded) {
    uiStore.setMode('viewer')
  } else {
    uiStore.setMode('welcome')
  }

  document.title = formConfigStore.config.title || 'Discord Forms'
  updateFavicon(formConfigStore.config.organization)

  window.addEventListener('popstate', onPopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
})

watch(
  () => formConfigStore.config.title,
  (title) => {
    document.title = title || 'Discord Forms'
  },
)

watch(
  () => formConfigStore.config.organization,
  (org) => {
    updateFavicon(org)
  },
)
</script>
