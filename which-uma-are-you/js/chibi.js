/* ==========================================================================
   Which Uma Are You? — Chibi Companion System

   Rare, randomized decorative character peeks around the quiz/results UI.
   Reads CHARACTERS for id + name only (image paths, alt text) — never
   modifies it, matching.js, or any scoring data.

   Purely cosmetic: if a chibi asset is missing (most characters have
   none yet — see assets/chibis/README.md), the peek's onerror handler
   removes it immediately, before any animation class is applied. There's
   no fallback shape shown here, unlike the character portrait on the
   results page — a placeholder circle popping up at a random edge would
   read as a bug, not a nice surprise, so a missing chibi just means
   nothing happens that cycle.

   Draws from the full current roster generically (by id), not a
   hardcoded character list, matching how the rest of this project
   already treats the roster as open-ended data. Two characters
   (gold-ship, oguri-cap) additionally have a short looping dance-clip
   peek (see CHIBI_VIDEO_MAP) trimmed from the source dance videos in
   assets/videos/chibis/ — everyone else without a listed clip falls
   back to the static-image path, same as before.
   ========================================================================== */

import { CHARACTERS } from './characters.js';

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Short looping dance clips, cropped/trimmed from the source videos in
   assets/videos/chibis/ (the source files themselves stay untouched --
   see that folder's README). Any character not listed here uses the
   plain assets/chibis/<id>.webp path instead. */
const CHIBI_VIDEO_MAP = {
  'gold-ship': {
    webm: 'assets/videos/chibis/goldship-peek.webm',
    mp4: 'assets/videos/chibis/goldship-peek.mp4'
  },
  'oguri-cap': {
    webm: 'assets/videos/chibis/oguricap-peek.webm',
    mp4: 'assets/videos/chibis/oguricap-peek.mp4'
  }
};

const EDGES = ['left', 'right', 'top', 'bottom'];
/* Single unified pop chance checked at every trigger point (ambient tick
   and answer-select reaction alike) -- previously ambient/reaction had
   separate, much lower odds; both now share this one number. */
const POP_CHANCE = 0.56;
const AMBIENT_MIN_MS = 7000;
const AMBIENT_MAX_MS = 15000;
const HOLD_MS = 1400;
const HOLD_MS_VIDEO = 2400; /* longer hold so a dance clip actually reads as dancing */
const EXIT_MS = 420;
const MAX_CONCURRENT = 1;

/* Where a peek can appear: screen edges (as before, now including the
   bottom edge too), a fully random spot anywhere in the viewport
   ("floating"), or tucked behind the current question/result card so it
   only shows around the card's corners -- 'behind' is only picked when
   that card actually exists on the current page. */
const POSITION_TYPES = ['edge', 'float', 'behind'];

let layerEl = null;
let active = 0;
let ambientTimer = null;

function randomCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function cardTarget() {
  return document.getElementById('question-card') || document.querySelector('.result-hero');
}

function createPeekMedia(character) {
  const sources = CHIBI_VIDEO_MAP[character.id];
  if (sources) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.autoplay = true;
    /* webm/vp9 first, mp4/h264 as the fallback -- the browser picks
       whichever source it actually supports; the video only errors out
       (removed by the same onerror path as a missing image) if neither
       does. */
    const webmSource = document.createElement('source');
    webmSource.src = sources.webm;
    webmSource.type = 'video/webm';
    const mp4Source = document.createElement('source');
    mp4Source.src = sources.mp4;
    mp4Source.type = 'video/mp4';
    video.appendChild(webmSource);
    video.appendChild(mp4Source);
    return { el: video, isVideo: true };
  }
  const img = document.createElement('img');
  img.src = `assets/chibis/${character.id}.webp`;
  return { el: img, isVideo: false };
}

function settleAndAnimate(el, isVideo) {
  active++;
  requestAnimationFrame(() => el.classList.add('chibi-peek-in'));
  const hold = isVideo ? HOLD_MS_VIDEO : HOLD_MS;
  setTimeout(() => {
    el.classList.remove('chibi-peek-in');
    el.classList.add('chibi-peek-out');
    setTimeout(() => {
      el.remove();
      active = Math.max(0, active - 1);
    }, EXIT_MS);
  }, hold);
}

function spawnEdgePeek(character) {
  if (!layerEl) return;
  const { el, isVideo } = createPeekMedia(character);
  const edge = EDGES[Math.floor(Math.random() * EDGES.length)];

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-edge-${edge}`;

  if (edge === 'left' || edge === 'right') {
    el.style.top = 20 + Math.random() * 55 + '%';
  } else {
    el.style.left = 12 + Math.random() * 66 + '%';
  }

  el.addEventListener('error', () => el.remove(), { once: true });
  el.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo), { once: true });

  layerEl.appendChild(el);
}

/* Pops up at a fully random spot inside the viewport, not anchored to
   any edge -- this is the "...and everywhere" case. Stays within the
   chibi-layer overlay (z-index above the page) like edge peeks. */
function spawnFloatPeek(character) {
  if (!layerEl) return;
  const { el, isVideo } = createPeekMedia(character);

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = 'chibi-peek chibi-float';
  el.style.top = 10 + Math.random() * 70 + '%';
  el.style.left = 8 + Math.random() * 74 + '%';

  el.addEventListener('error', () => el.remove(), { once: true });
  el.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo), { once: true });

  layerEl.appendChild(el);
}

/* Anchored to a corner of the current question/result card and appended
   into .page itself (not the always-on-top chibi-layer) with a z-index
   below the card's -- the card's own opaque background naturally covers
   whichever half overlaps it, so the chibi reads as peeking out from
   behind the card without any clip-path trickery. */
function spawnBehindCardPeek(character) {
  const card = cardTarget();
  const page = document.querySelector('.page');
  if (!card || !page) return spawnEdgePeek(character);

  const pageRect = page.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const { el, isVideo } = createPeekMedia(character);

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = 'chibi-peek chibi-behind';

  const size = 96;
  const corners = ['tl', 'tr', 'bl', 'br'];
  const corner = corners[Math.floor(Math.random() * corners.length)];
  let top;
  let left;
  if (corner === 'tl' || corner === 'tr') {
    top = cardRect.top - pageRect.top - size * 0.35;
  } else {
    top = cardRect.bottom - pageRect.top - size * 0.65;
  }
  if (corner === 'tl' || corner === 'bl') {
    left = cardRect.left - pageRect.left - size * 0.35;
  } else {
    left = cardRect.right - pageRect.left - size * 0.65;
  }
  /* .page has no overflow clipping of its own (unlike .chibi-layer,
     which is a fixed overlay with overflow:hidden), and the card spans
     nearly the page's full width -- so the tr/br corners' unclamped
     offset above pushes the peek's right edge past the page's own
     right edge, which genuinely grows the document's scrollable width.
     Clamp into the page's box so the "poke out from the corner" look
     stays, without ever exceeding the page's own bounds. */
  left = Math.max(0, Math.min(left, pageRect.width - size));
  top = Math.max(0, Math.min(top, pageRect.height - size));
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;

  el.addEventListener('error', () => el.remove(), { once: true });
  el.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo), { once: true });

  page.appendChild(el);
}

function spawnPeek() {
  if (!layerEl || prefersReducedMotion || active >= MAX_CONCURRENT) return;

  const character = randomCharacter();
  const availableTypes = cardTarget() ? POSITION_TYPES : POSITION_TYPES.filter((t) => t !== 'behind');
  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  if (type === 'behind') spawnBehindCardPeek(character);
  else if (type === 'float') spawnFloatPeek(character);
  else spawnEdgePeek(character);
}

function scheduleAmbient() {
  if (prefersReducedMotion) return;
  const delay = AMBIENT_MIN_MS + Math.random() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
  ambientTimer = setTimeout(() => {
    if (Math.random() < POP_CHANCE) spawnPeek();
    scheduleAmbient();
  }, delay);
}

/** Call once per page (quiz.html / results.html) to start ambient peeks. */
export function initChibiLayer(layerId) {
  layerEl = document.getElementById(layerId || 'chibi-layer');
  if (!layerEl || prefersReducedMotion) return;
  scheduleAmbient();
}

/** Chance to react immediately -- call from an answer-select handler. */
export function maybeChibiReaction() {
  if (prefersReducedMotion) return;
  if (Math.random() < POP_CHANCE) spawnPeek();
}

/** Test/debug hook: force a peek right now, bypassing all chance rolls. */
export function forceChibiPeek() {
  if (!layerEl) return;
  const wasActive = active;
  active = 0;
  spawnPeek();
  if (active === wasActive) active = wasActive; /* spawn was skipped for some other reason */
}

export function stopChibiLayer() {
  if (ambientTimer) clearTimeout(ambientTimer);
  ambientTimer = null;
}
