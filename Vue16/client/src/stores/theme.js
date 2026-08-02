import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '../api'

const defaults = {
  theme_bg: 'linear-gradient(135deg, #0a1628 0%, #0d2137 40%, #132f4c 100%)',
  theme_primary: '#00d4aa',
  theme_secondary: '#3b9eff',
  theme_accent: '#ff6b35',
  theme_text: '#e8f4f8',
  theme_font: '"Noto Sans SC", "PingFang SC", sans-serif',
  theme_chart_opacity: '0.85',
  system_title: '基于深度学习的番茄叶病害分类系统',
  system_subtitle: 'Tomato Leaf Disease Classification Visualization Platform'
}

export const useThemeStore = defineStore('theme', () => {
  const settings = ref({ ...defaults })

  function applyCssVars(s) {
    const root = document.documentElement
    root.style.setProperty('--theme-bg', s.theme_bg)
    root.style.setProperty('--theme-primary', s.theme_primary)
    root.style.setProperty('--theme-secondary', s.theme_secondary)
    root.style.setProperty('--theme-accent', s.theme_accent)
    root.style.setProperty('--theme-text', s.theme_text)
    root.style.setProperty('--theme-font', s.theme_font)
    root.style.setProperty('--theme-chart-opacity', s.theme_chart_opacity)
    document.body.style.background = s.theme_bg
    document.body.style.fontFamily = s.theme_font
    document.body.style.color = s.theme_text
  }

  async function load() {
    try {
      const res = await settingsApi.get()
      if (res.code === 0 && res.data) {
        settings.value = { ...defaults, ...res.data }
        applyCssVars(settings.value)
      }
    } catch {
      applyCssVars(settings.value)
    }
  }

  async function save(data) {
    settings.value = { ...settings.value, ...data }
    applyCssVars(settings.value)
    return settingsApi.save(settings.value)
  }

  function preview(data) {
    const next = { ...settings.value, ...data }
    applyCssVars(next)
  }

  return { settings, load, save, preview, applyCssVars }
})
