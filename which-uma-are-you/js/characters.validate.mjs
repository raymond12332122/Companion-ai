/* ==========================================================================
   Which Uma Are You? — Character Data Validation (dev CLI)

   Not loaded by any page. Run manually from the project directory with:

     node js/characters.validate.mjs

   Checks every character in characters.js against the schema: unique
   ids, required fields present, valid image path when an image is
   provided, all seven trait values present and within 0-10, and that
   strengths/weaknesses are proper arrays. Exits 1 on any failure so it
   can be used as a pre-merge gate later if desired.
   ========================================================================== */

import { TRAITS } from './traits.js';
import { CHARACTERS } from './characters.js';
import { validateCharacters } from './characters.validate.js';

const { valid, errors } = validateCharacters(CHARACTERS, TRAITS);

if (valid) {
  console.log(`All ${CHARACTERS.length} characters passed validation.`);
} else {
  console.error(`${errors.length} validation error(s) found in ${CHARACTERS.length} characters:\n`);
  errors.forEach((e) => console.error(`  [FAIL] ${e}`));
}

process.exit(valid ? 0 : 1);
