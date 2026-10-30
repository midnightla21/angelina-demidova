'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ns = 'http://www.w3.org/2000/svg';

/** A decorative suture, measured against the actual translated page layout. */
export function SurgicalThread({ rootRef, paused }: { rootRef: RefObject<HTMLElement | null>; paused: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const id = useId().replaceAll(':', '');
  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;
    const path = svg.querySelector<SVGPathElement>('[data-thread-path]')!;
    const needle = svg.querySelector<SVGGElement>('[data-thread-needle]')!;
    const gradient = svg.querySelector<SVGLinearGradientElement>('[data-thread-colors]')!;
    const mask = svg.querySelector<SVGMaskElement>('mask')!;
    const sections = [...root.querySelectorAll<HTMLElement>('section.section')];
    const photos = [...root.querySelectorAll<HTMLElement>('.editorial-photo .photo-window')];
    const hero = root.querySelector<HTMLElement>('.hero-scene')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, dirty = true, total = 0, pageHeight = 0, mobile = false;
    let alive = true;
    let segments: { from: number; to: number; offset: number; length: number }[] = [];
    let displayedLength: number | undefined;
    let lastTime = 0;
    let transitionDeadline = 0;
    const photoTransitions = new Map<Element, Set<string>>();
    let photoMasks: SVGPathElement[] = [];
    let corners: number[][] = [];
    const fade = svg.querySelector<SVGLinearGradientElement>('[data-thread-fade]')!;
    const element = (tag: string, attrs: Record<string, string | number>) => {
      const el = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
      return el;
    };
    const measure = () => {
      const rootBox = root.getBoundingClientRect();
      const w = root.clientWidth;
      mobile = w < 760;
      pageHeight = root.offsetHeight;
      const padding = parseFloat(getComputedStyle(sections[0]).paddingLeft);
      // The gutter is quiet between three deliberately placed suture gestures.
      // The needle bends inward, with a safe inset even on a 320px screen.
      const left = mobile ? 14 : Math.max(26, padding * .43);
      const bounds = sections.map(s => {
        const r = s.getBoundingClientRect();
        return { top: r.top - rootBox.top, bottom: r.bottom - rootBox.top, dark: s.classList.contains('dark') };
      });
      const start = Math.min(innerHeight, hero.offsetHeight) * .72;
      let x = left, y = start;
      let d = `M ${x} ${y}`;
      total = 0;
      segments = [];
      const probe = element('path', { fill: 'none' }) as SVGPathElement;
      // Each gesture owns a scroll interval. Loops may double back in space
      // without making the drawing cursor jump backwards or skip the loop.
      const append = (commands: string, endX: number, endY: number) => {
        probe.setAttribute('d', `M ${x} ${y} ${commands}`);
        const length = probe.getTotalLength();
        segments.push({ from: y, to: endY, offset: total, length });
        total += length;
        d += ` ${commands}`;
        x = endX; y = endY;
      };
      const driftTo = (endY: number, inward = true) => {
        if (endY <= y + 1) return;
        const distance = endY - y;
        const bend = (mobile ? 4 : 9) * (inward ? 1 : -1);
        append(`C ${x + bend} ${y + distance * .32}, ${left - bend} ${y + distance * .72}, ${left} ${endY}`, left, endY);
      };
      const accents = [1, 3, 5];
      sections.forEach((section, i) => {
        const { top, bottom } = bounds[i];
        if (accents.includes(i)) {
          const approachToPractice = i === 1;
          const spread = mobile ? (approachToPractice ? 32 : 24) : (approachToPractice ? Math.min(118, w * .09) : 64);
          // Stay within the empty tail of the preceding section and the next
          // section's top inset; never sweep through a heading or body copy.
          driftTo(top - 64, i % 2 === 0);
          const turn = left + spread;
          const loop = mobile ? 8 : 13;
          append(`C ${left} ${top - 42}, ${turn - 10} ${top - 45}, ${turn} ${top - 14}
            C ${turn + loop} ${top + 12}, ${turn - loop} ${top + 16}, ${turn - loop} ${top + 2}
            C ${turn - loop} ${top - 11}, ${turn + loop * .5} ${top - 10}, ${turn} ${top + 11}
            C ${turn - 10} ${top + 28}, ${left} ${top + 20}, ${left} ${top + 38}`, left, top + 38);
        } else driftTo(top + 24, i % 2 === 0);

        // A portrait passage is composed from its real position. Only nearby
        // left-hand portraits are used; right-hand reading columns stay clear.
        const photo = section.querySelector<HTMLElement>('.editorial-photo');
        if (photo) {
          const box = photo.getBoundingClientRect();
          const photoLeft = box.left - rootBox.left;
          // Sticky visual coordinates move while scrolling. Anchor the route
          // to the normal grid row and reserve live rectangles for masks only.
          const photoStyle = getComputedStyle(photo);
          let photoTop = box.top - rootBox.top;
          if (photoStyle.position === 'sticky') {
            const layout = photo.parentElement!.getBoundingClientRect();
            photoTop = layout.top - rootBox.top + parseFloat(photoStyle.marginTop);
          } else if (getComputedStyle(photo.parentElement!).position === 'sticky') {
            const label = section.querySelector<HTMLElement>('.section-label')!;
            photoTop = label.getBoundingClientRect().bottom - rootBox.top + parseFloat(getComputedStyle(label).marginBottom) + photo.offsetTop;
          } else {
            // Reveal translation must not become part of the permanent route.
            const transform = photoStyle.transform;
            if (transform !== 'none') photoTop -= new DOMMatrixReadOnly(transform).m42;
          }
          if (photoLeft < w * .16 && box.height > 180) {
            const entryY = Math.max(y + 40, photoTop + box.height * .34);
            const endY = Math.min(bottom - 90, photoTop + box.height * .79);
            if (endY - entryY > 95) {
              const inside = photoLeft + (mobile ? 24 : 44);
              driftTo(entryY - 32);
              append(`C ${left} ${entryY}, ${inside} ${entryY + 8}, ${inside} ${entryY + 48}
                C ${inside} ${endY - 38}, ${left} ${endY - 34}, ${left} ${endY}`, left, endY);
            }
          }
        }
        if (i === sections.length - 1) driftTo(bottom - 65);
      });
      svg.setAttribute('viewBox', `0 0 ${w} ${pageHeight}`);
      svg.style.height = `${pageHeight}px`;
      path.setAttribute('d', d);
      // Use the final path's length to avoid accumulated floating-point drift.
      const measuredTotal = path.getTotalLength();
      const ratio = measuredTotal / Math.max(1, total);
      segments.forEach(segment => { segment.offset *= ratio; segment.length *= ratio; });
      total = measuredTotal;
      displayedLength = undefined;
      gradient.setAttribute('y2', String(pageHeight));
      const colors: [number, string][] = [[0, '#a9b7bb']];
      bounds.forEach((b, i) => {
        const before = i === 0 || bounds[i - 1].dark ? '#a9b7bb' : '#71878b';
        const after = b.dark ? '#a9b7bb' : '#71878b';
        colors.push([Math.max(0, b.top - 25), before], [b.top + 25, after]);
      });
      gradient.replaceChildren(...colors.map(([y, color]) => element('stop', { offset: clamp(y / pageHeight), 'stop-color': color })));
      mask.replaceChildren(element('rect', { width: w, height: pageHeight, fill: 'white' }));
      corners = photos.map(photo => {
        const style = getComputedStyle(photo), box = photo.getBoundingClientRect();
        return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius].flatMap(radius => {
          const [rx, ry = rx] = radius.split(' ');
          return [rx.endsWith('%') ? parseFloat(rx) * box.width / 100 : parseFloat(rx), ry.endsWith('%') ? parseFloat(ry) * box.height / 100 : parseFloat(ry)];
        });
      });
      photoMasks = photos.map(photo => {
        const shape = element('path', { fill: photo.closest('.appointment-photo') ? `url(#${id}-fade)` : 'black' }) as SVGPathElement;
        mask.appendChild(shape);
        return shape;
      });
      svg.dataset.ready = 'true';
      dirty = false;
    };
    const update = (time: number) => {
      frame = 0;
      if (dirty) measure();
      const staticMode = paused || reduce.matches;
      const rootBox = root.getBoundingClientRect();
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const finish = clamp((scrollY / maxScroll - .92) / .08);
      const cursorY = -rootBox.top + innerHeight * (.76 + .3 * finish);
      const segment = segments.find(part => cursorY <= part.to) ?? segments[segments.length - 1];
      const progress = clamp((cursorY - segment.from) / Math.max(1, segment.to - segment.from));
      const target = staticMode ? total : segment.offset + segment.length * progress;
      // A short settling motion removes wheel/touch steps, then the RAF stops.
      // Anchor jumps and layout changes settle immediately instead of racing
      // the needle through the entire document.
      const delta = Math.min(48, Math.max(1, time - lastTime));
      lastTime = time;
      if (displayedLength === undefined || staticMode || Math.abs(target - displayedLength) > innerHeight * 1.25) displayedLength = target;
      else displayedLength += (target - displayedLength) * (1 - Math.exp(-delta / 70));
      if (Math.abs(target - displayedLength) < .12) displayedLength = target;
      const length = displayedLength;
      path.style.strokeDasharray = `${total} ${total}`;
      path.style.strokeDashoffset = String(total - length);
      const point = path.getPointAtLength(length);
      const next = path.getPointAtLength(Math.min(total, length + 2));
      const previous = path.getPointAtLength(Math.max(0, length - 2));
      const angle = Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI - 90;
      needle.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle}) scale(${mobile ? .68 : .9})`);
      const visibility = clamp(length / 18) * clamp((total - length) / 28);
      needle.style.opacity = staticMode ? '0' : String(visibility);
      photos.forEach((photo, i) => {
        const rect = photo.getBoundingClientRect();
        const m = photoMasks[i];
        const x = rect.left - rootBox.left, y = rect.top - rootBox.top, r = x + rect.width, b = y + rect.height;
        const [tlx, tly, trx, try_, brx, bry, blx, bly] = corners[i];
        m.setAttribute('d', `M ${x + tlx} ${y} H ${r - trx} A ${trx} ${try_} 0 0 1 ${r} ${y + try_} V ${b - bry} A ${brx} ${bry} 0 0 1 ${r - brx} ${b} H ${x + blx} A ${blx} ${bly} 0 0 1 ${x} ${b - bly} V ${y + tly} A ${tlx} ${tly} 0 0 1 ${x + tlx} ${y} Z`);
        if (photo.closest('.appointment-photo')) { fade.setAttribute('y1', String(y)); fade.setAttribute('y2', String(b)); }
      });
      svg.dataset.static = String(staticMode);
      if (!staticMode && (displayedLength !== target || (photoTransitions.size > 0 && time < transitionDeadline))) schedule();
    };
    const schedule = () => { if (!frame && alive) frame = requestAnimationFrame(update); };
    const resize = () => { dirty = true; schedule(); };
    const transition = (event: TransitionEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('.editorial-photo')) return;
      if (event.type === 'transitionrun') {
        const properties = photoTransitions.get(target) ?? new Set<string>();
        properties.add(event.propertyName);
        photoTransitions.set(target, properties);
        transitionDeadline = performance.now() + 1800;
      } else {
        const properties = photoTransitions.get(target);
        properties?.delete(event.propertyName);
        if (!properties?.size) photoTransitions.delete(target);
      }
      schedule();
    };
    root.addEventListener('transitionrun', transition);
    root.addEventListener('transitionend', transition);
    root.addEventListener('transitioncancel', transition);
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    sections.forEach(s => ro.observe(s));
    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', resize, { passive: true });
    reduce.addEventListener('change', resize);
    document.fonts.ready.then(() => { if (alive) resize(); });
    schedule();
    return () => {
      alive = false;
      ro.disconnect();
      root.removeEventListener('transitionrun', transition);
      root.removeEventListener('transitionend', transition);
      root.removeEventListener('transitioncancel', transition);
      cancelAnimationFrame(frame);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', resize);
      reduce.removeEventListener('change', resize);
    };
  }, [rootRef, paused]);

  return <svg ref={svgRef} className="surgical-thread" aria-hidden="true" focusable="false" preserveAspectRatio="none">
    <defs>
      <linearGradient id={`${id}-thread`} data-thread-colors gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1" />
      <linearGradient id={`${id}-fade`} data-thread-fade gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="1"><stop offset=".8" stopColor="black" /><stop offset="1" stopColor="white" /></linearGradient>
      <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2=".65">
        <stop offset="0" stopColor="#7b8c91" /><stop offset=".48" stopColor="#e4eaeb" /><stop offset="1" stopColor="#98a9ae" />
      </linearGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" />
    </defs>
    <g mask={`url(#${id}-mask)`}>
      <path data-thread-path className="suture-line" stroke={`url(#${id}-thread)`} fill="none" />
      <g data-thread-needle className="suture-needle">
        <path d="M -.55 0 C -.55 11 4 21 13 26 C 5.3 21.6 .7 11 .65 0 Z" fill={`url(#${id}-metal)`} />
        <path d="M .15 1 C .6 11 4.2 20.4 11.8 25.2" fill="none" stroke="#f8faf9" strokeOpacity=".48" strokeWidth=".35" />
      </g>
    </g>
  </svg>;
}
