/* ==========================================================================
   Which Uma Are You? — Audio System

   Reusable, mute-aware SFX playback. Every play() call is wrapped so a
   missing or unplayable audio file (none are bundled yet — see
   assets/audio/README.md) never throws, logs, or blocks the quiz; it's
   silent by design until real files are dropped in.

   Autoplay safety: every exported play* function is only ever called
   from inside quiz.js's answer-select handler or results.js's reveal
   sequence — both already gated behind a prior user gesture (starting
   the quiz). Nothing here ever plays on page load or on a timer by
   itself, so there's nothing that could violate mobile autoplay
   restrictions or "never autoplay before interaction" — it's satisfied
   structurally, not by a runtime check.
   ========================================================================== */

const MUTE_KEY = 'uma-audio-muted';
const VOLUME = 0.55;
const EASTER_EGG_CHANCE = 0.06; /* ~1-2 times across a full 25-question run */

const SFX_PATHS = {
  Determination: 'assets/audio/trait-determination.mp3',
  Kindness: 'assets/audio/trait-kindness.mp3',
  Confidence: 'assets/audio/trait-confidence.mp3',
  Competitiveness: 'assets/audio/trait-competitiveness.mp3',
  Discipline: 'assets/audio/trait-discipline.mp3',
  Chaos: 'assets/audio/trait-chaos.mp3',
  Optimism: 'assets/audio/trait-optimism.mp3',
  select: 'assets/audio/select.mp3',
  resultsReveal: 'assets/audio/results-reveal.mp3',
  easterEgg: 'assets/audio/easter-egg.mp3'
};

let muted = readMutedPref();
const cache = new Map();

function readMutedPref() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function writeMutedPref(value) {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch (e) {
    /* storage unavailable — preference just won't persist across visits */
  }
}

function getAudio(path) {
  if (!cache.has(path)) {
    const audio = new Audio(path);
    audio.preload = 'none'; /* don't fetch anything until actually played */
    audio.volume = VOLUME;
    cache.set(path, audio);
  }
  return cache.get(path);
}

function play(key) {
  if (muted) return;
  const path = SFX_PATHS[key];
  if (!path) return;
  try {
    const audio = getAudio(path);
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        /* missing asset, decode failure, or a browser blocking this call
           for a reason we didn't anticipate — silent, never breaks the quiz */
      });
    }
  } catch (e) {
    /* never let audio break the quiz */
  }
}

/**
 * Plays the sound for an answer selection. Picks the dominant trait's SFX
 * (see js/quiz.js for how the dominant trait is computed from the
 * answer's existing weights — this function never touches that data,
 * only receives the trait name as a string). Rarely, instead plays a
 * one-off easter-egg sound in its place — see assets/audio/README.md for
 * what "Mambo-style" means here and what it doesn't.
 */
export function playSelectionSfx(trait) {
  if (Math.random() < EASTER_EGG_CHANCE) {
    play('easterEgg');
    return;
  }
  play(SFX_PATHS[trait] ? trait : 'select');
}

export function playResultsRevealSfx() {
  play('resultsReveal');
}

/**
 * Wires a button up as the mute toggle: reflects current state, persists
 * changes, and updates its own label/icon. Call once per page.
 */
export function initAudioToggle(buttonEl) {
  if (!buttonEl) return;
  updateToggleUI(buttonEl);
  buttonEl.addEventListener('click', () => {
    muted = !muted;
    writeMutedPref(muted);
    updateToggleUI(buttonEl);
  });
}

function updateToggleUI(buttonEl) {
  buttonEl.textContent = muted ? '🔇' : '🔊';
  buttonEl.setAttribute('aria-pressed', String(muted));
  buttonEl.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
}
