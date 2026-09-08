import type { Metadata } from 'next';
import ru from './translations/ru.json';
import en from './translations/en.json';
import uz from './translations/uz.json';
import tg from './translations/tg.json';
import vi from './translations/vi.json';
import zh from './translations/zh.json';
import { languages, localePath, type Locale } from './locales';
export type Dictionary = Record<keyof typeof ru, string>;
const dictionaries: Record<Locale, Dictionary> = { ru, en, uz, tg, vi, zh };
export function getDictionary(locale: Locale): Dictionary { return dictionaries[locale]; }
export function localizedMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: {
      canonical: localePath(locale),
      languages: Object.fromEntries([...languages.map((language) => [language.lang, localePath(language.code)]), ['x-default', '/']]),
    },
  };
}
