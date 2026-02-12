<template>
  <div class="container" :class="{ 'editor-mode': uiStore.mode === 'editor' }">
    <EditorLayout v-if="uiStore.mode === 'editor'" />
    <Transition name="form-enter" appear>
      <div
        class="form-wrapper"
        :class="{ preview: uiStore.mode === 'editor' }"
        v-if="uiStore.mode === 'editor' || uiStore.mode === 'viewer'"
        id="formPreview"
      >
        <FormView :preview="uiStore.mode === 'editor'" />
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
    <div ref="bgRef" class="background-decoration">
      <div
        v-for="circle in circles"
        :key="circle.id"
        class="decoration"
        :class="{ heart: circle.isHeart }"
        :style="circle.style"
      />
    </div>
  </div>
  <p class="watermark">&copy; SpringFlash (Geralt Spring)</p>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue'
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

function onCreateForm(): void {
  formConfigStore.resetConfig()
  uiStore.setMode('editor')
}

function onPopState(): void {
  window.location.reload()
}

const circles = ref([])
const bgRef = ref(null)

const isValentine = () => {
  const now = new Date()
  return now.getDate() === 14 && now.getMonth() === 1
}

const generateCircles = () => {
  if (!bgRef.value) return

  const containerHeight = bgRef.value.offsetHeight
  const viewportWidth = window.innerWidth

  const density = 550
  const calculatedRows = Math.floor(containerHeight / density)
  const rows = Math.max(6, calculatedRows)

  const step = containerHeight / rows
  const valentine = isValentine()

  circles.value = []

  for (let i = 0; i < rows; i++) {
    const isLeft = i % 2 === 0

    const colMin = isLeft ? 5 : 70
    const colMax = isLeft ? 30 : 95
    const colWidth = colMax - colMin

    const size = 140 + Math.random() * 80

    const left =
      colMin +
      Math.random() *
        (colWidth - (size / viewportWidth) * 100)

    const baseTop = i * step
    const jitterY = step * 0.15 * (Math.random() - 0.5)

    const animationName = valentine ? 'float-heart' : 'float'
    const duration = valentine
      ? 2 + Math.random() * 2
      : 8 + Math.random() * 6
    const delay = Math.random() * 3

    circles.value.push({
      id: i,
      isHeart: valentine,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        top: `${baseTop + jitterY}px`,
        left: `${left}%`,
        opacity: valentine ? 0.06 : 0.05,
        animation: `${animationName} ${duration}s ease-in-out ${delay}s infinite`,
      },
    })
  }
}

const regenerate = async () => {
  await nextTick()      // ждём пока новый контент отрисуется
  generateCircles()
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
  generateCircles()
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

watch(
  () => uiStore.mode,
  async () => {
    await nextTick()
    requestAnimationFrame(() => {
      generateCircles()
    })
  }
)

</script>
