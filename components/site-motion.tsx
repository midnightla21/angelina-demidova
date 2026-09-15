'use client';

import { Fragment, useEffect, type RefObject } from 'react';

export function MotionWords({ text }: { text: string }) {
  let index = 0;
  return <span className="motion-words"><span className="sr-only">{text}</span><span aria-hidden="true">{text.split('\n').map((line, lineIndex) => <Fragment key={lineIndex}>{lineIndex > 0 && <br />}{( /[\u4e00-\u9fff]/.test(line) ? Array.from(line) : line.split(/(\s+)/)).map((word, i) => /^\s+$/.test(word) ? word : <span className="word-wrap" key={i}><span className="word" style={{ '--word-i': index++ } as React.CSSProperties}>{word}</span></span>)}</Fragment>)}</span></span>;
}

/** One scheduled frame per scroll event; no animation loop while the page is idle. */
export function useSiteMotion(rootRef: RefObject<HTMLElement | null>, paused: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 900px) and (min-height: 600px)');
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const hero = root.querySelector<HTMLElement>('.hero-scene');
    const care = root.querySelector<HTMLElement>('.care-steps');
    const practice = root.querySelector<HTMLElement>('.practice h2');
    const quotes = [...root.querySelectorAll<HTMLElement>('.quotes figure')];
    const progress = (value: number) => Math.max(0, Math.min(1, value));
    const update = () => {
      frame = 0;
      const height = innerHeight;
      if (hero && desktop.matches) {
        const rect = hero.getBoundingClientRect();
        const p = progress(-rect.top / Math.max(1, rect.height - height));
        hero.style.setProperty('--hero-p', p.toFixed(4));
        hero.dataset.condensed = String(p > .16);
        hero.dataset.chapter = String(p > .72);
      }
      if (care) {
        const rect = care.getBoundingClientRect();
        care.style.setProperty('--care-p', progress((height * .8 - rect.top) / (height * .55)).toFixed(4));
      }
      if (practice) {
        const p = progress((height * .9 - practice.getBoundingClientRect().top) / (height * .65));
        practice.style.setProperty('--read-p', p.toFixed(4));
      }
      quotes.forEach((quote) => {
        const p = progress((height - quote.getBoundingClientRect().top) / height);
        quote.style.setProperty('--quote-p', p.toFixed(4));
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      const enabled = !paused && !reduce.matches;
      root.classList.toggle('motion-ready', enabled);
      root.classList.toggle('motion-static', !enabled);
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => {
        if (!enabled) el.classList.add('is-visible');
        else if (el.getBoundingClientRect().top > innerHeight) el.classList.remove('is-visible');
      });
      if (!enabled) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: .08, rootMargin: '0px 0px -6% 0px' });
      root.querySelectorAll('[data-reveal]').forEach(el => observer?.observe(el));
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule, { passive: true });
      update();
    };
    configure();
    reduce.addEventListener('change', configure);
    desktop.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', schedule);
      reduce.removeEventListener('change', configure);
      desktop.removeEventListener('change', configure);
    };
  }, [rootRef, paused]);
}
