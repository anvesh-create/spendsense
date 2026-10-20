export const PREFERENCE_STORAGE_KEY = 'spendsense.preferences.v1'

export type ThemePreference = 'light' | 'dark' | 'system'
export type LanguageCode =
  | 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml' | 'bn' | 'mr'
  | 'es' | 'fr' | 'ar' | 'zh-CN'

export type SettingsPreferences = {
  theme: ThemePreference
  currency: string
  agent_enabled: boolean
  hosted_ai_enabled: boolean
  ai_configured: boolean
  language: LanguageCode
  monthly_budget: string
  category_budgets: Record<string, string>
  alerts_enabled: boolean
  alert_threshold: number
  alert_on_reached: boolean
  alert_on_exceeded: boolean
  reduced_motion: boolean
  date_format: 'locale' | 'dmy' | 'mdy' | 'iso'
}

export const DEFAULT_SETTINGS: SettingsPreferences = {
  theme: 'system',
  currency: 'INR',
  agent_enabled: true,
  hosted_ai_enabled: false,
  ai_configured: false,
  language: 'en',
  monthly_budget: '',
  category_budgets: {},
  alerts_enabled: false,
  alert_threshold: 80,
  alert_on_reached: true,
  alert_on_exceeded: true,
  reduced_motion: false,
  date_format: 'locale',
}

const languages: LanguageCode[] = ['en', 'te', 'hi', 'ta', 'kn', 'ml', 'bn', 'mr', 'es', 'fr', 'ar', 'zh-CN']
const currencies = ['INR', 'USD', 'EUR', 'GBP']
const dateFormats = ['locale', 'dmy', 'mdy', 'iso']

export function resolveTheme(theme: ThemePreference, systemDark: boolean): 'light' | 'dark' {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

export function getLanguageLocale(language: LanguageCode): string {
  const locale: Record<LanguageCode, string> = {
    en: 'en-IN', te: 'te-IN', hi: 'hi-IN', ta: 'ta-IN', kn: 'kn-IN', ml: 'ml-IN',
    bn: 'bn-IN', mr: 'mr-IN', es: 'es-ES', fr: 'fr-FR', ar: 'ar', 'zh-CN': 'zh-CN',
  }
  return locale[language]
}

export function getLanguageDirection(language: LanguageCode): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr'
}

export function validateSettingsPreferences(settings: SettingsPreferences): Record<string, string> {
  const errors: Record<string, string> = {}
  const validateAmount = (value: string, label: string) => {
    if (!value.trim()) return
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
      errors[label] = 'Enter an amount greater than zero with up to two decimal places.'
    }
  }
  validateAmount(settings.monthly_budget, 'monthly_budget')
  for (const [category, amount] of Object.entries(settings.category_budgets)) {
    if (!amount.trim()) errors[`category:${category}`] = 'Enter an amount greater than zero with up to two decimal places.'
    else validateAmount(amount, `category:${category}`)
  }
  if (!Number.isInteger(settings.alert_threshold) || settings.alert_threshold < 1 || settings.alert_threshold > 100) {
    errors.alert_threshold = 'Choose a percentage from 1 to 100.'
  }
  if (settings.alerts_enabled && !settings.monthly_budget.trim() && !Object.keys(settings.category_budgets).length) {
    errors.monthly_budget = 'Add an overall or category budget before enabling alert preferences.'
  }
  if (!languages.includes(settings.language)) errors.language = 'Choose one of the listed languages.'
  if (!currencies.includes(settings.currency)) errors.currency = 'Choose a supported currency.'
  if (!dateFormats.includes(settings.date_format)) errors.date_format = 'Choose a supported date format.'
  return errors
}

export function saveLocalPreferences(storage: Pick<Storage, 'setItem'>, settings: SettingsPreferences): void {
  const { ai_configured: _configurationStatus, ...preferences } = settings
  storage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences))
}

export function readLocalPreferences(storage: Pick<Storage, 'getItem'>): Partial<SettingsPreferences> {
  try {
    const raw = storage.getItem(PREFERENCE_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const value = parsed as Record<string, unknown>
    const result: Partial<SettingsPreferences> = {}
    if (value.theme === 'light' || value.theme === 'dark' || value.theme === 'system') result.theme = value.theme
    if (typeof value.currency === 'string' && currencies.includes(value.currency)) result.currency = value.currency
    if (typeof value.agent_enabled === 'boolean') result.agent_enabled = value.agent_enabled
    if (typeof value.hosted_ai_enabled === 'boolean') result.hosted_ai_enabled = value.hosted_ai_enabled
    if (typeof value.language === 'string' && languages.includes(value.language as LanguageCode)) result.language = value.language as LanguageCode
    if (typeof value.monthly_budget === 'string') result.monthly_budget = value.monthly_budget
    if (value.category_budgets && typeof value.category_budgets === 'object' && !Array.isArray(value.category_budgets)) {
      result.category_budgets = Object.fromEntries(
        Object.entries(value.category_budgets).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      )
    }
    if (typeof value.alerts_enabled === 'boolean') result.alerts_enabled = value.alerts_enabled
    if (typeof value.alert_threshold === 'number') result.alert_threshold = value.alert_threshold
    if (typeof value.alert_on_reached === 'boolean') result.alert_on_reached = value.alert_on_reached
    if (typeof value.alert_on_exceeded === 'boolean') result.alert_on_exceeded = value.alert_on_exceeded
    if (typeof value.reduced_motion === 'boolean') result.reduced_motion = value.reduced_motion
    if (typeof value.date_format === 'string' && dateFormats.includes(value.date_format)) result.date_format = value.date_format as SettingsPreferences['date_format']
    return result
  } catch {
    return {}
  }
}

export function settingsFromApi(value: Record<string, unknown>): Partial<SettingsPreferences> {
  const preferences = readLocalPreferences({
    getItem: () => JSON.stringify(value),
  })
  if (typeof value.ai_configured === 'boolean') preferences.ai_configured = value.ai_configured
  if (value.monthly_budget === null) preferences.monthly_budget = ''
  else if (typeof value.monthly_budget === 'number' || typeof value.monthly_budget === 'string') preferences.monthly_budget = String(value.monthly_budget)
  if (value.category_budgets && typeof value.category_budgets === 'object' && !Array.isArray(value.category_budgets)) {
    preferences.category_budgets = Object.fromEntries(
      Object.entries(value.category_budgets).map(([category, amount]) => [category, String(amount)]),
    )
  }
  return preferences
}
