<template>
  <div class="theme-switcher">
    <button
      class="theme-btn"
      :class="{ active: uiStore.theme === 'light' }"
      @click="uiStore.setTheme('light')"
    >
      <i class="fas fa-sun"></i> Светлая
    </button>
    <button
      class="theme-btn"
      :class="{ active: uiStore.theme === 'dark' }"
      @click="uiStore.setTheme('dark')"
    >
      <i class="fas fa-moon"></i> Тёмная
    </button>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '../../stores/ui'

const uiStore = useUiStore()
</script>
