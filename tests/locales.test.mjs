import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin = process.env.SITE_TEST_ORIGIN || 'http://localhost:3001';
const site = 'https://angelina-demidova.ru';
function siteFetch(url, options = {}) {
 const headers = new Headers(options.headers);
 if (process.env.SITE_TEST_AUTHORIZATION) headers.set('OAI-Sites-Authorization', 'Bearer ' + process.env.SITE_TEST_AUTHORIZATION);
 return fetch(url, { redirect: 'manual', ...options, headers });
}
const locales = { ru:'ru', en:'en', uz:'uz-Latn', tg:'tg', vi:'vi', zh:'zh-Hans' };
const dictionaries = Object.fromEntries(Object.keys(locales).map(locale => [locale, JSON.parse(fs.readFileSync(new URL(`../lib/translations/${locale}.json`, import.meta.url), 'utf8'))]));
function decode(text) { return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#x27;|&#39;|&apos;/g,"'"); }
test('All six dictionaries are complete, with no empty values', () => {
  const expected=Object.keys(dictionaries.ru).sort();
  for(const [locale,t] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(t).sort(),expected,locale);
    assert.ok(Object.values(t).every(value => typeof value === 'string' && value.trim().length > 0),locale);
    assert.match(t.countNote,/700\+/);
    assert.match(t.countNote.replace(/[\s,\u202f\u00a0]/g,''),/2500/);
    assert.match(t.surgeryUntil,/2027/);
    assert.match(t.coloproctologyUntil,/2030/);
  }
});
for(const [locale,lang] of Object.entries(locales)) {
  test(`${locale}: direct route has translated server content, language and links`,async()=>{
    const path=locale==='ru'?'/':`/${locale}`;
    const response=await siteFetch(origin+path);
    assert.equal(response.status,200);
    const html=await response.text();
    assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex|nofollow|none/i);
    const robotsTag=html.match(/<meta\b[^>]*name="robots"[^>]*>/)?.[0] || '';
    assert.ok(robotsTag, 'robots metadata exists');
    assert.doesNotMatch(robotsTag, /noindex|nofollow|none/i);
    assert.match(html,new RegExp(`<html[^>]*lang="${lang}"`));
    assert.equal(decode(html.match(/<title>(.*?)<\/title>/s)?.[1]||''),dictionaries[locale].metaTitle);
    assert.equal(decode(html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]||''),dictionaries[locale].h1);
    const canonicalTag = html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] || '';
    const canonicalHref = canonicalTag.match(/href="([^"]+)"/)?.[1];
    assert.ok(canonicalHref, 'canonical exists');
    assert.equal(new URL(canonicalHref || '/', origin).href, new URL(path, site).href, 'localized canonical');
    const alternates=Object.fromEntries([...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*>/g)].map(([tag]) => [tag.match(/hreflang="([^"]+)"/i)?.[1], tag.match(/href="([^"]+)"/)?.[1]]));
    assert.equal(Object.keys(alternates).length, 7, 'six languages plus x-default');
    for(const [code,language] of Object.entries(locales)) {
      assert.equal(new URL(alternates[language]).href, new URL(code==='ru'?'/':`/${code}`,site).href, `${language} hreflang`);
    }
    assert.equal(new URL(alternates['x-default']).href,site+'/');
    for(const code of Object.keys(locales)) {
      const href=code==='ru'?'/':`/${code}`;
      assert.ok(html.includes(`href="${href}"`),`${code} switch link`);
    }
    assert.ok(html.includes('hero-photo hero-foreground'),'foreground layer preserved');
    assert.ok(html.includes('https://medsi.ru/doctors/demidova-angelina-olegovna/'),'real MEDSI booking');
    assert.ok(html.includes('https://www.smclinic.ru/rezume/demidova-angelina-olegovna/'),'real SM booking');
  });
}
test('Unknown language is 404 and Russian alias redirects to the original homepage',async()=>{
  const unknown=await siteFetch(origin+'/fr'); assert.equal(unknown.status,404);
  const alias=await siteFetch(origin+'/ru',{redirect:'manual'}); assert.ok([307,308].includes(alias.status));
  assert.equal(new URL(alias.headers.get('location'),origin).pathname,'/');
});

test('Portrait occlusion asset remains available at full resolution',async()=>{
 const response=await siteFetch(origin+'/images/angelina-occlusion-alpha.png');
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type')||'',/image\/png/);
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(bytes.readUInt32BE(16),3649);
 assert.equal(bytes.readUInt32BE(20),5444);
});

test('Search engines can discover all six canonical pages',async()=>{
 const robots=await siteFetch(origin+'/robots.txt');
 assert.equal(robots.status,200);
 assert.match(robots.headers.get('content-type')||'',/text\/plain/);
 const rules=await robots.text();
 assert.match(rules,/User-agent: \*/);
 assert.match(rules,/^Allow: \/$/m);
 assert.doesNotMatch(rules,/^Disallow:\s*\//m);
 assert.ok(rules.includes(`Sitemap: ${site}/sitemap.xml`));
 const sitemap=await siteFetch(origin+'/sitemap.xml');
 assert.equal(sitemap.status,200);
 assert.match(sitemap.headers.get('content-type')||'',/xml/);
 const xml=await sitemap.text();
 const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
 assert.deepEqual(urls,Object.keys(locales).map(code=>site+(code==='ru'?'/':`/${code}`)));
});
