/* ==========================================================================
   Which Uma Are You? — Chibi Companion System

   Rare, randomized decorative character peeks around the quiz/results UI.
   Reads CHARACTERS for id + name only (image paths, alt text) — never
   modifies it, matching.js, or any scoring data.

   Purely cosmetic: if a chibi image is missing (none are bundled yet —
   see assets/chibis/README.md), the peek's onerror handler removes it
   immediately, before any animation class is applied. There's no
   fallback shape shown here, unlike the character portrait on the
   results page — a placeholder circle popping up at a random edge would
   read as a bug, not a nice surprise, so a missing chibi just means
   nothing happens that cycle.

   Draws from the full current roster generically (by id), not a
   hardcoded character list, matching how the rest of this project
   already treats the roster as open-ended data.
   ========================================================================== */

import { CHARACTERS } from './characters.js';

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const EDGES = ['left', 'right', 'top'];
const AMBIENT_CHANCE = 0.22;
const AMBIENT_MIN_MS = 7000;
const AMBIENT_MAX_MS = 15000;
const HOLD_MS = 1400;
const EXIT_MS = 420;
const REACTION_CHANCE = 0.12;
const MAX_CONCURRENT = 1;

let layerEl = null;
let active = 0;
let ambientTimer = null;

function randomCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function spawnPeek() {
  if (!layerEl || prefersReducedMotion || active >= MAX_CONCURRENT) return;

  const character = randomCharacter();
  const edge = EDGES[Math.floor(Math.random() * EDGES.length)];

  const img = document.createElement('img');
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.className = `chibi-peek chibi-edge-${edge}`;

  if (edge === 'top') {
    img.style.left = 12 + Math.random() * 66 + '%';
  } else {
    img.style.top = 20 + Math.random() * 55 + '%';
  }

  img.addEventListener(
    'error',
    () => {
      img.remove();
    },
    { once: true }
  );

  img.addEventListener(
    'load',
    () => {
      active++;
      requestAnimationFrame(() => img.classList.add('chibi-peek-in'));
      setTimeout(() => {
        img.classList.remove('chibi-peek-in');
        img.classList.add('chibi-peek-out');
        setTimeout(() => {
          img.remove();
          active = Math.max(0, active - 1);
        }, EXIT_MS);
      }, HOLD_MS);
    },
    { once: true }
  );

  layerEl.appendChild(img);
  img.src = `assets/chibis/${character.id}.webp`;
}

function scheduleAmbient() {
  if (prefersReducedMotion) return;
  const delay = AMBIENT_MIN_MS + Math.random() * (AMBIENT_MAX_MS - AMBIENT_MIN_MS);
  ambientTimer = setTimeout(() => {
    if (Math.random() < AMBIENT_CHANCE) spawnPeek();
    scheduleAmbient();
  }, delay);
}

/** Call once per page (quiz.html / results.html) to start ambient peeks. */
export function initChibiLayer(layerId) {
  layerEl = document.getElementById(layerId || 'chibi-layer');
  if (!layerEl || prefersReducedMotion) return;
  scheduleAmbient();
}

/** Small, rare chance to react immediately — call from an answer-select handler. */
export function maybeChibiReaction() {
  if (prefersReducedMotion) return;
  if (Math.random() < REACTION_CHANCE) spawnPeek();
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
