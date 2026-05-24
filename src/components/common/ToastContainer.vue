<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
        @mouseenter="pauseTimer(toast.id)"
        @mouseleave="resumeTimer(toast.id)"
      >
        <div class="toast-body">
          <div class="toast-text">
            <span class="toast-title">{{ toast.title }}</span>
            <span v-if="toast.description" class="toast-description">{{ toast.description }}</span>
          </div>
          <button
            v-if="toast.action"
            class="toast-action"
            @click="toast.action!.onClick(); remove(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
        <button class="toast-close" @click="remove(toast.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useToast } from '../../composables/useToast'

const { toasts, remove } = useToast()

interface TimerEntry {
  timerId: ReturnType<typeof setTimeout>
  remaining: number
  startedAt: number
}

const timers = new Map<string, TimerEntry>()

function startTimer(id: string, duration: number): void {
  if (duration === 0) return
  const timerId = setTimeout(() => remove(id), duration)
  timers.set(id, { timerId, remaining: duration, startedAt: Date.now() })
}

function pauseTimer(id: string): void {
  const entry = timers.get(id)
  if (!entry) return
  clearTimeout(entry.timerId)
  entry.remaining -= Date.now() - entry.startedAt
}

function resumeTimer(id: string): void {
  const entry = timers.get(id)
  if (!entry || entry.remaining <= 0) return
  const timerId = setTimeout(() => remove(id), entry.remaining)
  entry.timerId = timerId
  entry.startedAt = Date.now()
}

watch(
  toasts,
  () => {
    toasts.value.forEach((toast) => {
      if (!timers.has(toast.id)) {
        startTimer(toast.id, toast.duration ?? 4000)
      }
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  timers.forEach((entry) => clearTimeout(entry.timerId))
  timers.clear()
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: var(--bg-3);
  border: 1px solid var(--border-1);
  border-radius: var(--radius);
  padding: 0.85rem 2.2rem 0.85rem 1rem;
  max-width: 360px;
  min-width: 260px;
  border-left: 4px solid transparent;
  box-shadow: var(--shadow-md);
  pointer-events: all;
}

.toast.success { border-left-color: rgb(var(--c-success-rgb)); }
.toast.error   { border-left-color: rgb(var(--c-danger-rgb)); }
.toast.warning { border-left-color: rgb(var(--c-warning-rgb)); }
.toast.info    { border-left-color: rgb(var(--c-info-rgb)); }

.toast-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.toast-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text);
  line-height: 1.3;
}

.toast-description {
  font-size: 0.8rem;
  color: var(--text-2);
  line-height: 1.4;
}

.toast-action {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--orange);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.15rem 0.4rem;
  border-radius: var(--radius-xs);
  transition: background var(--transition);
}

.toast-action:hover {
  background: var(--orange-dim);
}

.toast-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-xs);
  transition: color var(--transition);
}

.toast-close:hover {
  color: var(--orange);
}

/* TransitionGroup animations */
.toast-enter-active {
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-leave-active {
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(60px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(60px);
}

.toast-move {
  transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
