import { getFieldIcon } from '../utils'
import type {
  FormConfig,
  FormField,
  DiscordEmbed,
  DiscordEmbedField,
  DiscordPayload,
  SendResult,
} from '../types'

const DEFAULT_AVATAR = 'https://pngimg.com/uploads/discord/discord_PNG3.png'

const PRIORITY_COLORS: Record<string, number> = {
  'Низкий': 0x10b981,
  'Средний': 0xf59e0b,
  'Высокий': 0xef4444,
}

const FIELD_LIMIT = 25

function getImageSuffix(count: number): string {
  if (count % 10 === 1 && count % 100 !== 11) return 'е'
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'я'
  return 'й'
}

function shouldSkipField(field: FormField): boolean {
  return !!(
    field.customWebhook &&
    field.customWebhook.enabled &&
    (field.customWebhook.splitLines || field.customWebhook.url)
  )
}

function formatCheckboxValue(field: FormField, value: string): string {
  if (field.showTextInResponse !== false) {
    return value === 'on' ? '✅ Да' : '❌ Нет'
  }
  return value === 'on' ? '✅' : '❌'
}

function buildFieldLabel(
  field: FormField,
  questionIndex: number,
  showEmojis: boolean,
  showQuestionNumbers: boolean,
  showColons: boolean,
): string {
  let label = ''
  if (showEmojis && field.icon) {
    const emoji = getFieldIcon(field.icon)
    if (!emoji.startsWith('<i ')) label += `${emoji} `
  }
  if (showQuestionNumbers) label += `${questionIndex}) `
  label += `${field.label}${showColons ? ':' : ''}`
  return label
}

export function createDiscordEmbeds(
  config: FormConfig,
  formData: Record<string, string>,
  imagesLength: number,
): DiscordEmbed[] {
  let embedColor = 0x6366f1
  if (formData.priority && PRIORITY_COLORS[formData.priority] !== undefined) {
    embedColor = PRIORITY_COLORS[formData.priority]!
  }

  const allFields: DiscordEmbedField[] = []
  let questionIndex = 1
  const showQuestionNumbers = config.sendQuestionNumbers !== undefined ? config.sendQuestionNumbers : true
  const showEmojis = config.sendEmojis || false
  const showColons = config.sendColons !== false

  config.fields.forEach((field) => {
    if (shouldSkipField(field)) return

    const value = formData[field.id]
    const isImage = imagesLength > 0 && field.type === 'image'

    if (isImage || (value !== undefined && value !== '')) {
      let displayValue = isImage ? ' ' : value

      let fieldName = buildFieldLabel(field, questionIndex, showEmojis, showQuestionNumbers, showColons)

      if (isImage) {
        const suffix = getImageSuffix(imagesLength)
        fieldName += ` (${imagesLength} изображени${suffix})`
      }

      if (field.type === 'checkbox') {
        displayValue = formatCheckboxValue(field, value ?? '')
      }

      if (typeof displayValue === 'string' && displayValue.length > 1024) {
        displayValue = displayValue.substring(0, 1021) + '...'
      }

      questionIndex++
      allFields.push({ name: fieldName, value: displayValue ?? '', inline: false })
    }
  })

  const chunks: DiscordEmbedField[][] = []
  for (let i = 0; i < allFields.length; i += FIELD_LIMIT) {
    chunks.push(allFields.slice(i, i + FIELD_LIMIT))
  }
  if (chunks.length === 0) chunks.push([])

  const footer = {
    text: config.displayUsername !== false ? (config.webhookUsername || config.title) : '',
    icon_url: config.webhookAvatarUrl || DEFAULT_AVATAR,
  }

  return chunks.map((fields, i) => {
    const isFirst = i === 0
    const isLast = i === chunks.length - 1
    const embed: DiscordEmbed = { color: embedColor, fields }
    if (isFirst) embed.title = `📝 ${config.title}`
    if (isLast) {
      embed.timestamp = new Date().toISOString()
      embed.footer = footer
    }
    return embed
  })
}

export function createPlainTextMessage(
  config: FormConfig,
  formData: Record<string, string>,
): string {
  let message = `**__📝 ${config.title}__**\n`
  let questionIndex = 1
  const showQuestionNumbers = config.sendQuestionNumbers !== undefined ? config.sendQuestionNumbers : true
  const showEmojis = config.sendEmojis || false
  const showColons = config.sendColons !== false

  config.fields.forEach((field) => {
    if (shouldSkipField(field)) return

    const value = formData[field.id]
    if (value !== undefined && value !== '') {
      let displayValue: string = value

      if (field.type === 'checkbox') {
        displayValue = formatCheckboxValue(field, value)
      }

      const fieldLabel = buildFieldLabel(field, questionIndex, showEmojis, showQuestionNumbers, showColons)

      const separator = ['textarea', 'computed'].includes(field.type) ? '\n' : ' '
      message += `**${fieldLabel}**${separator}${displayValue}\n`
      questionIndex++
    }
  })

  return message
}

export function getConditionalMessage(
  config: FormConfig,
  formData: Record<string, string>,
): string | null {
  const matchedMessages: string[] = []

  if (config.conditionalMessages && config.conditionalMessages.length > 0) {
    for (const condMsg of config.conditionalMessages) {
      if (condMsg.field && condMsg.value && condMsg.message) {
        const fieldValue = formData[condMsg.field]
        let requiredValues: string[]
        try {
          const parsed: unknown = JSON.parse(condMsg.value)
          requiredValues = Array.isArray(parsed) ? parsed as string[] : [condMsg.value]
        } catch {
          requiredValues = [condMsg.value]
        }
        if (fieldValue !== undefined && requiredValues.includes(fieldValue)) {
          matchedMessages.push(condMsg.message)
        }
      }
    }
  }

  if (config.customMessage) {
    matchedMessages.push(config.customMessage)
  }

  return matchedMessages.length > 0 ? matchedMessages.join('\n') : null
}

export function createFormDataPayload(
  payload: DiscordPayload,
  files: File[],
): FormData {
  const fd = new FormData()
  fd.append('payload_json', JSON.stringify(payload))
  files.forEach((file, index) => {
    fd.append(`files[${index}]`, file, `image${index}.png`)
  })
  return fd
}

export function createGalleryEmbeds(
  embeds: DiscordEmbed[],
  fileCount: number,
): DiscordEmbed[] {
  if (fileCount === 0) return embeds

  const galleryUrl = 'https://gta5rp.com/'
  const result = embeds.map((e) => ({ ...e }))
  const lastEmbed = result[result.length - 1]!
  lastEmbed.url = galleryUrl
  lastEmbed.image = { url: 'attachment://image0.png' }

  for (let i = 1; i < fileCount; i++) {
    result.push({
      url: galleryUrl,
      image: { url: `attachment://image${i}.png` },
      color: 0,
      fields: [],
    })
  }

  return result
}

export async function sendToDiscord(
  config: FormConfig,
  formData: Record<string, string>,
  uploadedImages: File[],
): Promise<SendResult> {
  if (!config.webhookUrl) {
    return { success: false, message: 'Webhook URL не настроен' }
  }

  const customMessage = getConditionalMessage(config, formData)
  const hasImages = uploadedImages.length > 0
  const username = config.webhookUsername || config.title
  const avatarUrl = config.webhookAvatarUrl || DEFAULT_AVATAR

  let payload: DiscordPayload
  let fetchOptions: RequestInit

  if (config.sendAsPlainText) {
    const plainTextContent = createPlainTextMessage(config, formData)
    const finalContent = customMessage
      ? `${customMessage}\n\n${plainTextContent}`
      : plainTextContent

    payload = {
      content: finalContent,
      username,
      avatar_url: avatarUrl,
    }

    if (hasImages) {
      fetchOptions = {
        method: 'POST',
        body: createFormDataPayload(payload, uploadedImages),
      }
    } else {
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    }
  } else {
    const embeds = createDiscordEmbeds(config, formData, uploadedImages.length)

    if (hasImages) {
      const allEmbeds = createGalleryEmbeds(embeds, uploadedImages.length)
      payload = {
        content: customMessage,
        embeds: allEmbeds,
        username,
        avatar_url: avatarUrl,
      }
      fetchOptions = {
        method: 'POST',
        body: createFormDataPayload(payload, uploadedImages),
      }
    } else {
      payload = {
        content: customMessage,
        embeds,
        username,
        avatar_url: avatarUrl,
      }
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    }
  }

  try {
    const response = await fetch(config.webhookUrl, fetchOptions)

    if (!response.ok) {
      const errorData: { message?: string } = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.message || 'Неизвестная ошибка'}`)
    }

    const customWebhookFields = config.fields.filter(
      (field) => field.customWebhook && field.customWebhook.enabled,
    )

    if (customWebhookFields.length > 0) {
      const customWebhookPromises: Promise<Response | void>[] = []

      customWebhookFields.forEach((field) => {
        const webhookUrl = field.customWebhook!.url || config.webhookUrl

        if (
          field.customWebhook!.splitLines &&
          (field.type === 'textarea' || field.type === 'computed') &&
          formData[field.id]
        ) {
          const lines = (formData[field.id] ?? '')
            .split('\n')
            .filter((line) => line.trim() !== '')

          lines.forEach((line, index) => {
            const linePayload: DiscordPayload = {
              content: line,
              username,
              avatar_url: avatarUrl,
            }
            customWebhookPromises.push(
              fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(linePayload),
              }).catch((error) => {
                console.error(
                  `Error sending line ${index + 1} of field ${field.label}:`,
                  error,
                )
              }),
            )
          })
        } else if (field.customWebhook!.url) {
          customWebhookPromises.push(
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }).catch((error) => {
              console.error(
                `Error sending to custom webhook for field ${field.label}:`,
                error,
              )
            }),
          )
        }
      })

      await Promise.allSettled(customWebhookPromises)
    }

    return { success: true, message: 'Сообщение успешно отправлено! 🎉' }
  } catch (error) {
    console.error('Discord send error:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: `Ошибка при отправке: ${errMsg}. Попробуйте еще раз.`,
    }
  }
}
