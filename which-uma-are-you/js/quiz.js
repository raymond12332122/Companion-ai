/* ==========================================================================
   Which Uma Are You? — Quiz Page Logic
   ========================================================================== */

import { QUESTIONS } from './questions.js';
import { loadAnswers, saveAnswers } from './storage.js';

let answers = loadAnswers(QUESTIONS.length);
let currentIndex = 0;

const bibCurrentEl = document.getElementById('bib-current');
const bibTotalEl = document.getElementById('bib-total');
const quizPctEl = document.getElementById('quiz-pct');
const laneTrackEl = document.getElementById('lane-track');
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

function dominantTraitFxClass(weights) {
  let bestTrait = null;
  let bestValue = -Infinity;
  Object.keys(weights).forEach((trait) => {
    if (weights[trait] > bestValue) {
      bestValue = weights[trait];
      bestTrait = trait;
    }
  });
  return TRAIT_FX_CLASS[bestTrait] || null;
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
}

function renderQuestion(opts = {}) {
  const q = QUESTIONS[currentIndex];
  const total = QUESTIONS.length;

  questionIndexEl.textContent = `QUESTION ${currentIndex + 1}`;
  questionTextEl.textContent = q.q;

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
    textSpan.textContent = answer.text;

    btn.appendChild(letterSpan);
    btn.appendChild(textSpan);

    btn.addEventListener('click', () => selectAnswer(i));
    answersListEl.appendChild(btn);
  });

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = answers[currentIndex] === null;
  nextBtn.textContent = currentIndex === total - 1 ? 'See Results →' : 'Next →';

  /* Card slide-in only when actually moving between questions (Prev/Next),
     not when re-rendering after picking an answer on the same question. */
  if (opts.animateCard) {
    questionCardEl.classList.remove('q-enter');
    void questionCardEl.offsetWidth; /* restart the animation */
    questionCardEl.classList.add('q-enter');
  }
}

function selectAnswer(i) {
  answers[currentIndex] = i;
  saveAnswers(answers);
  renderQuestion();

  const fxClass = dominantTraitFxClass(QUESTIONS[currentIndex].answers[i].weights);
  const selectedBtn = answersListEl.children[i];
  if (fxClass && selectedBtn) {
    selectedBtn.classList.add(fxClass);
  }
}

function goNext() {
  if (answers[currentIndex] === null) return;

  if (currentIndex === QUESTIONS.length - 1) {
    window.location.href = 'results.html';
    return;
  }
  currentIndex++;
  renderQuestion({ animateCard: true });
}

function goPrev() {
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
