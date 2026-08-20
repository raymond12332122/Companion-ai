/* ==========================================================================
   Which Uma Are You? — Quiz Page Logic
   ========================================================================== */

import { QUESTIONS } from './questions.js';
import { loadAnswers, saveAnswers } from './storage.js';

let answers = loadAnswers(QUESTIONS.length);
let currentIndex = 0;

const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const questionIndexEl = document.getElementById('question-index');
const questionTextEl = document.getElementById('question-text');
const answersListEl = document.getElementById('answers-list');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

function renderQuestion() {
  const q = QUESTIONS[currentIndex];
  const total = QUESTIONS.length;

  questionIndexEl.textContent = `QUESTION ${currentIndex + 1}`;
  questionTextEl.textContent = q.q;

  const pct = ((currentIndex + 1) / total) * 100;
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `Question ${currentIndex + 1} of ${total}`;

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
}

function selectAnswer(i) {
  answers[currentIndex] = i;
  saveAnswers(answers);
  renderQuestion();
}

function goNext() {
  if (answers[currentIndex] === null) return;

  if (currentIndex === QUESTIONS.length - 1) {
    window.location.href = 'results.html';
    return;
  }
  currentIndex++;
  renderQuestion();
}

function goPrev() {
  if (currentIndex === 0) return;
  currentIndex--;
  renderQuestion();
}

nextBtn.addEventListener('click', goNext);
prevBtn.addEventListener('click', goPrev);

/* resume at first unanswered question, or the last one if all answered */
(function initStartIndex() {
  const firstUnanswered = answers.findIndex((a) => a === null);
  currentIndex = firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered;
})();

renderQuestion();
