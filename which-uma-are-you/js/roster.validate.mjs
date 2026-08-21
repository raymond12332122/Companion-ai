/* ==========================================================================
   Which Uma Are You? — Roster Manifest Validation (dev CLI)

   Not loaded by any page. Run manually from the project directory with:

     node js/roster.validate.mjs

   Checks: no duplicate ids within the roster manifest, no roster id
   collides with an existing characters.js id, every "implemented"
   entry actually has a characters.js entry, and every "planned" entry
   does NOT yet have one (catches a status left stale after a batch
   lands, or the reverse).
   ========================================================================== */

import { ROSTER } from './roster.js';
import { CHARACTERS } from './characters.js';

const VALID_STATUSES = ['implemented', 'planned'];
const errors = [];

const characterIds = new Set(CHARACTERS.map((c) => c.id));
const seenRosterIds = new Map();

ROSTER.forEach((entry, index) => {
  const label = entry && entry.id ? `Roster entry "${entry.id}"` : `Roster entry at index ${index}`;

  if (!entry || typeof entry.id !== 'string' || entry.id.trim() === '') {
    errors.push(`${label}: missing or invalid "id"`);
  }
  if (!entry || typeof entry.name !== 'string' || entry.name.trim() === '') {
    errors.push(`${label}: missing or invalid "name"`);
  }
  if (!entry || !VALID_STATUSES.includes(entry.status)) {
    errors.push(`${label}: "status" must be one of ${VALID_STATUSES.join(', ')}`);
  }

  if (entry && entry.id) {
    if (seenRosterIds.has(entry.id)) {
      errors.push(`Duplicate roster id "${entry.id}" (indices ${seenRosterIds.get(entry.id)} and ${index})`);
    } else {
      seenRosterIds.set(entry.id, index);
    }

    const isImplementedInCharacters = characterIds.has(entry.id);
    if (entry.status === 'implemented' && !isImplementedInCharacters) {
      errors.push(`${label}: marked "implemented" but has no matching entry in characters.js`);
    }
    if (entry.status === 'planned' && isImplementedInCharacters) {
      errors.push(`${label}: marked "planned" but already has an entry in characters.js (status is stale)`);
    }
  }
});

if (errors.length === 0) {
  const implemented = ROSTER.filter((e) => e.status === 'implemented').length;
  const planned = ROSTER.filter((e) => e.status === 'planned').length;
  console.log(
    `Roster manifest OK: ${ROSTER.length} entries (${implemented} implemented, ${planned} planned), ` +
      `no id collisions with characters.js (${CHARACTERS.length} total characters).`
  );
} else {
  console.error(`${errors.length} roster validation error(s):\n`);
  errors.forEach((e) => console.error(`  [FAIL] ${e}`));
}

process.exit(errors.length === 0 ? 0 : 1);
