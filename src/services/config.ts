import LZString from 'lz-string'
import type { FormConfig, FieldOption } from '../types'

function migrateOptions(options: unknown[]): FieldOption[] {
  return options.map((o) =>
    typeof o === 'string' ? { label: o, value: '' } : (o as FieldOption),
  )
}

export function optimizeConfig(config: FormConfig): Record<string, unknown> {
  const optimized: Record<string, unknown> = { ...config }

  if (!optimized.customMessage) delete optimized.customMessage
  if (
    !optimized.conditionalMessages ||
    !(optimized.conditionalMessages as unknown[]).length
  )
    delete optimized.conditionalMessages
  if (optimized.showAdvancedSettings === false) delete optimized.showAdvancedSettings
  if (optimized.sendEmojis === false) delete optimized.sendEmojis

  if (optimized.fields) {
    optimized.fields = config.fields.map((field) => {
      const f: Record<string, unknown> = { ...field }
      if (!f.placeholder) delete f.placeholder
      if (!f.icon) delete f.icon
      if (!f.options || !(f.options as FieldOption[]).length) delete f.options
      if (f.required === false) delete f.required
      if (
        f.customWebhook &&
        !(f.customWebhook as { enabled: boolean }).enabled
      )
        delete f.customWebhook
      if (
        f.conditional &&
        !(f.conditional as { enabled: boolean }).enabled
      )
        delete f.conditional
      return f
    })
  }

  return optimized
}

export function encodeConfig(config: FormConfig): string {
  try {
    const optimized = optimizeConfig(config)
    const json = JSON.stringify(optimized)
    return 'v2:' + LZString.compressToEncodedURIComponent(json)
  } catch (e) {
    console.error('Config encoding error:', e)
    return btoa(encodeURIComponent(JSON.stringify(config)))
  }
}

function migrateConfig(config: FormConfig): FormConfig {
  for (const field of config.fields ?? []) {
    if (Array.isArray(field.options)) {
      field.options = migrateOptions(field.options as unknown[])
    }
  }
  return config
}

export function decodeConfig(encodedConfig: string): FormConfig | null {
  try {
    let config: FormConfig | null = null
    if (encodedConfig.startsWith('v2:')) {
      const compressed = encodedConfig.substring(3)
      const json = LZString.decompressFromEncodedURIComponent(compressed)
      if (json) config = JSON.parse(json) as FormConfig
    } else {
      config = JSON.parse(decodeURIComponent(atob(encodedConfig))) as FormConfig
    }
    return config ? migrateConfig(config) : null
  } catch (e) {
    console.error('Config decoding error:', e)
    return null
  }
}

export interface UrlParams {
  config: string | null
  mode: string | null
}

export function getUrlParams(): UrlParams {
  const hash = window.location.hash.substring(1)
  if (hash) {
    const hashParams = new URLSearchParams(hash)
    const config = hashParams.get('config')
    if (config) {
      return { config, mode: hashParams.get('mode') }
    }
  }
  const params = new URLSearchParams(window.location.search)
  return { config: params.get('config'), mode: params.get('mode') }
}

export function updateUrl(config: FormConfig | null = null, mode: boolean | null = null): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('config')
  url.searchParams.delete('mode')

  const hashParams = new URLSearchParams(url.hash.substring(1))
  if (config) {
    hashParams.set('config', encodeConfig(config))
  }
  if (mode !== null) {
    if (mode) {
      hashParams.set('mode', 'editor')
    } else {
      hashParams.delete('mode')
    }
  }
  url.hash = hashParams.toString()
  window.history.pushState({}, '', url.toString())
}

export function generateShareUrl(config: FormConfig): string {
  const baseUrl = window.location.origin + window.location.pathname
  const hashParams = new URLSearchParams()
  hashParams.set('config', encodeConfig(config))
  return `${baseUrl}#${hashParams.toString()}`
}

