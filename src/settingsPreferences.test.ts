import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  getLanguageDirection,
  getLanguageLocale,
  PREFERENCE_STORAGE_KEY,
  readLocalPreferences,
  resolveTheme,
  saveLocalPreferences,
  settingsFromApi,
  validateSettingsPreferences,
} from './settingsPreferences'
import { LANGUAGE_OPTIONS, SETTINGS_TRANSLATIONS, translationKeys } from './settingsTranslations'
import { translateSettings } from './settingsTranslations'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('settings preference behavior', () => {
  it('applies light, dark, and system themes without changing other preferences', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect({ ...DEFAULT_SETTINGS, theme: 'dark' }).toMatchObject({ language: 'en', currency: 'INR', theme: 'dark' })
  })

  it('persists preferences and reads them back on a new app start', () => {
    const storage = memoryStorage()
    const saved = { ...DEFAULT_SETTINGS, theme: 'dark' as const, language: 'hi' as const, monthly_budget: '25000.00' }
    saveLocalPreferences(storage, saved)
    expect(readLocalPreferences(storage)).toMatchObject({
      theme: saved.theme,
      language: saved.language,
      monthly_budget: saved.monthly_budget,
    })
    expect(storage.getItem(PREFERENCE_STORAGE_KEY)).not.toContain('ai_configured')
  })

  it('ignores invalid/corrupt saved preference data and does not expose credentials', () => {
    const storage = memoryStorage()
    storage.setItem(PREFERENCE_STORAGE_KEY, '{bad json')
    expect(readLocalPreferences(storage)).toEqual({})
    const api = settingsFromApi({ theme: 'dark', currency: 'INR', ai_configured: true, monthly_budget: '50.00' })
    expect(api).toMatchObject({ theme: 'dark', ai_configured: true, monthly_budget: '50.00' })
    expect(api).not.toHaveProperty('api_key')
  })

  it('validates budgets and alert thresholds', () => {
    expect(validateSettingsPreferences({ ...DEFAULT_SETTINGS, alerts_enabled: true })).toHaveProperty('monthly_budget')
    expect(validateSettingsPreferences({ ...DEFAULT_SETTINGS, monthly_budget: '-5' })).toHaveProperty('monthly_budget')
    expect(validateSettingsPreferences({ ...DEFAULT_SETTINGS, monthly_budget: '100.00', alert_threshold: 101 })).toHaveProperty('alert_threshold')
    expect(validateSettingsPreferences({ ...DEFAULT_SETTINGS, category_budgets: { Shopping: '' } })).toHaveProperty('category:Shopping')
    expect(validateSettingsPreferences({ ...DEFAULT_SETTINGS, monthly_budget: '100.00', category_budgets: { Shopping: '25.50' }, alerts_enabled: true, alert_threshold: 80 })).toEqual({})
  })

  it('provides native language options, locale information, and Arabic direction', () => {
    expect(LANGUAGE_OPTIONS.map(option => option.nativeName)).toEqual([
      'English', 'తెలుగు', 'हिन्दी', 'தமிழ்', 'ಕನ್ನಡ', 'മലയാളം',
      'বাংলা', 'मराठी', 'Español', 'Français', 'العربية', '简体中文',
    ])
    expect(getLanguageLocale('hi')).toBe('hi-IN')
    expect(getLanguageLocale('zh-CN')).toBe('zh-CN')
    expect(getLanguageDirection('ar')).toBe('rtl')
    expect(getLanguageDirection('en')).toBe('ltr')
  })

  it('has translated Settings strings for every listed language and falls back to English', () => {
    for (const { code } of LANGUAGE_OPTIONS) {
      expect(Object.keys(SETTINGS_TRANSLATIONS[code]).sort()).toEqual(translationKeys().sort())
      expect(SETTINGS_TRANSLATIONS[code].title.length).toBeGreaterThan(0)
    }
    expect(SETTINGS_TRANSLATIONS.en.save).toBe('Save Changes')
    expect(translateSettings('invalid' as never, 'save')).toBe('Save Changes')
  })
})
