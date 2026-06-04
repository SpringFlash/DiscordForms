<template>
  <div class="container" :class="{ 'editor-mode': uiStore.mode === 'editor' }">
    <EditorLayout v-if="uiStore.mode === 'editor'" />
    <Transition name="form-enter" appear>
      <div
        class="form-wrapper"
        v-if="uiStore.mode === 'viewer'"
        id="formPreview"
      >
        <FormView :preview="false" />
      </div>
    </Transition>
    <Transition name="form-enter" appear>
      <div class="form-wrapper" v-if="uiStore.mode === 'welcome'" id="formPreview">
        <WelcomeScreen @create="onCreateForm" />
      </div>
    </Transition>
    <div class="form-wrapper loading-wrapper" v-if="uiStore.mode === 'loading'">
      <i class="fas fa-spinner loading"></i>
    </div>
  </div>
  <div class="watermark">
    <span class="watermark__dot"></span>
    <span class="watermark__label">Crafted by</span>
    <span class="watermark__name">SpringFlash</span>
    <span class="watermark__divider"></span>
    <span class="watermark__alias">Geralt Spring</span>
  </div>
  <ToastContainer />
  <SaveIndicator />
  <ConfirmModal />
  <CommandPalette />
  <PromoBanner />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useFormConfigStore } from './stores/formConfig'
import { useUiStore } from './stores/ui'
import { useCommandPalette } from './composables/useCommandPalette'
import EditorLayout from './components/editor/EditorLayout.vue'
import FormView from './components/form/FormView.vue'
import WelcomeScreen from './components/common/WelcomeScreen.vue'
import ToastContainer from './components/common/ToastContainer.vue'
import ConfirmModal from './components/common/ConfirmModal.vue'
import SaveIndicator from './components/common/SaveIndicator.vue'
import CommandPalette from './components/common/CommandPalette.vue'
import PromoBanner from './components/common/PromoBanner.vue'

const formConfigStore = useFormConfigStore()
const uiStore = useUiStore()
const commandPalette = useCommandPalette()

function updateFavicon(org = 'lspd'): void {
  const link = document.getElementById('faviconLink') as HTMLLinkElement | null
  if (link) {
    link.href = `${import.meta.env.BASE_URL}images/favicon/${org.toLowerCase()}.ico`
  }
}

function onCreateForm(): void {
  formConfigStore.resetConfig()
  uiStore.setMode('editor')
}

function onPopState(): void {
  window.location.reload()
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    if (uiStore.mode === 'editor') {
      e.preventDefault()
      commandPalette.open()
    }
  }
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
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  window.removeEventListener('keydown', onGlobalKeydown)
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
