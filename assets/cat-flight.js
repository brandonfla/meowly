// The cat takes off from the hero and rides its cloud down the page.
// It only ever flies through the empty sky between sections: each gap is one
// horizontal run (left to right, then right to left: a serpentine), and the turn
// to the next gap happens off screen, so it never crosses text, cards or photos.
// Scroll-scrubbed with GSAP ScrollTrigger; stays home in the hero under reduced motion.
(() => {
  const svg = document.querySelector('.sky-cat');
  const home = document.querySelector('.hero-art');
  if (!svg || !home || !window.gsap || !window.ScrollTrigger) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);

  const RATIO = 460 / 560; // the drawing's height / width

  const flyer = document.createElement('div'); // page coordinates (x, y)
  flyer.className = 'flyer';
  const pose = document.createElement('div'); // scales from its top-left corner
  pose.className = 'flyer-pose';
  const bank = document.createElement('div'); // tilts around its centre
  bank.className = 'flyer-bank';
  pose.appendChild(bank);
  flyer.appendChild(pose);
  // a clipped layer the size of the page, so off-screen turns never stretch the page
  const layer = document.createElement('div');
  layer.className = 'flyer-layer';
  layer.appendChild(flyer);
  document.body.appendChild(layer);
  bank.appendChild(svg);
  svg.style.animation = 'none';

  const docTop = (el) => el.getBoundingClientRect().top + scrollY;
  const docBottom = (el) => el.getBoundingClientRect().bottom + scrollY;

  // the empty band of sky between two sections: below the last thing in one,
  // above the heading of the next
  function band(prev, next) {
    const wrap = prev.querySelector(':scope > .wrap');
    let bottom = docTop(prev);
    if (wrap) [...wrap.children].forEach((b) => { bottom = Math.max(bottom, docBottom(b)); });
    if (prev.classList.contains('hero')) bottom = Math.max(bottom, docBottom(home));
    const head = next.querySelector('h2');
    const top = head ? docTop(head) : docTop(next);
    return { mid: (bottom + top) / 2, height: top - bottom };
  }

  let tl;

  function build() {
    if (tl) { tl.scrollTrigger.kill(); tl.kill(); tl = null; }
    gsap.set([flyer, pose, bank], { clearProps: 'transform' });

    const vw = document.documentElement.clientWidth;
    const vh = innerHeight;
    const max = ScrollTrigger.maxScroll(window);

    // the hero spot, from the art box (the drawing is 92% wide, 4% in, on the floor)
    const a = home.getBoundingClientRect();
    const w0 = a.width * 0.92;
    const h0 = w0 * RATIO;
    const homeX = a.left + a.width * 0.04;
    const homeY = a.bottom + scrollY - h0;
    gsap.set(flyer, { width: w0, x: homeX, y: homeY });
    gsap.set(pose, { transformOrigin: '0 0' });

    const small = vw < 640 ? 96 : vw < 1024 ? 128 : 150;
    const s = small / w0;
    const ch = small * RATIO;
    const edge = vw < 640 ? 12 : 32;
    const offL = -small - 48;
    const offR = vw + 48;
    const parkR = vw - small - edge;
    const parkL = edge;

    const sections = [...document.querySelectorAll('main > section')];
    const bands = [];
    for (let i = 0; i < sections.length - 1; i++) {
      const b = band(sections[i], sections[i + 1]);
      if (b.height >= ch + 16) bands.push(b);
    }
    if (!bands.length) return;

    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        start: 0,
        end: 'max',
        scrub: 0.8,
        onUpdate: (st) => flyer.classList.toggle('is-flying', st.scroll() > 4),
      },
    });
    const at = (v) => Math.min(Math.max(v, 0), max);
    const yIn = (b) => b.mid - ch / 2;

    // 1. takeoff: shrink and fly out to the right across the hero's empty art side
    const first = bands[0];
    const t1 = Math.max(Math.min(at(first.mid - vh * 0.85), vh * 0.45), 1);
    tl.fromTo(pose, { scale: 1 }, { scale: s, duration: t1, ease: 'power2.inOut', immediateRender: true }, 0);
    tl.fromTo(flyer, { x: homeX }, { x: offR, duration: t1, ease: 'power2.in', immediateRender: true }, 0);
    tl.fromTo(flyer, { y: homeY }, { y: homeY + h0 * 0.35 - ch / 2, duration: t1, ease: 'sine.inOut', immediateRender: true }, 0);
    tl.to(bank, { rotation: 6, duration: t1 / 2, ease: 'sine.out' }, 0);
    tl.to(bank, { rotation: 0, duration: t1 / 2, ease: 'sine.in' }, t1 / 2);

    // the landing spot: just left of the footer's Meowly logo (on a narrow screen, the paw's spot)
    const logo = document.querySelector('.footer .logo');
    const paw = logo && logo.querySelector('img');
    const final = vw < 640 ? 40 : 56;
    const fh = final * RATIO;
    let landX = 0, landY = 0, lStart = max, replacePaw = false;
    if (logo) {
      const lr = logo.getBoundingClientRect();
      const roomLeft = lr.left - 12 - final;
      replacePaw = roomLeft < 4 && !!paw;
      landX = replacePaw ? paw.getBoundingClientRect().left - (final - paw.offsetWidth) / 2 : roomLeft;
      landY = lr.top + scrollY + lr.height / 2 - fh * 0.62;
      // the landing gets the last stretch of scroll, at least 40% of a screen
      lStart = Math.max(Math.min(at(landY - vh * 0.98), max - vh * 0.4), t1);
    }

    // 2. one horizontal run per gap, alternating direction: back in from the left
    //    under the hero, then right to left, and so on; turns happen off screen
    let fromRight = false;
    let cursor = t1;
    bands.forEach((b) => {
      const y = yIn(b);
      const start = Math.max(at(b.mid - vh * 0.85), cursor);
      if (start >= lStart - 1) return; // no room before the landing: skip this gap
      const end = Math.min(Math.max(at(b.mid - vh * 0.26), start + 1), lStart);
      const fromX = fromRight ? offR : offL;
      const toX = fromRight ? offL : offR;
      const dir = toX > fromX ? 1 : -1;
      const span = end - start;
      tl.set(flyer, { x: fromX, y }, start);
      tl.to(flyer, { x: toX, duration: span, ease: 'sine.inOut' }, start);
      // a gentle rise and fall inside the gap, and a bank into the direction of travel
      const bob = Math.min((b.height - ch) / 2 - 4, 14);
      if (bob > 2) {
        tl.to(flyer, { y: y - bob, duration: span / 2, ease: 'sine.out' }, start);
        tl.to(flyer, { y, duration: span / 2, ease: 'sine.in' }, start + span / 2);
      }
      tl.to(bank, { rotation: dir * 6, duration: span / 2, ease: 'sine.out' }, start);
      tl.to(bank, { rotation: 0, duration: span / 2, ease: 'sine.in' }, start + span / 2);
      fromRight = !fromRight;
      cursor = end;
    });
    // 3. landing: glide in from the left along the footer row and settle by the logo
    if (logo) {
      const start = Math.max(lStart, cursor);
      const end = Math.max(max, start + 1);
      const span = end - start;
      tl.set(flyer, { x: -final - 48, y: landY }, start);
      tl.fromTo(pose, { scale: s }, { scale: final / w0, duration: 0.001, immediateRender: false }, start);
      tl.to(flyer, { x: landX, duration: span, ease: 'power2.out' }, start);
      tl.to(bank, { rotation: 5, duration: span * 0.4, ease: 'sine.out' }, start);
      tl.to(bank, { rotation: 0, duration: span * 0.6, ease: 'sine.inOut' }, start + span * 0.4);
      if (replacePaw) tl.to(paw, { autoAlpha: 0, duration: span * 0.2 }, start + span * 0.8);
      cursor = end;
    }
    tl.to({}, { duration: Math.max(max - cursor, 0) }, cursor);
    // render the current scroll position for real (zero-duration sets don't fire at 0)
    tl.progress(1, true).progress(tl.scrollTrigger.progress, true);
  }

  const rebuild = () => { build(); ScrollTrigger.refresh(); };
  build();
  addEventListener('load', rebuild);
  if (document.fonts) document.fonts.ready.then(rebuild);
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(rebuild, 200); });
})();
