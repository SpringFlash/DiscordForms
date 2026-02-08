<template>
  <div class="emoji-picker-wrapper" ref="wrapperRef">
    <button type="button" class="emoji-picker-btn" @click.stop="showPicker = !showPicker">
      <span class="emoji-display">{{ displayValue }}</span>
    </button>
    <!-- @vue-ignore -->
    <emoji-picker v-if="showPicker" class="emoji-picker-popup" @emoji-click="onEmojiClick"></emoji-picker>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import 'emoji-picker-element'
import { iconMap } from '../../utils'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPicker = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)

const displayValue = computed(() => {
  return iconMap[props.modelValue] || props.modelValue || '\u2753'
})

function onEmojiClick(event: CustomEvent<{ unicode: string }>) {
  emit('update:modelValue', event.detail.unicode)
  showPicker.value = false
}

function onClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    showPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>
