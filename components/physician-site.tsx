'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { X, Globe2, ChevronDown, Check } from 'lucide-react';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { languages, localePath, type Locale } from '@/lib/locales';
import { MotionWords, useSiteMotion } from '@/components/site-motion';
import { PortraitGallery } from '@/components/portrait-gallery';
import type { Dictionary } from '@/lib/i18n';

const medsi = 'https://medsi.ru/doctors/demidova-angelina-olegovna/';
const sm = 'https://www.smclinic.ru/rezume/demidova-angelina-olegovna/';
const medsiBooking = 'https://smartmed.pro/doctors/s/e8af5eda-b36c-42cb-a5ba-2d63c50a38c4/?isRecordable=true';
const smBooking = 'https://www.smclinic.ru/appointment/?doctorId=79a2862d-faa1-11eb-80c4-00505687cb95';
const reviews = 'https://napopravku.ru/moskva/doctor-profile/demidova-angelina-olegovna/';
const interview = 'https://izhlife.ru/beautyandhealth/87932-est-li-spasenie-ot-gemorroya.html';
function Lines({ text }: { text: string }) { return text.split('\n').map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>); }
function External({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}<span aria-hidden="true"> ↗</span></a>;
}
function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return <div className="section-label"><span>{n}</span><span>{children}</span></div>;
}
function Heading({ start, end }: { start: string; end: string }) { return <h2 data-reveal><MotionWords text={start} /><br /><span className="muted"><MotionWords text={end} /></span></h2>; }
function LanguageMenu({ locale, t }: { locale: Locale; t: Dictionary }) {
  return <DropdownMenu><DropdownMenuTrigger className="language-trigger" aria-label={t.language}><Globe2 size={17} strokeWidth={1.5} /><span>{locale.toUpperCase()}</span><ChevronDown size={13} /></DropdownMenuTrigger><DropdownMenuContent className="language-menu" align="end" sideOffset={12}>{languages.map((item) => <DropdownMenuItem key={item.code} className="language-option" render={<a href={localePath(item.code)} hrefLang={item.lang} lang={item.lang} aria-current={locale === item.code ? 'page' : undefined} />}><span>{item.label}</span>{locale === item.code && <Check size={15} aria-hidden="true" />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}

export default function PhysicianSite({ locale, t }: { locale: Locale; t: Dictionary }) {
  const root = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  useSiteMotion(root, paused);
  const [portraitReady, setPortraitReady] = useState(false);
  const navigation = [[t.navApproach, '#approach'], [t.navPractice, '#practice'], [t.navAppointment, '#appointment']];
  const elsewhere = [[t.medsi, medsi], [t.sm, sm], [t.reviews, reviews]];
  const steps = [[t.step1Title, t.step1Text], [t.step2Title, t.step2Text], [t.step3Title, t.step3Text], [t.step4Title, t.step4Text]];
  const methods = [[t.method1Title, t.method1Text], [t.method2Title, t.method2Text], [t.method3Title, t.method3Text], [t.method4Title, t.method4Text], [t.method5Title, t.method5Text]];
  useEffect(() => {
    let active = true;
    Promise.all(['/images/angelina-original.jpg', '/images/angelina-occlusion-alpha.png'].map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    })).then(() => { if (active) setPortraitReady(true); }).catch(() => {
      // Retain the original portrait if its decorative mask cannot be loaded.
    });
    return () => { active = false; };
  }, []);
  return (
    <main ref={root} className={`locale-${locale}${paused ? ' motion-paused' : ''}`}>
      <a className="skip-link" href="#approach">{t.skipContent}</a>
      <section className="hero-scene" id="top" aria-label={t.heroLabel}><div className="hero-stage"><div className="hero">
        <img className="hero-photo hero-background" src="/images/angelina-original.jpg" alt="" fetchPriority="high" />
        <div className="hero-shade" />
        <header className="hero-header">
          <a className="brand entrance" href="#top" style={{ animationDelay: '800ms' }}>{t.firstName}</a>
          <span className="header-year entrance" style={{ animationDelay: '900ms' }}>2026</span>
          <nav className="desktop-nav" aria-label={t.sectionsLabel}>{navigation.map(([label, href], i) => <a className="entrance" key={href} href={href} style={{ animationDelay: `${1000 + i * 80}ms` }}>{label}</a>)}</nav>
          <nav className="desktop-nav" aria-label={t.profilesLabel}>{elsewhere.map(([label, href]) => <External className="entrance" key={href} href={href}>{label}</External>)}</nav>
          <LanguageMenu locale={locale} t={t} />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger className="mobile-menu-button entrance" aria-label={t.openMenu}><span /><span /></SheetTrigger>
            <SheetContent className="mobile-drawer" showCloseButton={false}>
              <div className="drawer-top"><SheetTitle>{t.name}</SheetTitle><SheetClose className="drawer-close" aria-label={t.closeMenu}><X size={26} strokeWidth={1.5} /></SheetClose></div>
              <SheetDescription className="sr-only">{t.menuDescription}</SheetDescription>
              <nav className="drawer-main" aria-label={t.mobileNav}>{navigation.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
              <nav className="drawer-elsewhere" aria-label={t.clinicProfiles}>{elsewhere.map(([label, href]) => <External key={href} href={href}>{label}</External>)}</nav>
              <nav className="drawer-languages" aria-label={t.language}><span>{t.languageNote}</span>{languages.map((item) => <a key={item.code} href={localePath(item.code)} lang={item.lang} hrefLang={item.lang} aria-current={locale === item.code ? 'page' : undefined}>{item.label}</a>)}</nav>
              <div className="drawer-bottom">{t.specialty}<br />{t.city}, 2026</div>
            </SheetContent>
          </Sheet>
        </header>
        <h1 className="sr-only">{t.h1}</h1>
        <div className={`name-window${portraitReady ? ' is-ready entrance' : ''}`} style={{ animationDelay: '150ms' }} aria-hidden="true"><div className="name-track"><span>{t.name}</span><span>{t.name}</span></div></div>
        <img className="hero-photo hero-foreground" src="/images/angelina-original.jpg" alt="" aria-hidden="true" />
        <nav className="hero-booking" aria-label={t.navAppointment}>
          <span className="hero-booking-label">{t.book}</span>
          <div className="hero-booking-links">
            <External className="hero-booking-link" href={medsiBooking}><span>{t.medsi}<small>{t.solyanka} · SmartMed</small></span></External>
            <External className="hero-booking-link" href={smBooking}><span>{t.sm}<small>{t.textilshchiki}</small></span></External>
          </div>
        </nav>
        <div className="hero-rule" />
        <div className="hero-footer"><div className="entrance" style={{ animationDelay: '1400ms' }}>{t.surgeon}<br />{t.coloproctologist}<br /><span className="hero-city">{t.city}</span></div><div className="hero-statement entrance" style={{ animationDelay: '1550ms' }}><Lines text={t.heroStatement} /><a href="#approach">{t.myApproach} <span aria-hidden="true">↓</span></a></div></div>
      </div><div className="hero-chapter"><span className="eyebrow">{t.specialty}</span><p><MotionWords text={t.heroStatement} /></p><a className="chapter-link" href="#approach">{t.myApproach} <span aria-hidden="true">↓</span></a></div></div></section>
      <section className="section approach" id="approach">
        <SectionLabel n="01">{t.approachLabel}</SectionLabel>
        <div className="two-columns"><Heading start={t.approachHeading} end={t.approachHeadingMuted} /><div className="prose" data-reveal><p className="lead">{t.approachLead}</p><p>{t.approachText}</p><p className="core">{t.approachCore}</p></div></div>
        <ol className="care-steps">{steps.map(([title, text], i) => <li key={title} data-reveal style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}><span className="step-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>
      <section className="section practice dark" id="practice">
        <SectionLabel n="02">{t.practiceLabel}</SectionLabel>
        <Heading start={t.practiceHeading} end={t.practiceHeadingMuted} />
        <div className="metrics"><div data-reveal><span className="metric-kicker">{t.metric1Kicker}</span><strong>2016</strong><p><Lines text={t.metric1Text} /></p></div><div data-reveal><span className="metric-kicker">{t.metric2Kicker}</span><strong>2 500</strong><p><Lines text={t.metric2Text} /></p></div><div data-reveal><span className="metric-kicker">{t.metric3Kicker}</span><strong>700+</strong><p><Lines text={t.metric3Text} /></p></div></div>
        <p className="count-note">{t.countNote}</p>
        <div className="clinical-grid"><div><h3 className="clinical-title"><Lines text={t.clinicalHeading} /></h3><p className="clinical-description">{t.clinicalText1}</p><p className="clinical-description">{t.clinicalText2}</p></div><Accordion className="methods">{methods.map(([title, text], i) => <AccordionItem key={title} value={`method-${i}`} className="method-item"><AccordionTrigger className="method-trigger">{title}</AccordionTrigger><AccordionContent className="method-content">{text}</AccordionContent></AccordionItem>)}</Accordion></div>
      </section>
      <section className="section recovery" id="recovery">
        <SectionLabel n="03">{t.recoveryLabel}</SectionLabel>
        <div className="two-columns"><Heading start={t.recoveryHeading} end={t.recoveryHeadingMuted} /><div className="prose" data-reveal><p className="lead">{t.recoveryLead}</p><p>{t.recoveryText1}</p><p>{t.recoveryText2}</p></div></div>
        <a className="archive-link" href={interview} target="_blank" rel="noopener noreferrer"><span className="archive-year">2019</span><div><span className="eyebrow">{t.archiveEyebrow}</span><h3>{t.archiveTitle}</h3><p>{t.archiveText}</p></div><span className="archive-arrow" aria-hidden="true">↗</span></a>
      </section>
      <section className="section voices" id="voices">
        <SectionLabel n="04">{t.voicesLabel}</SectionLabel>
        <Heading start={t.voicesHeading} end={t.voicesHeadingMuted} />
        <div className="quotes"><figure data-reveal><blockquote>{t.quote1}</blockquote><figcaption><span>{t.quote1By}</span><External href={sm}>{t.quote1Source}</External></figcaption></figure><figure data-reveal><blockquote>{t.quote2}</blockquote><figcaption><span>{t.quote2By}</span><External href={reviews}>{t.quote2Source}</External></figcaption></figure></div>
        {locale !== 'ru' && <p className="translation-note">{t.quotesTranslation}</p>}
      </section>
      <PortraitGallery t={t} paused={paused} />
      <section className="section credentials" id="credentials">
        <SectionLabel n="05">{t.credentialsLabel}</SectionLabel>
        <div className="two-columns"><Heading start={t.credentialsHeading} end={t.credentialsHeadingMuted} /><ol className="timeline"><li><time>2016</time><div><h3>{t.timeline1Title}</h3><p>{t.timeline1Text}</p></div></li><li><time>2017</time><div><h3>{t.timeline2Title}</h3><p>{t.timeline2Text}</p></div></li><li><span>2016–2021</span><div><h3>{t.timeline3Title}</h3><p>{t.timeline3Text}</p></div></li><li><span>{t.since2021}</span><div><h3>{t.sm}</h3><p>{t.timeline4Text}</p></div></li><li><span>{t.since2024}</span><div><h3>{t.timeline5Title}</h3><p>{t.timeline5Text}</p></div></li></ol></div>
        <div className="accreditations"><span className="eyebrow">{t.accreditations}</span><p>{t.surgery}<span>{t.surgeryUntil}</span></p><p>{t.coloproctology}<span>{t.coloproctologyUntil}</span></p></div>
        <External className="credentials-source" href={sm}>{t.credentialsSource}</External>
      </section>
      <section className="section appointment dark" id="appointment">
        <SectionLabel n="06">{t.appointmentLabel}</SectionLabel>
        <Heading start={t.appointmentHeading} end={t.appointmentHeadingMuted} /><p className="appointment-intro"><Lines text={t.appointmentIntro} /></p>
        <div className="clinics"><External className="clinic" href={medsiBooking}><h3>{t.medsi}<span>{t.solyanka}</span></h3><p><Lines text={t.solyankaAddress} /><span>{t.solyankaMetro}</span></p><span className="clinic-action">{t.book}</span></External><External className="clinic" href={smBooking}><h3>{t.sm}<span>{t.textilshchiki}</span></h3><p><Lines text={t.textilshchikiAddress} /><span>{t.textilshchikiMetro}</span></p><span className="clinic-action">{t.book}</span></External></div>
        {locale !== 'ru' && <p className="booking-language-note">{t.bookingLanguageNote}</p>}
        <p className="medical-note">{t.medicalNote}</p>
      </section>
      <footer className="site-footer"><a href="#top">{t.name} ↑</a><span>{t.specialty}</span><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? t.resumeMotion : t.pauseMotion}</button><span>© 2026</span><nav className="footer-languages" aria-label={t.language}>{languages.map((item) => <a key={item.code} href={localePath(item.code)} hrefLang={item.lang} lang={item.lang} aria-current={locale === item.code ? 'page' : undefined}>{item.label}</a>)}</nav></footer>
    </main>
  );
}
