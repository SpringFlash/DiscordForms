<template>
  <Transition name="save-fade">
    <div v-if="visible" class="save-indicator" :class="saveStatus">
      <span v-if="saveStatus === 'saving'" class="spinner" />
      <span v-else class="check">✓</span>
      <span class="label">{{ saveStatus === 'saving' ? 'Сохраняем...' : 'Сохранено' }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormConfigStore } from '../../stores/formConfig'
import { useUiStore } from '../../stores/ui'

const formConfigStore = useFormConfigStore()
const uiStore = useUiStore()

const saveStatus = computed(() => formConfigStore.saveStatus)
const visible = computed(
  () => uiStore.mode === 'editor' && saveStatus.value !== 'idle',
)
</script>

<style scoped>
.save-indicator {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  background: var(--bg-3);
  border: 1px solid var(--border-1);
  border-radius: 6px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-2);
  border-left-width: 3px;
  transition: border-left-color var(--transition);
}

.save-indicator.saving {
  border-left-color: var(--orange);
}

.save-indicator.saved {
  border-left-color: rgba(var(--c-success-rgb), 0.9);
}

.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1.5px solid var(--border-2);
  border-top-color: var(--orange);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.check {
  color: rgba(var(--c-success-rgb), 0.9);
  font-size: 0.9rem;
  line-height: 1;
}

.save-fade-enter-active,
.save-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.save-fade-enter-from,
.save-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
