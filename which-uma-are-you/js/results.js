/* ==========================================================================
   Which Uma Are You? — Results Page Logic
   Rendering only. All scoring lives in matching.js.
   ========================================================================== */

import { TRAITS } from './traits.js';
import { QUESTIONS } from './questions.js';
import { CHARACTERS } from './characters.js';
import { loadAnswers, clearAnswers } from './storage.js';
import { computeUserProfile, rankCharacters } from './matching.js';
import { initAudioToggle, playResultsRevealSfx } from './audio.js';
import { initChibiLayer } from './chibi.js';
import {
  t,
  tTrait,
  tChar,
  initLangToggle,
  applyStaticTranslations,
  onLangChange
} from './i18n.js';

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 6 small CSS-only spark particles for the results reveal, staggered via
   nth-child delays in style.css. Skipped entirely under reduced motion
   (never inserted), same treatment as the finish-sweep and count-up. */
const PARTICLE_SPANS = Array.from({ length: 6 }, () => '<span class="spark"></span>').join('');

/* One emoji per trait for the "stat gauge" row -- purely decorative
   labeling, reads the same fixed TRAITS list already used everywhere
   else in this file, so a roster-wide trait rename stays a one-line
   change in traits.js rather than needing a second lookup kept in sync. */
const TRAIT_ICONS = {
  Determination: '🔥',
  Kindness: '💗',
  Confidence: '⭐',
  Competitiveness: '⚡',
  Discipline: '🎯',
  Chaos: '🌪️',
  Optimism: '☀️'
};

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Initials are painted first as a CSS-gradient fallback; when
 * character.image is set, an <img> is layered on top via CSS (see
 * .character-portrait img / .other-match-avatar img). If the image is
 * missing or fails to load, onerror hides it and the initials show
 * through underneath — no per-character color data needed either way.
 * The hero portrait loads eagerly (it's the first thing on the page);
 * other-match thumbnails lazy-load since they usually sit lower down.
 */
function avatarInnerHTML(character, { lazy } = {}) {
  const initialsHTML = `<span class="avatar-initials">${initials(character.name)}</span>`;
  if (!character.image) return initialsHTML;

  const loadingAttr = lazy ? 'loading="lazy"' : 'loading="eager"';
  const img = `<img src="${character.image}" alt="${character.name}" ${loadingAttr} onerror="this.style.display='none'" />`;
  return initialsHTML + img;
}

/**
 * The hero portrait renders differently from every other avatar in the
 * app: instead of an image cropped to fill a circular badge, the badge
 * (rings, gradient, gold sweep) stays as a decorative disc and the
 * character art sits on top uncropped, tall enough to overflow past its
 * top edge -- see .portrait-figure in style.css. Falls back to the same
 * initials-in-a-circle treatment as everywhere else when there's no
 * image, or if the image fails to load (onerror removes the whole
 * breakout figure, leaving the circle's initials as-is).
 */
function heroPortraitHTML(character) {
  const initialsHTML = `<span class="avatar-initials">${initials(character.name)}</span>`;
  if (!character.image) return `<div class="character-portrait">${initialsHTML}</div>`;

  /* has-image hides the initials while the breakout figure is showing --
     unlike the old cover-cropped circle, the figure doesn't fully cover
     the badge, so the initials would otherwise peek through the gaps
     beside the character. onerror removes the figure and un-hides the
     initials, restoring the normal no-image fallback. */
  const circle = `<div class="character-portrait has-image">${initialsHTML}</div>`;
  const figure = `<div class="portrait-figure"><img src="${character.image}" alt="${character.name}" loading="eager" onerror="this.closest('.portrait-frame')?.querySelector('.character-portrait')?.classList.remove('has-image'); this.parentElement.remove();" /></div>`;
  return circle + figure;
}

const MAX_OTHER_MATCHES = 5;

/* Exported (in addition to being used internally below) so it can be
   driven directly in tests without reverse-engineering quiz answers
   that land on a specific character — see the per-character render
   check run for each V0.4 batch. Behavior for the live page is
   unchanged either way. */
export function renderResult(userProfile, matches) {
  const best = matches[0];
  /* Cap displayed "other matches" so results stay readable as the
     roster grows well past 6 characters — matching.js itself still
     ranks and returns every character. */
  const others = matches.slice(1, 1 + MAX_OTHER_MATCHES);
  const container = document.getElementById('result-content');

  const traitRows = TRAITS.map((trait) => {
    const pct = Math.round(userProfile[trait] * 100);
    /* Tiers the fill color by strength -- gold for a standout trait,
       the default cyan/pink gradient otherwise -- so color carries real
       information about the stat sheet rather than just decorating it. */
    const tierClass = pct >= 60 ? ' is-standout' : '';
    return `
      <div class="trait-row">
        <div class="trait-row-top">
          <span class="trait-icon">${TRAIT_ICONS[trait] || ''}</span>
          <span class="trait-name">${tTrait(trait)}</span>
          <span class="trait-pct">${pct}%</span>
        </div>
        <div class="trait-track">
          <div class="trait-fill${tierClass}" data-pct="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  const otherRows = others
    .map((m, i) => {
      const pct = Math.round(m.score);
      /* Silver/bronze accent for #2 and #3 -- a podium cue for the two
         closest runners-up, rest of the field stays the default look. */
      const podiumClass = i === 0 ? ' is-podium-silver' : i === 1 ? ' is-podium-bronze' : '';
      return `
        <div class="other-match-row${podiumClass}">
          <span class="other-match-rank">#${i + 2}</span>
          <span class="other-match-avatar">${avatarInnerHTML(m.character, { lazy: true })}</span>
          <span class="other-match-name">${m.character.name}</span>
          <span class="other-match-pct">${pct}%</span>
        </div>
      `;
    })
    .join('');

  const bestChar = best.character;
  const strengthItems = tChar(bestChar.id, 'strengths', bestChar.strengths || [])
    .map((s) => `<li>${s}</li>`)
    .join('');
  const weaknessItems = tChar(bestChar.id, 'weaknesses', bestChar.weaknesses || [])
    .map((w) => `<li>${w}</li>`)
    .join('');

  const bestPct = Math.round(best.score);

  container.innerHTML = `
    <div class="result-hero">
      <span class="badge">${t('yourMatch')}</span>
      <div class="eyebrow">${t('youAre')}</div>

      <div class="portrait-frame">
        <div class="portrait-checker-ring" aria-hidden="true"></div>
        ${heroPortraitHTML(best.character)}
        <div class="finish-sweep"></div>
        ${prefersReducedMotion ? '' : PARTICLE_SPANS}
      </div>

      <div class="character-name">${bestChar.name}</div>
      <div class="character-tagline">${tChar(bestChar.id, 'tagline', bestChar.tagline)}</div>

      <div class="match-badge">
        <span class="match-percent" id="match-percent">${prefersReducedMotion ? bestPct : 0}%</span>
        <span class="match-percent-label">${t('matchLabel')}</span>
      </div>
    </div>

    <div class="section-title">${t('sectionStats')}</div>
    <div class="trait-bars">
      ${traitRows}
    </div>

    <div class="section-title">${t('sectionAnalysis')}</div>
    <div class="match-card">
      <p class="match-summary">${tChar(bestChar.id, 'summary', bestChar.summary)}</p>

      ${
        strengthItems
          ? `<div class="trait-list-group">
               <div class="trait-list-title is-strength">${t('strengths')}</div>
               <ul class="trait-list is-strength">${strengthItems}</ul>
             </div>`
          : ''
      }

      ${
        weaknessItems
          ? `<div class="trait-list-group">
               <div class="trait-list-title is-weakness">${t('weaknesses')}</div>
               <ul class="trait-list is-weakness">${weaknessItems}</ul>
             </div>`
          : ''
      }

      ${bestChar.raceStrategy ? `<p class="race-strategy">${tChar(bestChar.id, 'raceStrategy', bestChar.raceStrategy)}</p>` : ''}
    </div>

    <div class="section-title">${t('sectionField')}</div>
    <div class="other-matches">
      ${otherRows}
    </div>
  `;

  /* animate bars in after paint */
  requestAnimationFrame(() => {
    document.querySelectorAll('.trait-fill').forEach((el) => {
      el.style.width = el.getAttribute('data-pct') + '%';
    });
  });

  /* Match-percent count-up -- the signature "finish line" reveal pairs a
     gold sweep across the portrait (pure CSS, see .finish-sweep) with the
     number counting up from 0, a few spark particles, and one SFX cue.
     All of it is one decorative unit, so it's skipped together under
     reduced motion: the final value is already rendered above instead. */
  if (!prefersReducedMotion) {
    playResultsRevealSfx();
    const percentEl = document.getElementById('match-percent');
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      percentEl.textContent = Math.round(eased * bestPct) + '%';
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
}

function renderEmptyState() {
  const container = document.getElementById('result-content');
  container.innerHTML = `
    <div class="result-hero">
      <span class="badge">${t('emptyBadge')}</span>
      <h2 style="margin-top:16px;">${t('emptyTitle')}</h2>
      <p style="color:var(--text-dim); margin-top:10px;">
        ${t('emptyBody')}
      </p>
    </div>
  `;
  document.getElementById('retake-btn').textContent = t('emptyBtn');
}

/* --- Main --------------------------------------------------- */

const answers = loadAnswers(QUESTIONS.length);
const isComplete = answers.every((a) => a !== null && a !== undefined);

if (!isComplete) {
  renderEmptyState();
  onLangChange(() => renderEmptyState());
} else {
  const userProfile = computeUserProfile(answers);
  const matches = rankCharacters(userProfile, CHARACTERS);
  renderResult(userProfile, matches);
  initChibiLayer('chibi-layer'); /* only around an actual result card */

  /* Re-render the same already-computed match in the new language.
     computeUserProfile/rankCharacters are deliberately NOT re-run: the
     result must be identical across languages, and re-rendering from the
     same objects makes that structural rather than a promise. */
  onLangChange(() => {
    renderResult(userProfile, matches);
    document.getElementById('retake-btn').textContent = t('retakeBtn');
  });
}

document.getElementById('retake-btn').addEventListener('click', () => {
  clearAnswers();
  window.location.href = 'quiz.html';
});

/* The retake button label is owned by JS (renderEmptyState swaps it to
   "Start Quiz"), so it's set here rather than via a data-i18n attribute
   that applyStaticTranslations would fight over. */
if (isComplete) document.getElementById('retake-btn').textContent = t('retakeBtn');

initAudioToggle(document.getElementById('audio-toggle'));
initLangToggle(document.getElementById('lang-toggle'));
applyStaticTranslations();
