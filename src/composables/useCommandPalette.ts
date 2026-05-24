import { ref, readonly } from 'vue'

const commandPaletteOpen = ref<boolean>(false)

export function useCommandPalette() {
  function open(): void {
    commandPaletteOpen.value = true
  }

  function close(): void {
    commandPaletteOpen.value = false
  }

  return {
    isOpen: readonly(commandPaletteOpen),
    open,
    close,
  }
}
