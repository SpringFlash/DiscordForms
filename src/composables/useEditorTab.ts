import { ref, type Ref } from 'vue'

export type EditorTab = 'settings' | 'fields' | 'logic'

const activeTab = ref<EditorTab>('fields')

export function useEditorTab(): {
  activeTab: Ref<EditorTab>
  setTab: (tab: EditorTab) => void
} {
  function setTab(tab: EditorTab): void {
    activeTab.value = tab
  }
  return { activeTab, setTab }
}
