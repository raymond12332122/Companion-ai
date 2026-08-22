/* ==========================================================================
   Which Uma Are You? — Special Week Rain Easter Egg

   An extremely rare, purely decorative interruption: a dozen or so
   copies of Special Week's own portrait fall from the top of the
   screen like rain -- different horizontal spots, fall speeds,
   rotations, and delays so it reads as chaotic and funny -- bounce
   briefly at the bottom, then the whole overlay clears on its own and
   the quiz continues exactly where it was. This is "Special Week"
   rain, not weather: no water drops, no clouds, nothing generic --
   every falling thing on screen is recognizably her.

   Visual only -- never reads or writes an answer, never touches
   matching.js/storage.js/characters.js, and renders as an overlay on
   top of whatever's already on screen rather than replacing it.

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

const SPECIAL_WEEK_SRC = 'assets/characters/special-week.webp';

/* Deliberately tiny -- combined with the once-per-session cap below,
   this lands at roughly a 1-in-20 full 25-question playthrough, so
   actually seeing it feels like a real find rather than something
   every run produces. */
const TRIGGER_CHANCE = 0.002;
const SPRITE_COUNT = 12;
const HOLD_MS = 3000;
const FADE_MS = 500;

let firedThisSession = false;

/* Each falling sprite gets its own horizontal spot, fall duration,
   start delay, and rotation range, set as inline style/custom
   properties -- the shared @keyframes (sw-chibi-fall in style.css)
   reads --sw-spin via var() and includes its own bounce-then-fade tail,
   so it automatically scales to whichever random duration lands here. */
function buildFallingSprites() {
  let html = '';
  for (let i = 0; i < SPRITE_COUNT; i++) {
    const left = 2 + Math.random() * 92;
    const delay = Math.random() * 1.1;
    const duration = 1.5 + Math.random() * 1.3;
    const spin = Math.round(-35 + Math.random() * 70);
    const size = 44 + Math.round(Math.random() * 22);
    html += `<img class="sw-chibi-drop" src="${SPECIAL_WEEK_SRC}" alt="" style="left:${left}%; width:${size}px; --sw-spin:${spin}deg; animation-delay:${delay}s; animation-duration:${duration}s;" onerror="this.remove()" />`;
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
    <div class="sw-rain-caption">🐴 Special Week Rain! 🐴</div>
    <div class="sw-rain-drops" aria-hidden="true">${buildFallingSprites()}</div>
    <div class="sw-rain-hint">(tap to continue)</div>
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
 * -- same trigger point, independent roll, and entirely separate from
 * the regular chibi interruption system in chibi.js. No-ops under
 * reduced motion (the "disable" option, not "simplify" -- consistent
 * with how every other decorative animation in this app already treats
 * reduced motion) or once it's already fired this session.
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
