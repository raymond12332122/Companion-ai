/* ==========================================================================
   Which Uma Are You? — Matching Engine Self-Test (dev only)

   Not loaded by any page. Run manually from the project directory with:

     node js/matching.selftest.mjs

   Verifies that every character, when matched against its own profile,
   ranks #1 among all characters with a ~100% score. This is the cheapest
   possible regression check for the matching algorithm: if it starts
   failing, either a character's data is broken or the scoring formula
   itself is broken.
   ========================================================================== */

import { CHARACTERS } from './characters.js';
import { normalizeCharacterProfile, rankCharacters } from './matching.js';

const NEAR_100_THRESHOLD = 99.9;

function runSelfTest() {
  let failures = 0;

  CHARACTERS.forEach((character) => {
    const selfProfile = normalizeCharacterProfile(character);
    const ranked = rankCharacters(selfProfile, CHARACTERS);
    const top = ranked[0];

    const rankedFirst = top.character.id === character.id;
    const nearPerfect = top.score >= NEAR_100_THRESHOLD;

    if (!rankedFirst) {
      failures++;
      console.error(
        `[FAIL] ${character.name}: expected itself to rank #1, but "${top.character.name}" ` +
          `ranked #1 instead (${top.score.toFixed(2)}%).`
      );
    } else if (!nearPerfect) {
      failures++;
      console.error(
        `[FAIL] ${character.name}: ranked #1 but self-match score was ${top.score.toFixed(2)}%, ` +
          `expected ~100%.`
      );
    } else {
      console.log(`[PASS] ${character.name}: self-match ${top.score.toFixed(2)}%, ranked #1.`);
    }
  });

  console.log('');
  if (failures === 0) {
    console.log(`All ${CHARACTERS.length} character self-tests passed.`);
  } else {
    console.log(`${failures} of ${CHARACTERS.length} self-test(s) FAILED.`);
  }

  return failures === 0;
}

const passed = runSelfTest();
process.exit(passed ? 0 : 1);
