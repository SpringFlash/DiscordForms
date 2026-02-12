export type FieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'computed'
  | 'image'

export interface ConditionalCondition {
  field: string
  value: string
}

export interface ConditionalConfig {
  enabled: boolean
  conditions: ConditionalCondition[]
  // Legacy single-condition fields (for migration)
  field?: string
  value?: string
}

export interface CustomWebhookConfig {
  enabled: boolean
  url: string
  splitLines: boolean
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder: string
  required: boolean
  icon: string
  options: string[]
  formula: string
  showTextInResponse: boolean
  defaultValue: string
  maxFiles: number
  conditional: ConditionalConfig | null
  customWebhook: CustomWebhookConfig | null
}

export interface ConditionalMessage {
  id: string
  field: string
  value: string
  message: string
}

export interface FormConfig {
  title: string
  description: string
  customMessage: string
  webhookUrl: string
  webhookUsername: string
  webhookAvatarUrl: string
  organization: string
  sendAsPlainText: boolean
  displayUsername: boolean
  showAdvancedSettings: boolean
  sendQuestionNumbers: boolean
  sendEmojis: boolean
  sendColons: boolean
  fields: FormField[]
  conditionalMessages: ConditionalMessage[]
}

export type AppMode = 'welcome' | 'editor' | 'viewer' | 'loading'

export type Theme = 'light' | 'dark'

export interface DiscordEmbedField {
  name: string
  value: string
  inline: boolean
}

export interface DiscordEmbed {
  title?: string
  color: number
  fields: DiscordEmbedField[]
  timestamp?: string
  footer?: {
    text: string
    icon_url: string
  }
  url?: string
  image?: {
    url: string
  }
}

export interface DiscordPayload {
  content: string | null
  embeds?: DiscordEmbed[]
  username: string
  avatar_url: string
}

export interface SendResult {
  success: boolean
  message: string
}
