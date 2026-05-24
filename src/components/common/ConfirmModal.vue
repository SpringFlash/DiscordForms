<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="confirmState.visible"
        class="confirm-backdrop"
        @click.self="onCancel"
      >
        <div
          class="confirm-card"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          ref="cardRef"
          @keydown.esc="onCancel"
          @keydown.enter="onConfirm"
        >
          <p class="confirm-title">{{ confirmState.options.title }}</p>
          <p v-if="confirmState.options.message" class="confirm-message">
            {{ confirmState.options.message }}
          </p>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="onCancel">
              {{ confirmState.options.cancelText }}
            </button>
            <button
              class="confirm-btn submit"
              :class="confirmState.options.danger ? 'danger' : 'primary'"
              @click="onConfirm"
            >
              {{ confirmState.options.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { confirmState } from '../../composables/useConfirm'

const cardRef = ref<HTMLElement | null>(null)

watch(
  () => confirmState.visible,
  async (visible) => {
    if (visible) {
      await nextTick()
      cardRef.value?.focus()
    }
  },
)

function onCancel(): void {
  confirmState.visible = false
  confirmState.resolve?.(false)
  confirmState.resolve = null
}

function onConfirm(): void {
  confirmState.visible = false
  confirmState.resolve?.(true)
  confirmState.resolve = null
}
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.confirm-card {
  background: var(--bg-2);
  border: 1px solid var(--border-1);
  border-radius: var(--radius);
  padding: 1.5rem;
  max-width: 420px;
  width: 100%;
  box-shadow: var(--shadow-xl);
  outline: none;
}

.confirm-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.confirm-message {
  font-size: 0.875rem;
  color: var(--text-2);
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.confirm-title:last-child {
  margin-bottom: 1.25rem;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.confirm-btn {
  padding: 0.5rem 1.1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
  border: 1px solid transparent;
}

.confirm-btn.cancel {
  background: var(--bg-3);
  border-color: var(--border-2);
  color: var(--text-2);
}

.confirm-btn.cancel:hover {
  background: var(--bg-4);
  color: var(--text);
}

.confirm-btn.submit.danger {
  background: rgba(var(--c-danger-rgb), 0.15);
  border-color: rgba(var(--c-danger-rgb), 0.4);
  color: rgb(var(--c-danger-rgb));
}

.confirm-btn.submit.danger:hover {
  background: rgba(var(--c-danger-rgb), 0.25);
}

.confirm-btn.submit.primary {
  background: var(--orange-dim);
  border-color: rgba(var(--c-brand-rgb), 0.4);
  color: var(--orange);
}

.confirm-btn.submit.primary:hover {
  background: var(--orange-mid);
}

/* Transition */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-fade-enter-active .confirm-card,
.confirm-fade-leave-active .confirm-card {
  transition: transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-card {
  transform: scale(0.95);
}

.confirm-fade-leave-to .confirm-card {
  transform: scale(0.95);
}
</style>
