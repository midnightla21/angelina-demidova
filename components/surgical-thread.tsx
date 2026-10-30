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
    const shadow = svg.querySelector<SVGPathElement>('[data-thread-shadow]')!;
    const needle = svg.querySelector<SVGGElement>('[data-thread-needle]')!;
    const stitchesGroup = svg.querySelector<SVGGElement>('[data-thread-stitches]')!;
    const gradient = svg.querySelector<SVGLinearGradientElement>('[data-thread-colors]')!;
    const mask = svg.querySelector<SVGMaskElement>('mask')!;
    const sections = [...root.querySelectorAll<HTMLElement>('section.section')];
    const photos = [...root.querySelectorAll<HTMLElement>('.editorial-photo .photo-window')];
    const hero = root.querySelector<HTMLElement>('.hero-scene')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, dirty = true, total = 0, pageHeight = 0, mobile = false;
    let alive = true;
    let samples: { y: number; length: number }[] = [];
    let stitches: { y: number; x: number; el: SVGGElement }[] = [];
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
      const left = mobile ? 12 : Math.max(24, padding * .45);
      const right = w - left;
      const bounds = sections.map(s => {
        const r = s.getBoundingClientRect();
        return { top: r.top - rootBox.top, bottom: r.bottom - rootBox.top, dark: s.classList.contains('dark') };
      });
      // Start at the first screen; alternating margins leave the reading columns clear.
      const start = Math.min(innerHeight, hero.offsetHeight) * .72;
      let x = left;
      let d = `M ${x} ${start} C ${x + (mobile ? 8 : 26)} ${start + 42}, ${x} ${start + 90}, ${x} ${start + 130}`;
      stitches = [];
      stitchesGroup.replaceChildren();
      sections.forEach((section, i) => {
        const { top, bottom } = bounds[i];
        const nextX = mobile || [0, 3, 4].includes(i) ? left : right;
        const middle = (x + nextX) / 2;
        d += ` L ${x} ${top - 45} C ${x} ${top - 12}, ${nextX} ${top + 12}, ${nextX} ${top + 45}`;
        const stitch = element('g', { class: 'suture-stitch', stroke: '#8b9ba4' }) as SVGGElement;
        // Three small passes across the seam, their loose loops tighten with scroll.
        for (let j = -1; j <= 1; j++) {
          const sx = mobile ? 0 : j * 18;
          const sy = mobile ? j * 12 : 0;
          stitch.appendChild(element('path', { d: `M ${sx - 5} ${sy - 9} C ${sx + 12} ${sy - 13}, ${sx + 13} ${sy + 9}, ${sx + 3} ${sy + 10}`, fill: 'none', 'stroke-width': mobile ? 1.1 : 1.5 }));
          stitch.appendChild(element('circle', { cx: sx - 5, cy: sy - 9, r: 1.5, class: 'suture-entry' }));
          stitch.appendChild(element('circle', { cx: sx + 3, cy: sy + 10, r: 1.5, class: 'suture-entry' }));
        }
        stitchesGroup.appendChild(stitch);
        stitches.push({ x: middle, y: top, el: stitch });
        x = nextX;
        // A shallow excursion slips behind a portrait, then returns to the margin.
        const photo = section.querySelector<HTMLElement>('.editorial-photo');
        if (photo && !mobile) {
          const box = photo.getBoundingClientRect();
          const y = Math.max(top + 125, box.top - rootBox.top + Math.min(140, box.height * .3));
          const px = x === left ? box.left - rootBox.left + 22 : box.right - rootBox.left - 22;
          if (y + 155 < bottom - 65 && Math.abs(px - x) < w * .24) {
            d += ` L ${x} ${y - 80} C ${x} ${y - 28}, ${px} ${y - 30}, ${px} ${y + 12} C ${px} ${y + 66}, ${x} ${y + 68}, ${x} ${y + 130}`;
          }
        }
        if (i === sections.length - 1) d += ` L ${x} ${bottom - 70}`;
      });
      svg.setAttribute('viewBox', `0 0 ${w} ${pageHeight}`);
      svg.style.height = `${pageHeight}px`;
      path.setAttribute('d', d);
      shadow.setAttribute('d', d);
      total = path.getTotalLength();
      samples = [];
      for (let length = 0; length < total; length += 10) samples.push({ y: path.getPointAtLength(length).y, length });
      samples.push({ y: path.getPointAtLength(total).y, length: total });
      gradient.setAttribute('y2', String(pageHeight));
      const colors: [number, string][] = [[0, '#d2dbdf']];
      bounds.forEach((b, i) => {
        const before = i === 0 || bounds[i - 1].dark ? '#d2dbdf' : '#607884';
        const after = b.dark ? '#d2dbdf' : '#607884';
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
    const update = () => {
      frame = 0;
      if (dirty) measure();
      const staticMode = paused || reduce.matches;
      const rootBox = root.getBoundingClientRect();
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const finish = clamp((scrollY / maxScroll - .92) / .08);
      const cursorY = -rootBox.top + innerHeight * (.76 + .3 * finish);
      let low = 0, high = samples.length - 1;
      while (low < high) { const mid = (low + high) >> 1; if (samples[mid].y < cursorY) low = mid + 1; else high = mid; }
      const a = samples[Math.max(0, low - 1)], b = samples[low];
      const length = staticMode ? total : a.length + (b.length - a.length) * clamp((cursorY - a.y) / Math.max(.01, b.y - a.y));
      for (const line of [path, shadow]) {
        line.style.strokeDasharray = `${total} ${total}`;
        line.style.strokeDashoffset = String(total - length);
      }
      const point = path.getPointAtLength(length);
      const next = path.getPointAtLength(Math.min(total, length + 2));
      const previous = path.getPointAtLength(Math.max(0, length - 2));
      const angle = Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI - 90;
      needle.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle}) scale(${mobile ? .48 : .8})`);
      needle.style.opacity = staticMode || length >= total - 1 ? '0' : '1';
      stitches.forEach(({ x, y, el }) => {
        const p = staticMode ? 1 : clamp((cursorY - y + 25) / 115);
        el.setAttribute('transform', `translate(${x} ${y}) scale(1 ${1.65 - p * .75})`);
        el.style.opacity = String(clamp(p * 3));
      });
      photos.forEach((photo, i) => {
        const rect = photo.getBoundingClientRect();
        const m = photoMasks[i];
        const x = rect.left - rootBox.left, y = rect.top - rootBox.top, r = x + rect.width, b = y + rect.height;
        const [tlx, tly, trx, try_, brx, bry, blx, bly] = corners[i];
        m.setAttribute('d', `M ${x + tlx} ${y} H ${r - trx} A ${trx} ${try_} 0 0 1 ${r} ${y + try_} V ${b - bry} A ${brx} ${bry} 0 0 1 ${r - brx} ${b} H ${x + blx} A ${blx} ${bly} 0 0 1 ${x} ${b - bly} V ${y + tly} A ${tlx} ${tly} 0 0 1 ${x + tlx} ${y} Z`);
        if (photo.closest('.appointment-photo')) { fade.setAttribute('y1', String(y)); fade.setAttribute('y2', String(b)); }
      });
      svg.dataset.static = String(staticMode);
    };
    const schedule = () => { if (!frame && alive) frame = requestAnimationFrame(update); };
    const resize = () => { dirty = true; schedule(); };
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
        <stop offset="0" stopColor="#7c8b93" /><stop offset=".32" stopColor="#f6fafb" /><stop offset=".53" stopColor="#a0b1ba" /><stop offset=".8" stopColor="#ecf2f3" /><stop offset="1" stopColor="#72838c" />
      </linearGradient>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" />
    </defs>
    <g mask={`url(#${id}-mask)`}>
      <path data-thread-shadow className="suture-shadow" fill="none" />
      <path data-thread-path className="suture-line" stroke={`url(#${id}-thread)`} fill="none" />
      <g data-thread-stitches stroke={`url(#${id}-thread)`} />
      <g data-thread-needle className="suture-needle">
        <path d="M 0 0 C -31 2 -36 38 -5 53 C -24 33 -20 11 0 3 Z" fill={`url(#${id}-metal)`} />
        <path d="M -2 2 C -23 6 -29 31 -9 48" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth=".65" />
      </g>
    </g>
  </svg>;
}
