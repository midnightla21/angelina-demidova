'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { MotionWords } from '@/components/site-motion';
import type { Dictionary } from '@/lib/i18n';

type GuideId = 'preparation' | 'first-visit';

function Guide({ id, number, title, open, onToggle, t, notice, children, important }: {
  id: GuideId; number: string; title: string; open: boolean; onToggle: () => void;
  t: Dictionary; notice: ReactNode; children: ReactNode; important: ReactNode;
}) {
  return <article id={id} className="patient-guide">
    <div className="guide-titlebar">
      <span className="guide-number">{number}</span>
      <h3 id={`${id}-title`}>{title}</h3>
      <button className="guide-toggle" type="button" aria-expanded={open} aria-controls={`${id}-content`} aria-labelledby={`${id}-action ${id}-title`} onClick={onToggle}>
        <span id={`${id}-action`}>{open ? t.closeGuide : t.readGuide}</span><span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
    </div>
    <div className="guide-reading">
      {notice}
      <div id={`${id}-content`} className={`guide-detail${open ? ' is-open' : ''}`} role="region" aria-labelledby={`${id}-title`} aria-hidden={!open} inert={!open}>
        <div className="guide-detail-inner"><div className="guide-text">{children}</div></div>
      </div>
      <aside className="guide-important"><h4>{t.guideImportant}</h4>{important}</aside>
    </div>
  </article>;
}

export function PatientGuides({ t }: { t: Dictionary }) {
  const [opened, setOpened] = useState<Record<GuideId, boolean>>({ preparation: false, 'first-visit': false });
  useEffect(() => {
    let alive = true, firstFrame = 0, secondFrame = 0;
    const openHash = (hash: string) => {
      if (hash !== '#preparation' && hash !== '#first-visit') return;
      const id = hash.slice(1) as GuideId;
      setOpened(previous => previous[id] ? previous : { ...previous, [id]: true });
    };
    const hashChange = () => openHash(location.hash);
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (link) openHash(link.hash);
    };
    hashChange();
    // The scroll-driven hero gains its full height after hydration. Align a
    // directly opened guide only after that layout and the initial open state.
    const initialHash = location.hash;
    if (['#patient-guide', '#preparation', '#first-visit'].includes(initialHash)) {
      document.fonts.ready.then(() => {
        if (!alive || location.hash !== initialHash) return;
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => {
            if (alive && location.hash === initialHash) document.getElementById(initialHash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' });
          });
        });
      });
    }
    addEventListener('hashchange', hashChange);
    document.addEventListener('click', click);
    return () => { alive = false; cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); removeEventListener('hashchange', hashChange); document.removeEventListener('click', click); };
  }, []);
  const toggle = (id: GuideId) => setOpened(previous => ({ ...previous, [id]: !previous[id] }));
  return <section className="section patient-guides" id="patient-guide">
    <div className="section-label"><span>06</span><span>{t.guidesLabel}</span></div>
    <h2 data-reveal aria-label={`${t.guidesHeading} ${t.guidesHeadingMuted}`}><MotionWords text={t.guidesHeading} /><br /><span className="muted"><MotionWords text={t.guidesHeadingMuted} /></span></h2>
    <Guide id="preparation" number="01" title={t.prepTitle} open={opened.preparation} onToggle={() => toggle('preparation')} t={t}
      notice={<div className="guide-note"><h4>{t.prepNoTitle}</h4><p>{t.prepNoLead}</p><ul><li>{t.prepNo1}</li><li>{t.prepNo2}</li><li>{t.prepNo3}</li></ul><p>{t.prepNoAfter}</p></div>}
      important={<p>{t.prepImportant}</p>}>
      <div><h4>{t.prepFoodTitle}</h4><p>{t.prepFoodText}</p></div>
      <div><h4>{t.prepMorningTitle}</h4><p>{t.prepMorningText}</p></div>
      <div><h4>{t.prepAfternoonTitle}</h4><p>{t.prepAfternoonText}</p></div>
      <div><h4>{t.prepBringTitle}</h4><ul><li>{t.prepBring1}</li><li>{t.prepBring2}</li><li>{t.prepBring3}</li></ul><p>{t.prepMissingDocs}</p></div>
    </Guide>
    <Guide id="first-visit" number="02" title={t.visitTitle} open={opened['first-visit']} onToggle={() => toggle('first-visit')} t={t}
      notice={<p className="guide-reassurance">{t.visitPause}</p>}
      important={<><p>{t.visitImportant1}</p><p>{t.visitImportant2}</p></>}>
      <div><h4>{t.visitTalkTitle}</h4><p>{t.visitTalkText1}</p><p>{t.visitTalkText2}</p></div>
      <div><h4>{t.visitExamTitle}</h4><p>{t.visitExamText1}</p><p>{t.visitExamText2}</p><p>{t.visitExamText3}</p></div>
      <div><h4>{t.visitPainTitle}</h4><p>{t.visitPainText1}</p><p>{t.visitPainText2}</p></div>
      <div><h4>{t.visitPlanTitle}</h4><p>{t.visitPlanText1}</p><p>{t.visitPlanText2}</p></div>
    </Guide>
  </section>;
}
