/* ==========================================================================
   Which Uma Are You? — Quiz Page Logic
   ========================================================================== */

import { QUESTIONS } from './questions.js';
import { loadAnswers, saveAnswers } from './storage.js';
import { initAudioToggle, playSelectionSfx } from './audio.js';
import { initChibiLayer, maybeChibiReaction } from './chibi.js';
import {
  t,
  tQuestion,
  tAnswer,
  initLangToggle,
  applyStaticTranslations,
  onLangChange
} from './i18n.js';

const prefersReducedMotion =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* How long the selection feedback (card animation + SFX + chibi chance)
   plays before auto-advancing. Chosen to land the whole selection ->
   advance sequence in the 300-500ms range this pass asked for; shorter
   under reduced motion since there's no animation to wait out, just a
   brief pause so the tap still feels acknowledged before the view
   changes. */
const ADVANCE_DELAY_MS = prefersReducedMotion ? 150 : 420;

let answers = loadAnswers(QUESTIONS.length);
let currentIndex = 0;
let advanceTimer = null;

const bibCurrentEl = document.getElementById('bib-current');
const bibTotalEl = document.getElementById('bib-total');
const quizPctEl = document.getElementById('quiz-pct');
const laneTrackEl = document.getElementById('lane-track');
const laneMarkerEl = document.getElementById('lane-marker');
const questionCardEl = document.getElementById('question-card');
const questionIndexEl = document.getElementById('question-index');
const questionTextEl = document.getElementById('question-text');
const answersListEl = document.getElementById('answers-list');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

/* Each answer's dominant trait (highest weight, ties broken by first-listed
   key) gets a short, purely-visual feedback effect on selection. Reads
   existing answer.weights -- never changes scoring, matching, or data. */
const TRAIT_FX_CLASS = {
  Determination: 'fx-determination',
  Kindness: 'fx-kindness',
  Confidence: 'fx-confidence',
  Competitiveness: 'fx-competitiveness',
  Discipline: 'fx-discipline',
  Chaos: 'fx-chaos',
  Optimism: 'fx-optimism'
};

function dominantTrait(weights) {
  let bestTrait = null;
  let bestValue = -Infinity;
  Object.keys(weights).forEach((trait) => {
    if (weights[trait] > bestValue) {
      bestValue = weights[trait];
      bestTrait = trait;
    }
  });
  return bestTrait;
}

function buildLaneTrack() {
  laneTrackEl.innerHTML = '';
  QUESTIONS.forEach(() => {
    const seg = document.createElement('div');
    seg.className = 'lane-seg';
    const fill = document.createElement('div');
    fill.className = 'lane-seg-fill';
    seg.appendChild(fill);
    laneTrackEl.appendChild(seg);
  });
}

function updateLaneTrack() {
  const fills = laneTrackEl.querySelectorAll('.lane-seg-fill');
  fills.forEach((fillEl, i) => {
    fillEl.style.width = i <= currentIndex ? '100%' : '0%';
  });

  /* Rides along the top of the track at the current-question position --
     a "checkpoint" marker rather than a plain bar, purely visual and
     independent of buildLaneTrack()'s own DOM (which lives in a sibling
     element so wiping/rebuilding the segments never touches the marker). */
  if (laneMarkerEl) {
    const total = QUESTIONS.length;
    const pct = ((currentIndex + 1) / total) * 100;
    laneMarkerEl.style.left = pct + '%';
  }
}

function renderQuestion(opts = {}) {
  const q = QUESTIONS[currentIndex];
  const total = QUESTIONS.length;

  questionIndexEl.textContent = `${t('questionLabel')} ${currentIndex + 1}`;
  questionTextEl.textContent = tQuestion(currentIndex, q.q);

  bibCurrentEl.textContent = String(currentIndex + 1).padStart(2, '0');
  bibTotalEl.textContent = String(total).padStart(2, '0');
  quizPctEl.textContent = Math.round(((currentIndex + 1) / total) * 100) + '%';
  updateLaneTrack();

  answersListEl.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.answers.forEach((answer, i) => {
    const btn = document.createElement('button');
    btn.className = 'answer-option';
    btn.type = 'button';
    if (answers[currentIndex] === i) {
      btn.classList.add('selected');
    }

    const letterSpan = document.createElement('span');
    letterSpan.className = 'letter';
    letterSpan.textContent = letters[i];

    const textSpan = document.createElement('span');
    textSpan.textContent = tAnswer(currentIndex, i, answer.text);

    btn.appendChild(letterSpan);
    btn.appendChild(textSpan);

    btn.addEventListener('click', () => selectAnswer(i));
    answersListEl.appendChild(btn);
  });

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = answers[currentIndex] === null;
  nextBtn.textContent = t(currentIndex === total - 1 ? 'seeResults' : 'nextBtn');

  /* Card slide-in only when actually moving between questions (Prev/Next),
     not when re-rendering after picking an answer on the same question. */
  if (opts.animateCard) {
    questionCardEl.classList.remove('q-enter');
    void questionCardEl.offsetWidth; /* restart the animation */
    questionCardEl.classList.add('q-enter');
  }
}

function selectAnswer(i) {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }

  answers[currentIndex] = i;
  saveAnswers(answers);
  renderQuestion();

  const trait = dominantTrait(QUESTIONS[currentIndex].answers[i].weights);
  const fxClass = TRAIT_FX_CLASS[trait];
  const selectedBtn = answersListEl.children[i];
  if (selectedBtn) {
    /* Fired fresh on every active tap (never replayed just from
       navigating back to an already-answered question via
       renderQuestion(), since that path never calls selectAnswer) --
       a consistent "locked in" ping from the letter badge, layered
       underneath whichever trait-specific fx plays alongside it. */
    selectedBtn.classList.add('fx-select-ring');
    if (fxClass) selectedBtn.classList.add(fxClass);
  }

  playSelectionSfx(trait);
  maybeChibiReaction();

  /* Selecting an answer auto-advances after a short beat so the tap
     itself (card state, trait fx, SFX, occasional chibi) has time to
     register. Next still works — it just cancels this timer and
     advances immediately, so it's a "skip the wait" control rather than
     a separate mechanism, and there's no path where both could fire. */
  advanceTimer = setTimeout(() => {
    advanceTimer = null;
    advance();
  }, ADVANCE_DELAY_MS);
}

function advance() {
  if (answers[currentIndex] === null) return;

  if (currentIndex === QUESTIONS.length - 1) {
    window.location.href = 'results.html';
    return;
  }
  currentIndex++;
  renderQuestion({ animateCard: true });
}

function goNext() {
  if (answers[currentIndex] === null) return;
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  advance();
}

function goPrev() {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  if (currentIndex === 0) return;
  currentIndex--;
  renderQuestion({ animateCard: true });
}

nextBtn.addEventListener('click', goNext);
prevBtn.addEventListener('click', goPrev);

/* resume at first unanswered question, or the last one if all answered */
(function initStartIndex() {
  const firstUnanswered = answers.findIndex((a) => a === null);
  currentIndex = firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered;
})();

buildLaneTrack();
renderQuestion();

initAudioToggle(document.getElementById('audio-toggle'));
initLangToggle(document.getElementById('lang-toggle'));
applyStaticTranslations();
initChibiLayer('chibi-layer');

/* Re-render the current question in the new language. Answers already
   given live in storage and are keyed by index, so switching language
   mid-quiz keeps every selection and the current position intact -- only
   the displayed text changes. */
onLangChange(() => renderQuestion());
