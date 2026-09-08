import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = new URL(process.env.SITE_EXPORT_ORIGIN || 'http://localhost:3001');
assert.ok(['localhost', '127.0.0.1'].includes(origin.hostname), 'Export the local production build, not a hosted response');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const release = `vps-${commit.slice(0, 12)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const releaseDir = path.join(root, 'outputs', release);
const output = path.join(releaseDir, 'public');
await mkdir(output, { recursive: true });
await cp(path.join(root, 'dist/client'), output, { recursive: true, filter: source => path.basename(source) !== '_headers' });
const languages = { ru: 'ru', en: 'en', uz: 'uz-Latn', tg: 'tg', vi: 'vi', zh: 'zh-Hans' };
const pages = [];
let compatibilityId;
for (const [locale, lang] of Object.entries(languages)) {
  const route = locale === 'ru' ? '/' : `/${locale}`;
  const name = locale === 'ru' ? 'index' : locale;
  const response = await fetch(new URL(route, origin), { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.match(html, new RegExp(`<html[^>]*lang="${lang}"`));
  assert.match(html, /<\/html>/);
  assert.ok(html.includes('vinext.navigationRuntime'), 'Retain the inline hydration bootstrap');
  assert.ok(html.includes('.rsc.push('), 'Retain the complete inline React payload');
  assert.ok(html.includes('hero-photo hero-foreground'), 'Retain the portrait depth layer');
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"?]+)"/g)) {
    assert.ok((await readFile(path.join(output, match[1]))).length, `Missing client asset ${match[1]}`);
  }
  const rsc = await fetch(new URL(`${route}?_rsc`, origin), {
    headers: { RSC: '1', Accept: 'text/x-component' },
    redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
  assert.equal(rsc.status, 200, `RSC ${route}`);
  assert.match(rsc.headers.get('content-type') || '', /text\/x-component/);
  const currentId = rsc.headers.get('x-vinext-rsc-compatibility-id');
  assert.ok(currentId);
  compatibilityId ??= currentId;
  assert.equal(currentId, compatibilityId, 'All pages must come from the same running build');
  await writeFile(path.join(output, `${name}.html`), html);
  await writeFile(path.join(output, `${name}.rsc`), await rsc.text());
  pages.push({ route, lang, bytes: Buffer.byteLength(html) });
}
const notFound = await fetch(new URL('/fr', origin), { signal: AbortSignal.timeout(20000) });
assert.equal(notFound.status, 404);
await writeFile(path.join(output, '404.html'), await notFound.text());
const siteConfig = `
  root * /srv/angelina/current
  encode zstd gzip
  header X-Content-Type-Options nosniff
  header Referrer-Policy strict-origin-when-cross-origin
  @russianAlias path /ru /ru/
  redir @russianAlias / 308
  @rsc header RSC 1
  handle @rsc {
    header Content-Type text/x-component
    header X-Vinext-RSC-Compatibility-Id ${compatibilityId}
    header Cache-Control no-cache
    route {
      @rootPage path /
      rewrite @rootPage /index
      try_files {path}.rsc =404
      file_server
    }
  }
  handle {
    @assets path /_next/static/*
    header @assets Cache-Control "public, max-age=31536000, immutable"
    route {
      try_files {path} {path}.html {path}/index.html =404
      file_server
    }
  }
  handle_errors {
    rewrite * /404.html
    file_server
  }
`;
await writeFile(path.join(releaseDir, 'Caddyfile'), `angelina-demidova.ru {${siteConfig}}\n`);
await writeFile(path.join(releaseDir, 'Caddyfile.staging'), `http://angelina-demidova.ru {${siteConfig}}\n`);
await writeFile(path.join(releaseDir, 'release.json'), JSON.stringify({ commit, createdAt: new Date().toISOString(), compatibilityId, pages }, null, 2));
console.log(JSON.stringify({ releaseDir, pages, compatibilityId }, null, 2));
