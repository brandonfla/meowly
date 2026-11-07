// The hero cat: a slow tail swish, ears that twitch and turn toward the pointer,
// a happy wag on hover or tap. Rests under reduced motion, pauses off screen.
(() => {
  const svg = document.querySelector('.sky-cat');
  if (!svg || !svg.animate) return;
  const btn = document.querySelector('.cat-pause');
  const tail = svg.querySelector('.tail');
  const tip = svg.querySelector('.tail-tip');
  const ears = [svg.querySelector('.ear-l'), svg.querySelector('.ear-r')];
  const twitches = [...svg.querySelectorAll('.ear-twitch')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const swing = 'cubic-bezier(.45, 0, .55, 1)';

  let loops = [];
  let paused = false;
  let onScreen = true;
  let twitchTimer = 0;
  let wagTimer = 0;
  let frame = 0;

  const live = () => !paused && onScreen && !reduce.matches;

  function build() {
    loops = [
      tail.animate(
        [{ transform: 'rotate(-6deg)' }, { transform: 'rotate(7deg)' }],
        { duration: 2400, direction: 'alternate', iterations: Infinity, easing: swing }
      ),
      // the tip lags the base, so the curl ripples instead of swinging stiffly
      tip.animate(
        [{ transform: 'rotate(16deg)' }, { transform: 'rotate(-18deg)' }],
        { duration: 2400, direction: 'alternate', iterations: Infinity, easing: swing, delay: -700 }
      ),
    ];
  }

  function twitch() {
    clearTimeout(twitchTimer);
    if (!live()) return;
    twitchTimer = setTimeout(() => {
      if (!live()) return;
      const i = Math.random() < 0.5 ? 0 : 1;
      const dir = i === 0 ? -1 : 1;
      twitches[i].animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: `rotate(${dir * 16}deg)`, offset: 0.35 },
          { transform: `rotate(${dir * -4}deg)`, offset: 0.7 },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 420, easing: 'ease-out' }
      );
      twitch();
    }, 2500 + Math.random() * 4000);
  }

  function setEars(turn) {
    ears[0].style.transform = `rotate(${turn}deg)`;
    ears[1].style.transform = `rotate(${turn}deg)`;
  }

  function sync() {
    if (!loops.length && !reduce.matches) build();
    loops.forEach((a) => (live() ? a.play() : a.pause()));
    if (live()) twitch();
    else {
      clearTimeout(twitchTimer);
      setEars(0);
    }
    if (btn) btn.hidden = reduce.matches;
  }

  // ears follow the pointer, like a cat tracking a sound
  addEventListener('pointermove', (e) => {
    if (!live() || e.pointerType === 'touch') return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width * (280 / 560);
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (innerWidth / 2)));
      setEars(dx * 14);
    });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => setEars(0));

  // a happy wag when you come close
  function wag() {
    if (!live()) return;
    clearTimeout(wagTimer);
    loops.forEach((a) => a.updatePlaybackRate(3.2));
    wagTimer = setTimeout(() => loops.forEach((a) => a.updatePlaybackRate(1)), 1600);
  }
  svg.addEventListener('pointerenter', wag);
  svg.addEventListener('pointerdown', wag);

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(svg);

  if (btn) {
    btn.addEventListener('click', () => {
      paused = !paused;
      btn.setAttribute('aria-pressed', String(paused));
      btn.querySelector('.sr').textContent = paused ? 'Play the cat’s animation' : 'Pause the cat’s animation';
      sync();
    });
  }

  reduce.addEventListener('change', sync);
  sync();
})();
