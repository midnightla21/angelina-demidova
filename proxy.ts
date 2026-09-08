import { NextResponse, type NextRequest } from 'next/server';
import { isLocale } from './lib/locales';

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split('/')[1];
  const headers = new Headers(request.headers);
  headers.set('x-angelina-locale', isLocale(segment) ? segment : 'ru');
  return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/', '/en', '/uz', '/tg', '/vi', '/zh', '/ru'] };
