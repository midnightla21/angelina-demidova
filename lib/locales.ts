export const languages = [
  { code: 'ru', lang: 'ru', label: 'Русский' },
  { code: 'en', lang: 'en', label: 'English' },
  { code: 'uz', lang: 'uz-Latn', label: 'O‘zbekcha' },
  { code: 'tg', lang: 'tg', label: 'Тоҷикӣ' },
  { code: 'vi', lang: 'vi', label: 'Tiếng Việt' },
  { code: 'zh', lang: 'zh-Hans', label: '中文' },
] as const;
export type Locale = typeof languages[number]['code'];
export function isLocale(value: string): value is Locale {
  return languages.some((language) => language.code === value);
}
export function localePath(locale: Locale): string { return locale === 'ru' ? '/' : `/${locale}`; }
export function htmlLanguage(locale: Locale): string { return languages.find((item) => item.code === locale)!.lang; }
