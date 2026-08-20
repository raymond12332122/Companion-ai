/* ==========================================================================
   Which Uma Are You? — Results Page Logic
   Rendering only. All scoring lives in matching.js.
   ========================================================================== */

import { TRAITS } from './traits.js';
import { QUESTIONS } from './questions.js';
import { CHARACTERS } from './characters.js';
import { loadAnswers, clearAnswers } from './storage.js';
import { computeUserProfile, rankCharacters } from './matching.js';

function initials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function renderResult(userProfile, matches) {
  const best = matches[0];
  const others = matches.slice(1);
  const container = document.getElementById('result-content');

  const traitRows = TRAITS.map((t) => {
    const pct = Math.round(userProfile[t] * 100);
    return `
      <div class="trait-row">
        <div class="trait-row-top">
          <span>${t}</span>
          <span>${pct}%</span>
        </div>
        <div class="trait-track">
          <div class="trait-fill" data-pct="${pct}"></div>
        </div>
      </div>
    `;
  }).join('');

  const otherRows = others
    .map((m) => {
      const pct = Math.round(m.score);
      return `
        <div class="other-match-row">
          <span class="other-match-dot" style="background:${m.character.color}"></span>
          <span class="other-match-name">${m.character.name}</span>
          <span class="other-match-pct">${pct}%</span>
        </div>
      `;
    })
    .join('');

  const bestPct = Math.round(best.score);

  container.innerHTML = `
    <div class="result-hero">
      <span class="badge">🏆 Your Match</span>
      <div class="character-portrait" style="background:${best.character.color}">
        ${initials(best.character.name)}
      </div>
      <div class="character-name">${best.character.name}</div>
      <div class="character-tagline">${best.character.tagline}</div>
    </div>

    <div class="character-blurb">
      ${best.character.blurb}
      <br /><br />
      You matched <span class="match-score">${bestPct}%</span> with ${best.character.name}.
    </div>

    <div class="section-title">Your Trait Profile</div>
    <div class="trait-bars">
      ${traitRows}
    </div>

    <div class="section-title">Other Close Matches</div>
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
}

function renderEmptyState() {
  const container = document.getElementById('result-content');
  container.innerHTML = `
    <div class="result-hero">
      <span class="badge">⚠️ No Answers Found</span>
      <h2 style="margin-top:16px;">Take the quiz first!</h2>
      <p style="color:var(--text-dim); margin-top:10px;">
        We couldn't find any saved answers. Start the quiz to get your result.
      </p>
    </div>
  `;
  document.getElementById('retake-btn').textContent = 'Start Quiz';
}

/* --- Main --------------------------------------------------- */

const answers = loadAnswers(QUESTIONS.length);
const isComplete = answers.every((a) => a !== null && a !== undefined);

if (!isComplete) {
  renderEmptyState();
} else {
  const userProfile = computeUserProfile(answers);
  const matches = rankCharacters(userProfile, CHARACTERS);
  renderResult(userProfile, matches);
}

document.getElementById('retake-btn').addEventListener('click', () => {
  clearAnswers();
  window.location.href = 'quiz.html';
});
