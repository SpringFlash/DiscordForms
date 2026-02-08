import LZString from 'lz-string'
import type { FormConfig } from '../types'

interface OptimizedField {
  [key: string]: unknown
}

interface OptimizedConfig {
  [key: string]: unknown
  fields?: OptimizedField[]
}

export function optimizeConfig(config: FormConfig): OptimizedConfig {
  const optimized: OptimizedConfig = { ...config }

  if (!optimized.customMessage) delete optimized.customMessage
  if (
    !optimized.conditionalMessages ||
    !(optimized.conditionalMessages as unknown[]).length
  )
    delete optimized.conditionalMessages
  if (optimized.showAdvancedSettings === false) delete optimized.showAdvancedSettings
  if (optimized.sendEmojis === false) delete optimized.sendEmojis

  if (optimized.fields) {
    optimized.fields = (config.fields).map((field) => {
      const f: OptimizedField = { ...field }
      if (!f.placeholder) delete f.placeholder
      if (!f.icon) delete f.icon
      if (!f.options || !(f.options as string[]).length) delete f.options
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

export function decodeConfig(encodedConfig: string): FormConfig | null {
  try {
    if (encodedConfig.startsWith('v2:')) {
      const compressed = encodedConfig.substring(3)
      const json = LZString.decompressFromEncodedURIComponent(compressed)
      if (json) return JSON.parse(json) as FormConfig
      return null
    }
    return JSON.parse(decodeURIComponent(atob(encodedConfig))) as FormConfig
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
