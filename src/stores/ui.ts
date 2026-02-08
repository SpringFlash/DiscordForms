import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppMode, Theme } from '../types'

export const useUiStore = defineStore('ui', () => {
  const mode = ref<AppMode>('welcome')
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')
  const selectedFieldId = ref<string | null>(null)

  function setMode(newMode: AppMode): void {
    mode.value = newMode
  }

  function setTheme(newTheme: Theme): void {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  function initTheme(): void {
    setTheme(theme.value)
  }

  return {
    mode,
    theme,
    selectedFieldId,
    setMode,
    setTheme,
    initTheme,
  }
})
