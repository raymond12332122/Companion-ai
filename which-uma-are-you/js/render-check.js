/* ==========================================================================
   Which Uma Are You? — Per-Character Render Check (dev harness)

   Not linked from index.html/quiz.html/results.html. Paired with
   render-check.harness.html for driving results.js's real renderResult()
   against an arbitrary character, via ?charId=<id> in the URL, without
   needing to reverse-engineer 25 quiz answers that land on that specific
   character. Used by a Playwright script to check every implemented
   character renders its result page cleanly — see the V0.4 batch report
   for how it was run.
   ========================================================================== */

import { CHARACTERS } from './characters.js';
import { normalizeCharacterProfile, rankCharacters } from './matching.js';
import { renderResult } from './results.js';

const params = new URLSearchParams(window.location.search);
const charId = params.get('charId');
const target = CHARACTERS.find((c) => c.id === charId);

if (!target) {
  document.getElementById('result-content').innerHTML =
    `<p style="color:red">No character with id "${charId}"</p>`;
} else {
  const userProfile = normalizeCharacterProfile(target);
  const matches = rankCharacters(userProfile, CHARACTERS);
  renderResult(userProfile, matches);
}
