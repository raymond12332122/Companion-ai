/* ==========================================================================
   Which Uma Are You? — Chibi Companion System

   Frequent, randomized decorative character interruptions around the
   quiz/results UI -- a running companion presence rather than a rare
   surprise. Reads CHARACTERS for id + name + personalityProfile only
   (image paths, alt text, entrance flavor) — never modifies it,
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
import { isMuted, VOLUME } from './audio.js';

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

/* Frequent, ambient companions rather than a rare surprise -- per direct
   feedback that they no longer need to feel special/uncommon. A short
   ambient tick interval combined with a coin-flip chance means a new
   peek shows up roughly every several seconds on both the quiz and
   results pages, plus on about half of all answer selections. */
const POP_CHANCE = 0.6;
const AMBIENT_MIN_MS = 2500;
const AMBIENT_MAX_MS = 5000;
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

/* The source videos are chibis rendered on a solid black background, and
   plain <video> has no way to make that transparent in a browser --
   video elements never composite an alpha channel, even for formats
   that could technically carry one. Real-time "black matte" keying via
   a hidden <video> decoding into a same-size <canvas> is the standard,
   reliable way around that: for each frame, treat luma (the brightest
   of R/G/B) as an alpha estimate -- near-black pixels go fully
   transparent, near-full-brightness pixels stay fully opaque, and the
   thin anti-aliased band between is un-premultiplied (divided back out
   by its own alpha) instead of just faded, which is what keeps the
   character's edge pixels their real color instead of fading to a dark
   halo. The canvas is what actually gets positioned/animated as the
   peek; the <video> that feeds it stays off-screen (1x1, opacity 0) but
   present in the DOM so it keeps decoding. */
const CHROMA_KEY_LOW = 14; /* at or below: fully transparent */
const CHROMA_KEY_HIGH = 60; /* at or above: fully opaque, left as-is */

function createChromaKeyPeek(sources) {
  const video = document.createElement('video');
  /* Plays with the audio the clip actually shipped with, at the same
     volume and mute-toggle awareness as every other sound in the app --
     see isMuted()/VOLUME in audio.js. If a browser blocks this
     particular unmuted autoplay (most likely one of the ambient,
     timer-triggered spawns rather than one fired right from a click),
     the explicit .play() below catches that and falls back to muted
     playback so the peek still animates instead of sitting frozen. */
  video.muted = isMuted();
  video.volume = VOLUME;
  video.playsInline = true;
  video.loop = true;
  video.style.cssText = 'position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;';
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

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  let ctx = null;
  let rafId = null;
  let stopped = false;

  function drawFrame() {
    if (stopped) return;
    if (video.readyState >= 2 && !video.paused && !video.ended) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      const range = CHROMA_KEY_HIGH - CHROMA_KEY_LOW;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = r > g ? (r > b ? r : b) : g > b ? g : b;
        if (luma <= CHROMA_KEY_LOW) {
          data[i + 3] = 0;
        } else if (luma < CHROMA_KEY_HIGH) {
          const alpha = (luma - CHROMA_KEY_LOW) / range;
          data[i] = Math.min(255, r / alpha);
          data[i + 1] = Math.min(255, g / alpha);
          data[i + 2] = Math.min(255, b / alpha);
          data[i + 3] = Math.round(alpha * 255);
        }
      }
      ctx.putImageData(frame, 0, 0);
    }
    rafId = requestAnimationFrame(drawFrame);
  }

  video.addEventListener(
    'loadeddata',
    () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx = canvas.getContext('2d', { willReadFrequently: true });
      rafId = requestAnimationFrame(drawFrame);

      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          /* Unmuted autoplay was blocked for this spawn -- retry muted so
             the peek still plays visually rather than staying paused on
             its first frame. A second rejection here would mean autoplay
             itself is blocked entirely, which the same silent catch
             pattern used throughout audio.js already treats as fine. */
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    },
    { once: true }
  );

  return {
    el: canvas,
    isVideo: true,
    readyEl: video,
    cleanup: () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      video.pause();
      video.remove();
    }
  };
}

function createPeekMedia(character) {
  const sources = CHIBI_VIDEO_MAP[character.id];
  if (sources) return createChromaKeyPeek(sources);
  const img = document.createElement('img');
  img.src = `assets/chibis/${character.id}.webp`;
  return { el: img, isVideo: false, readyEl: img, cleanup: null };
}

function settleAndAnimate(el, isVideo, cleanup) {
  active++;
  requestAnimationFrame(() => el.classList.add('chibi-peek-in'));
  const hold = isVideo ? randomBetween(HOLD_MS_VIDEO_MIN, HOLD_MS_VIDEO_MAX) : randomBetween(HOLD_MS_MIN, HOLD_MS_MAX);
  setTimeout(() => {
    el.classList.remove('chibi-peek-in');
    el.classList.add('chibi-peek-out');
    setTimeout(() => {
      cleanup?.();
      el.remove();
      active = Math.max(0, active - 1);
    }, EXIT_MS);
  }, hold);
}

function spawnEdgePeek(character) {
  if (!layerEl) return;
  const { el, isVideo, readyEl, cleanup } = createPeekMedia(character);
  const edge = EDGES[Math.floor(Math.random() * EDGES.length)];
  const flavor = dominantFlavor(character);

  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-edge-${edge} chibi-flavor-${flavor}`;
  if (!isVideo) el.alt = '';

  if (edge === 'left' || edge === 'right') {
    el.style.top = 15 + Math.random() * 60 + '%';
  } else if (edge === 'top' || edge === 'bottom') {
    el.style.left = 10 + Math.random() * 68 + '%';
  }
  /* corners (tl/tr/bl/br) need no extra offset -- their CSS anchors them
     directly to a screen corner. */

  readyEl.addEventListener('error', () => { cleanup?.(); el.remove(); }, { once: true });
  readyEl.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo, cleanup), { once: true });

  layerEl.appendChild(el);
  if (isVideo) layerEl.appendChild(readyEl);
}

/* Pops up at a random spot anywhere in the viewport rather than sliding
   in from an edge -- this is the "...and everywhere" case. Stays within
   the chibi-layer overlay (z-index above the page) like edge peeks. */
function spawnFloatPeek(character) {
  if (!layerEl) return;
  const { el, isVideo, readyEl, cleanup } = createPeekMedia(character);
  const flavor = dominantFlavor(character);

  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-float chibi-flavor-${flavor}`;
  if (!isVideo) el.alt = '';
  el.style.top = 10 + Math.random() * 70 + '%';
  el.style.left = 8 + Math.random() * 74 + '%';

  readyEl.addEventListener('error', () => { cleanup?.(); el.remove(); }, { once: true });
  readyEl.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo, cleanup), { once: true });

  layerEl.appendChild(el);
  if (isVideo) layerEl.appendChild(readyEl);
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
  const { el, isVideo, readyEl, cleanup } = createPeekMedia(character);
  const flavor = dominantFlavor(character);

  el.setAttribute('aria-hidden', 'true');
  el.className = `chibi-peek chibi-behind chibi-flavor-${flavor}`;
  if (!isVideo) el.alt = '';

  const size = 124; /* must match .chibi-behind's width in style.css */
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

  readyEl.addEventListener('error', () => { cleanup?.(); el.remove(); }, { once: true });
  readyEl.addEventListener(isVideo ? 'loadeddata' : 'load', () => settleAndAnimate(el, isVideo, cleanup), { once: true });

  page.appendChild(el);
  if (isVideo) page.appendChild(readyEl);
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
