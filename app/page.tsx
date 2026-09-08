import PhysicianSite from '@/components/physician-site';
import { getDictionary, localizedMetadata } from '@/lib/i18n';
export const metadata = localizedMetadata('ru');
export default function Home() { return <PhysicianSite locale="ru" t={getDictionary('ru')} />; }
