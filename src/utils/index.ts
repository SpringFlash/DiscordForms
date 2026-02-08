export const iconMap: Record<string, string> = {
  user: '👤',
  envelope: '📧',
  tag: '🏷️',
  'exclamation-triangle': '⚡',
  comment: '💬',
  newspaper: '📰',
  question: '❓',
  calculator: '🧮',
}

const emojiRegex =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u

export function getFieldIcon(icon: string): string {
  if (!icon) return ''
  if (emojiRegex.test(icon)) return icon
  if (iconMap[icon]) return iconMap[icon]
  return `<i class="fas fa-${icon}"></i>`
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Copy failed:', err)
    return false
  }
}
