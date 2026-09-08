import { notFound, redirect } from 'next/navigation';
import PhysicianSite from '@/components/physician-site';
import { getDictionary, localizedMetadata } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return localizedMetadata(locale);
}
export default async function LocalizedPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === 'ru') redirect('/');
  return <PhysicianSite locale={locale} t={getDictionary(locale)} />;
}
