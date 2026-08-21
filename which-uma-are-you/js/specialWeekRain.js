/* ==========================================================================
   Which Uma Are You? — Special Week Rain Easter Egg

   An extremely rare, purely decorative interruption: Special Week pops
   up center-screen for a couple of seconds under a playful CSS "rain"
   effect, then fades away on its own and lets the quiz continue exactly
   where it was. Visual only -- never reads or writes an answer, never
   touches matching.js/storage.js/characters.js, and renders as an
   overlay on top of whatever's already on screen rather than replacing
   it.

   Audio gating matches the documented pattern in audio.js: the only
   call site is quiz.js's answer-select handler, which is already behind
   the user's own tap to start + answer the quiz, so nothing here can
   autoplay before a real interaction, and playSpecialWeekRainSfx()
   itself still goes through audio.js's own mute check.
   ========================================================================== */

import { playSpecialWeekRainSfx } from './audio.js';

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Deliberately tiny -- combined with the once-per-session cap below,
   this lands at roughly a 1-in-20 full 25-question playthrough, so
   actually seeing it feels like a real find rather than something
   every run produces. */
const TRIGGER_CHANCE = 0.002;
const RAINDROP_COUNT = 18;
const HOLD_MS = 2600;
const FADE_MS = 500;

let firedThisSession = false;

function buildRaindrops() {
  let html = '';
  for (let i = 0; i < RAINDROP_COUNT; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.7;
    const duration = 0.85 + Math.random() * 0.55;
    html += `<span class="sw-raindrop" style="left:${left}%; animation-delay:${delay}s; animation-duration:${duration}s;"></span>`;
  }
  return html;
}

function dismiss(overlay) {
  if (!overlay.isConnected) return;
  overlay.classList.remove('sw-rain-in');
  overlay.classList.add('sw-rain-out');
  setTimeout(() => overlay.remove(), FADE_MS);
}

function showSpecialWeekRain() {
  const overlay = document.createElement('div');
  overlay.className = 'sw-rain-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `
    <div class="sw-rain-drops" aria-hidden="true">${buildRaindrops()}</div>
    <div class="sw-rain-card">
      <img
        class="sw-rain-portrait"
        src="assets/characters/special-week.webp"
        alt=""
        onerror="this.remove()"
      />
      <div class="sw-rain-caption">🌧️ Special Week Rain! 🌧️</div>
      <div class="sw-rain-subcaption">She showed up anyway — rain or shine.</div>
      <div class="sw-rain-hint">(tap to continue)</div>
    </div>
  `;
  overlay.addEventListener('click', () => dismiss(overlay), { once: true });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('sw-rain-in'));

  playSpecialWeekRainSfx();
  setTimeout(() => dismiss(overlay), HOLD_MS);
}

/**
 * Rolls the (very low) chance and, if it hits, shows the rain event.
 * Call from quiz.js's answer-select handler alongside maybeChibiReaction
 * -- same trigger point, independent roll. No-ops under reduced motion
 * (the "disable" option, not "simplify" -- consistent with how every
 * other decorative animation in this app already treats reduced motion)
 * or once it's already fired this session.
 */
export function maybeSpecialWeekRain() {
  if (prefersReducedMotion || firedThisSession) return;
  if (Math.random() >= TRIGGER_CHANCE) return;
  firedThisSession = true;
  showSpecialWeekRain();
}

/** Test/debug hook: force the event right now, bypassing the chance roll and the once-per-session cap. */
export function forceSpecialWeekRain() {
  showSpecialWeekRain();
}
