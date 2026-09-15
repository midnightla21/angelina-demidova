'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { MotionWords } from '@/components/site-motion';
import type { Dictionary } from '@/lib/i18n';

const photos = [
  { src: '/images/gallery/portrait-22.jpg', width: 3649, height: 5444 },
  { src: '/images/gallery/portrait-12.jpg', width: 3649, height: 5444 },
  { src: '/images/gallery/portrait-23.jpg', width: 5444, height: 3649 },
  { src: '/images/gallery/portrait-13.jpg', width: 3649, height: 5444 },
  { src: '/images/angelina-original.jpg', width: 3649, height: 5444 },
];

export function PortraitGallery({ t, paused }: { t: Dictionary; paused: boolean }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const lightbox = useRef<HTMLImageElement>(null);
  const sourceRect = useRef<DOMRect | null>(null);
  const inertia = useRef(0);
  const drag = useRef({ down: false, x: 0, left: 0, lastX: 0, time: 0, velocity: 0, moved: false });
  const reduced = () => paused || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const next = Math.max(0, Math.min(photos.length - 1, active + direction));
    const card = element.children[next] as HTMLElement;
    element.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - element.clientWidth / 2, behavior: reduced() ? 'instant' : 'smooth' });
  };
  const track = () => {
    const element = rail.current;
    if (!element) return;
    if (element.scrollLeft <= 2) { setActive(0); return; }
    if (element.scrollLeft >= element.scrollWidth - element.clientWidth - 2) { setActive(photos.length - 1); return; }
    const center = element.getBoundingClientRect().left + element.clientWidth / 2;
    let closest = 0, distance = Infinity;
    [...element.children].forEach((card, i) => {
      const rect = card.getBoundingClientRect();
      const delta = Math.abs(rect.left + rect.width / 2 - center);
      if (delta < distance) { distance = delta; closest = i; }
    });
    setActive(closest);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    cancelAnimationFrame(inertia.current);
    drag.current.moved = false;
    // Touch uses the browser's own momentum and keeps vertical page scrolling available.
    if (event.pointerType !== 'mouse' || event.button !== 0 || !rail.current) return;
    drag.current = { down: true, x: event.clientX, left: rail.current.scrollLeft, lastX: event.clientX, time: performance.now(), velocity: 0, moved: false };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current, element = rail.current;
    if (!state.down || !element) return;
    if (!(event.buttons & 1)) { state.down = false; delete element.dataset.dragging; return; }
    const dx = event.clientX - state.x;
    if (Math.abs(dx) > 6) { state.moved = true; element.dataset.dragging = 'true'; element.setPointerCapture(event.pointerId); }
    if (!state.moved) return;
    const now = performance.now();
    state.velocity = (event.clientX - state.lastX) / Math.max(8, now - state.time);
    state.lastX = event.clientX; state.time = now;
    element.scrollLeft = state.left - dx;
  };
  const pointerUp = () => {
    const state = drag.current, element = rail.current;
    if (!state.down || !element) return;
    state.down = false;
    delete element.dataset.dragging;
    if (!state.moved || reduced()) return;
    let velocity = Math.max(-32, Math.min(32, state.velocity * 16));
    if (performance.now() - state.time > 100) velocity = 0;
    const coast = () => {
      const previous = element.scrollLeft;
      element.scrollLeft -= velocity;
      velocity *= .92;
      if (Math.abs(velocity) > .4 && previous !== element.scrollLeft) inertia.current = requestAnimationFrame(coast);
    };
    inertia.current = requestAnimationFrame(coast);
  };
  useEffect(() => () => cancelAnimationFrame(inertia.current), []);
  useEffect(() => {
    const stop = () => { drag.current.down = false; if (rail.current) delete rail.current.dataset.dragging; };
    const resize = new ResizeObserver(track);
    if (rail.current) resize.observe(rail.current);
    addEventListener('pointerup', stop);
    addEventListener('pointercancel', stop);
    return () => { resize.disconnect(); removeEventListener('pointerup', stop); removeEventListener('pointercancel', stop); };
  }, []);
  useEffect(() => { if (paused) cancelAnimationFrame(inertia.current); }, [paused]);
  useEffect(() => {
    if (selected === null) return;
    let animation: Animation | undefined;
    const id = requestAnimationFrame(() => {
      const img = lightbox.current, from = sourceRect.current;
      if (!img || !from || reduced()) return;
      const to = img.getBoundingClientRect();
      sourceRect.current = null;
      animation = img.animate([
        { transform: `translate(${from.left + from.width / 2 - to.left - to.width / 2}px, ${from.top + from.height / 2 - to.top - to.height / 2}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: .65 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
      ], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    return () => { cancelAnimationFrame(id); animation?.cancel(); };
  }, [selected, paused]);
  const changePhoto = (step: number) => { sourceRect.current = null; setSelected(index => index === null ? null : (index + step + photos.length) % photos.length); };

  return <section className="portrait-gallery" id="portraits" aria-labelledby="gallery-heading">
    <div className="gallery-heading-row" data-reveal>
      <div><span className="eyebrow">{t.galleryLabel}</span><h2 id="gallery-heading"><MotionWords text={t.galleryHeading} /><br /><span className="muted"><MotionWords text={t.galleryHeadingMuted} /></span></h2></div>
      <div className="gallery-instructions"><span>{t.galleryHint}</span><div className="gallery-controls"><button type="button" aria-label={t.galleryPrevious} onClick={() => move(-1)} disabled={active === 0}><ArrowLeft size={22} /></button><span aria-hidden="true">{String(active + 1).padStart(2, '0')} / 05</span><button type="button" aria-label={t.galleryNext} onClick={() => move(1)} disabled={active === photos.length - 1}><ArrowRight size={22} /></button></div></div>
    </div>
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <div className="gallery-rail" ref={rail} onScroll={track} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onLostPointerCapture={() => { drag.current.down = false; }} onPointerCancel={() => { drag.current.down = false; if (rail.current) delete rail.current.dataset.dragging; }} onClickCapture={event => { if (event.detail > 0 && drag.current.moved) { event.preventDefault(); event.stopPropagation(); } drag.current.moved = false; }}>
        {photos.map((photo, i) => <DialogTrigger className={`gallery-card gallery-card-${i}`} key={photo.src} onClick={event => { sourceRect.current = event.currentTarget.querySelector('img')!.getBoundingClientRect(); setSelected(i); }} aria-label={`${t.galleryOpen} ${i + 1}`}>
          <img src={photo.src} width={photo.width} height={photo.height} alt={`${t.galleryPortrait} ${i + 1}`} loading="lazy" decoding="async" draggable={false} />
          <span className="gallery-caption"><span>{String(i + 1).padStart(2, '0')}</span><span>{t.name}</span><span aria-hidden="true">↗</span></span>
        </DialogTrigger>)}
      </div>
      <DialogContent className={`photo-lightbox${paused ? ' motion-paused' : ''}`} style={{ translate: 'none' }} showCloseButton={false} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); changePhoto(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); changePhoto(-1); } }}>
        <DialogTitle className="sr-only">{t.galleryPortrait}</DialogTitle><DialogDescription className="sr-only">{t.galleryHint}</DialogDescription>
        <DialogClose className="lightbox-close" aria-label={t.galleryClose}><X size={26} strokeWidth={1.5} /></DialogClose>
        {selected !== null && <img ref={lightbox} src={photos[selected].src} width={photos[selected].width} height={photos[selected].height} alt={`${t.galleryPortrait} ${selected + 1}`} />}
        <div className="lightbox-controls"><button type="button" aria-label={t.galleryPrevious} onClick={() => changePhoto(-1)}><ArrowLeft /></button><span aria-live="polite">{(selected ?? 0) + 1} {t.galleryCount} {photos.length}</span><button type="button" aria-label={t.galleryNext} onClick={() => changePhoto(1)}><ArrowRight /></button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
