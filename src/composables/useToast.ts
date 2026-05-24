import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: ToastAction
}

export interface Toast extends ToastOptions {
  id: string
}

const toasts = ref<Toast[]>([])

function show(options: ToastOptions): string {
  const id = crypto.randomUUID()
  const duration = options.duration ?? 4000
  toasts.value.push({ ...options, duration, id })
  return id
}

function remove(id: string): void {
  const idx = toasts.value.findIndex((t) => t.id === id)
  if (idx !== -1) toasts.value.splice(idx, 1)
}

function success(title: string, description?: string): string {
  return show({ type: 'success', title, description })
}

function error(title: string, description?: string): string {
  return show({ type: 'error', title, description })
}

function warning(title: string, description?: string): string {
  return show({ type: 'warning', title, description })
}

function info(title: string, description?: string): string {
  return show({ type: 'info', title, description })
}

export function useToast() {
  return { toasts, show, success, error, warning, info, remove }
}
