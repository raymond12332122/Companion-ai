/* ==========================================================================
   Which Uma Are You? — Chibi Companion System

   Rare, randomized decorative character interruptions around the
   quiz/results UI. Reads CHARACTERS for id + name + personalityProfile
   only (image paths, alt text, entrance flavor) — never modifies it,
   matching.js, or any scoring data.

   Purely cosmetic: if a chibi asset is missing (most characters have
   none yet — see assets/chibis/README.md), the peek's onerror handler
   removes it immediately, before any animation class is applied. There's
   no fallback shape shown here, unlike the character portrait on the
   results page — a placeholder circle popping up at a random edge would
   read as a bug, not a nice surprise, so a missing chibi just means
   nothing happens that cycle.

   Draws from the full current roster generically (by id), not a
   hardcoded character list, matching how the rest of this project
   already treats the roster as open-ended data. Four characters
   additionally have a short looping video-clip peek instead of a static
   image (see CHIBI_VIDEO_MAP), each trimmed/cropped from the real source
   videos in assets/videos/chibis/ (never generated/CSS-only content):
   gold-ship and oguri-cap get their own dance clips, and special-week +
   silence-suzuka share the one clip they're both actually in (cropped
   to the moment they're walking side by side) since that's the asset as
   provided -- everyone else without a listed clip falls back to the
   plain static-image path, same as before.

   Entrance "flavor" (how snappy/bouncy/gentle the pop-in feels) is
   derived from each character's own existing personalityProfile —
   whichever of the 7 traits they score highest in — rather than a
   second hardcoded per-character table, so every character (including
   ones added to the roster later) automatically gets a flavor that
   actually reflects who they are, for free.
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
  },
  'special-week': {
    webm: 'assets/videos/chibis/walking-peek.webm',
    mp4: 'assets/videos/chibis/walking-peek.mp4'
  },
  'silence-suzuka': {
    webm: 'assets/videos/chibis/walking-peek.webm',
    mp4: 'assets/videos/chibis/walking-peek.mp4'
  }
};

/* Cardinal edges plus corners -- "another appropriate screen edge" per
   character, all still anchored to the always-on-top .chibi-layer
   overlay (fixed, overflow:hidden), so none of these can ever grow the
   page's scrollable area. */
const EDGES = ['left', 'right', 'top', 'bottom', 'tl', 'tr', 'bl', 'br'];

/* These are meant to read as rare surprises, not a constant companion --
   deliberately low. (An earlier pass used a much higher 56% shared
   chance; this supersedes that per direct feedback that they needed to
   feel rare again.) */
const POP_CHANCE = 0.1;
const AMBIENT_MIN_MS = 9000;
const AMBIENT_MAX_MS = 20000;
/* "Some very brief, some stay a moment" -- randomized per spawn rather
   than one fixed duration. */
const HOLD_MS_MIN = 850;
const HOLD_MS_MAX = 2200;
const HOLD_MS_VIDEO_MIN = 2000;
const HOLD_MS_VIDEO_MAX = 3200;
const EXIT_MS = 420;
const MAX_CONCURRENT = 1;

const POSITION_TYPES = ['edge', 'float', 'behind'];

/* transition duration/easing per dominant trait -- position (where it
   enters from) and flavor (how it moves) are independent, so any
   direction can pair with any character's flavor. */
const TRAIT_FLAVORS = {
  Determination: 'charge', /* fast, confident, minimal overshoot */
  Kindness: 'gentle', /* slow, soft fade, barely any snap */
  Confidence: 'strut', /* springy, a little swagger */
  Competitiveness: 'dash', /* very quick, sharp stop */
  Discipline: 'precise', /* linear, exact, no bounce at all */
  Chaos: 'chaotic', /* the biggest spring overshoot of the set */
  Optimism: 'bounce' /* classic cheerful spring-in */
};

let layerEl = null;
let active = 0;
let ambientTimer = null;

function randomCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function dominantFlavor(character) {
  const profile = character.personalityProfile;
  if (!profile) return 'bounce';
  let bestTrait = null;
  let bestValue = -Infinity;
  Object.keys(profile).forEach((trait) => {
    if (profile[trait] > bestValue) {
      bestValue = profile[trait];
      bestTrait = trait;
    }
  });
  return TRAIT_FLAVORS[bestTrait] || 'bounce';
}

function cardTarget() {
  return document.getElementById('question-card') || document.querySelector('.result-hero');
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
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
  const hold = isVideo ? randomBetween(HOLD_MS_VIDEO_MIN, HOLD_MS_VIDEO_MAX) : randomBetween(HOLD_MS_MIN, HOLD_MS_MAX);
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
  const flavor = dominantFlavor(character);

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-edge-${edge} chibi-flavor-${flavor}`;

  if (edge === 'left' || edge === 'right') {
    el.style.top = 15 + Math.random() * 60 + '%';
  } else if (edge === 'top' || edge === 'bottom') {
    el.style.left = 10 + Math.random() * 68 + '%';
  }
  /* corners (tl/tr/bl/br) need no extra offset -- their CSS anchors them
     directly to a screen corner. */

  el.addEventListener('error', () => el.remove(), { once: true });
  el.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo), { once: true });

  layerEl.appendChild(el);
}

/* Pops up at a random spot anywhere in the viewport rather than sliding
   in from an edge -- this is the "...and everywhere" case. Stays within
   the chibi-layer overlay (z-index above the page) like edge peeks. */
function spawnFloatPeek(character) {
  if (!layerEl) return;
  const { el, isVideo } = createPeekMedia(character);
  const flavor = dominantFlavor(character);

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-float chibi-flavor-${flavor}`;
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
  const flavor = dominantFlavor(character);

  el.alt = '';
  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-behind chibi-flavor-${flavor}`;

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
  const delay = randomBetween(AMBIENT_MIN_MS, AMBIENT_MAX_MS);
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
