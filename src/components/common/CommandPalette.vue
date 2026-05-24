<template>
  <Teleport to="body">
    <div v-if="isOpen" class="cmd-backdrop" @click.self="close">
      <div class="cmd-card" @click.stop>
        <div class="cmd-input-row">
          <span class="cmd-icon">🔍</span>
          <input
            ref="inputRef"
            v-model="query"
            class="cmd-input"
            placeholder="Команда..."
            @keydown="onKeydown"
          />
        </div>

        <div class="cmd-list">
          <button
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            class="cmd-item"
            :class="{ 'cmd-item--selected': index === selectedIndex }"
            @click="execute(cmd)"
            @mouseenter="selectedIndex = index"
          >
            <span class="cmd-item__icon">{{ cmd.icon }}</span>
            <span class="cmd-item__label">{{ cmd.label }}</span>
          </button>
          <div v-if="filteredCommands.length === 0" class="cmd-empty">
            Команды не найдены
          </div>
        </div>

        <div class="cmd-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> перемещение</span>
          <span><kbd>↵</kbd> выбрать</span>
          <span><kbd>esc</kbd> закрыть</span>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="onFileImport"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useCommandPalette } from '../../composables/useCommandPalette'
import { useFormConfigStore } from '../../stores/formConfig'
import { useToast } from '../../composables/useToast'
import { copyToClipboard } from '../../utils'
import type { FieldType } from '../../types'

interface Command {
  id: string
  icon: string
  label: string
  keywords?: string[]
  action: () => void | Promise<void>
}

const { isOpen, close } = useCommandPalette()
const store = useFormConfigStore()
const toast = useToast()

const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function addField(type: FieldType): void {
  store.addField(type)
  store.updateConfig()
}

const commands: Command[] = [
  {
    id: 'add-text',
    icon: '➕',
    label: 'Добавить поле: текст',
    keywords: ['text', 'строка'],
    action: () => addField('text'),
  },
  {
    id: 'add-email',
    icon: '➕',
    label: 'Добавить поле: email',
    keywords: ['email', 'почта'],
    action: () => addField('email'),
  },
  {
    id: 'add-textarea',
    icon: '➕',
    label: 'Добавить поле: текстовая область',
    keywords: ['textarea'],
    action: () => addField('textarea'),
  },
  {
    id: 'add-select',
    icon: '➕',
    label: 'Добавить поле: выпадающий список',
    keywords: ['select', 'dropdown'],
    action: () => addField('select'),
  },
  {
    id: 'add-radio',
    icon: '➕',
    label: 'Добавить поле: радиокнопки',
    keywords: ['radio'],
    action: () => addField('radio'),
  },
  {
    id: 'add-checkboxes',
    icon: '➕',
    label: 'Добавить поле: чекбоксы',
    keywords: ['checkboxes'],
    action: () => addField('checkboxes'),
  },
  {
    id: 'add-checkbox',
    icon: '➕',
    label: 'Добавить поле: чекбокс',
    keywords: ['checkbox'],
    action: () => addField('checkbox'),
  },
  {
    id: 'add-computed',
    icon: '➕',
    label: 'Добавить поле: вычисляемое',
    keywords: ['computed', 'формула'],
    action: () => addField('computed'),
  },
  {
    id: 'export',
    icon: '📥',
    label: 'Экспорт JSON',
    keywords: ['export', 'json', 'скачать'],
    action: () => store.exportConfig(),
  },
  {
    id: 'import',
    icon: '📤',
    label: 'Импорт JSON',
    keywords: ['import', 'json', 'загрузить'],
    action: () => fileInputRef.value?.click(),
  },
  {
    id: 'copy-link',
    icon: '🔗',
    label: 'Скопировать ссылку',
    keywords: ['link', 'share', 'ссылка', 'поделиться'],
    action: async () => {
      if (!store.config.webhookUrl) {
        toast.warning('Webhook не настроен', 'Укажите URL вебхука для получения ссылки')
        return
      }
      const ok = await copyToClipboard(store.getShareUrl())
      if (ok) {
        toast.success('Ссылка скопирована')
      } else {
        toast.error('Не удалось скопировать ссылку')
      }
    },
  },
  {
    id: 'duplicate',
    icon: '📋',
    label: 'Дублировать форму',
    keywords: ['duplicate', 'copy', 'дублировать', 'копия'],
    action: () => {
      store.config.webhookUrl = ''
      store.updateConfig()
      toast.success('Форма дублирована', 'Webhook сброшен — настройте новый')
    },
  },
]

const filteredCommands = computed<Command[]>(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return commands
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(q)),
  )
})

watch(query, () => {
  selectedIndex.value = 0
})

watch(isOpen, async (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

function execute(cmd: Command): void {
  void cmd.action()
  close()
}

function onKeydown(e: KeyboardEvent): void {
  const len = filteredCommands.value.length

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = len > 0 ? (selectedIndex.value + 1) % len : 0
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = len > 0 ? (selectedIndex.value - 1 + len) % len : 0
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const cmd = filteredCommands.value[selectedIndex.value]
    if (cmd) execute(cmd)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    e.preventDefault()
  }
}

async function onFileImport(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const ok = await store.importConfig(file)
  if (ok) {
    toast.success('Конфигурация загружена')
  } else {
    toast.error('Ошибка импорта', 'Файл повреждён или имеет неверный формат')
  }
  input.value = ''
}
</script>
