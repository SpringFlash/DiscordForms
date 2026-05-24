import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmState {
  visible: boolean
  options: Required<ConfirmOptions>
  resolve: ((value: boolean) => void) | null
}

const DEFAULT_OPTIONS = {
  message: '',
  confirmText: 'Удалить',
  cancelText: 'Отмена',
  danger: true,
} as const

export const confirmState = reactive<ConfirmState>({
  visible: false,
  options: {
    title: '',
    ...DEFAULT_OPTIONS,
  },
  resolve: null,
})

function confirm(options: ConfirmOptions): Promise<boolean> {
  confirmState.options = { ...DEFAULT_OPTIONS, ...options }
  confirmState.visible = true

  return new Promise<boolean>((resolve) => {
    confirmState.resolve = resolve
  })
}

export function useConfirm() {
  return { confirm }
}
