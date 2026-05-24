import type { FormConfig } from '../types'

export interface FormHistoryEntry {
  title: string
  organization: string
  savedAt: number
  url: string
}

const HISTORY_KEY = 'formHistory'
const MAX_ENTRIES = 5

export function saveToHistory(config: FormConfig, url: string): void {
  const history = loadHistory()
  const entry: FormHistoryEntry = {
    title: config.title,
    organization: config.organization,
    savedAt: Date.now(),
    url,
  }
  const deduped = history.filter((e) => e.url !== url)
  deduped.unshift(entry)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped.slice(0, MAX_ENTRIES)))
}

export function loadHistory(): FormHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as FormHistoryEntry[]
  } catch {
    return []
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}
