import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { htmlLanguage, isLocale } from '@/lib/locales';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://angelina-demidova.ru'),
  robots: { index: true, follow: true },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestedLocale = (await headers()).get('x-angelina-locale') || 'ru';
  const locale = isLocale(requestedLocale) ? requestedLocale : 'ru';
  return <html lang={htmlLanguage(locale)}><head><link rel="stylesheet" href="https://db.onlinewebfonts.com/c/95cecf452d3208890088a5b4c19c7ecf?family=Helvetica+Neue+ME" /></head><body>{children}</body></html>;
}
