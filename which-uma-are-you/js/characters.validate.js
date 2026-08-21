/* ==========================================================================
   Which Uma Are You? — Character Data Validation
   Pure validation logic. No DOM, no Node-only APIs — importable from a
   browser or from Node (see characters.validate.mjs for the dev CLI).
   ========================================================================== */

const IMAGE_PATH_PATTERN = /^assets\/characters\/([a-z0-9-]+)\.(webp|png|jpe?g)$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isArrayOfNonEmptyStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

/**
 * Validates one character object against the schema:
 *   { id, name, image?, tagline, summary, strengths[], weaknesses[],
 *     raceStrategy, personalityProfile{ <trait>: 0-10 for every trait } }
 *
 * Returns an array of human-readable error strings (empty if valid).
 * `label` is used to identify the character in error messages when its
 * own id can't be trusted (missing/invalid).
 */
function validateOneCharacter(character, traits, label) {
  const errors = [];

  if (!character || typeof character !== 'object' || Array.isArray(character)) {
    return [`${label}: is not a plain object`];
  }

  if (!isNonEmptyString(character.id)) {
    errors.push(`${label}: missing or invalid "id" (must be a non-empty string)`);
  }
  if (!isNonEmptyString(character.name)) {
    errors.push(`${label}: missing or invalid "name" (must be a non-empty string)`);
  }
  if (!isNonEmptyString(character.tagline)) {
    errors.push(`${label}: missing or invalid "tagline" (must be a non-empty string)`);
  }
  if (!isNonEmptyString(character.summary)) {
    errors.push(`${label}: missing or invalid "summary" (must be a non-empty string)`);
  }
  if (!isNonEmptyString(character.raceStrategy)) {
    errors.push(`${label}: missing or invalid "raceStrategy" (must be a non-empty string)`);
  }

  if (!isArrayOfNonEmptyStrings(character.strengths)) {
    errors.push(`${label}: "strengths" must be a non-empty array of non-empty strings`);
  }
  if (!isArrayOfNonEmptyStrings(character.weaknesses)) {
    errors.push(`${label}: "weaknesses" must be a non-empty array of non-empty strings`);
  }

  if (character.image !== undefined && character.image !== null) {
    if (!isNonEmptyString(character.image)) {
      errors.push(`${label}: "image" is present but not a non-empty string`);
    } else if (!IMAGE_PATH_PATTERN.test(character.image)) {
      errors.push(
        `${label}: "image" path "${character.image}" doesn't match the expected pattern ` +
          `assets/characters/<id>.(webp|png|jpg|jpeg)`
      );
    } else if (isNonEmptyString(character.id)) {
      const expected = `assets/characters/${character.id}.webp`;
      const matchedId = character.image.match(IMAGE_PATH_PATTERN)[1];
      if (matchedId !== character.id) {
        errors.push(
          `${label}: "image" filename "${matchedId}" doesn't match character id "${character.id}" ` +
            `(expected something like "${expected}")`
        );
      }
    }
  }

  const profile = character.personalityProfile;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    errors.push(`${label}: missing or invalid "personalityProfile" (must be an object)`);
  } else {
    traits.forEach((trait) => {
      const value = profile[trait];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${label}: personalityProfile.${trait} is missing or not a finite number`);
      } else if (value < 0 || value > 10) {
        errors.push(`${label}: personalityProfile.${trait} = ${value} is outside the 0-10 range`);
      }
    });
  }

  return errors;
}

/**
 * Validates an entire character list: every character individually
 * (required fields, types, ranges, image path convention, full trait
 * coverage) plus uniqueness of ids across the list.
 *
 * Returns { valid: boolean, errors: string[] }.
 */
export function validateCharacters(characters, traits) {
  const errors = [];

  if (!Array.isArray(characters) || characters.length === 0) {
    return { valid: false, errors: ['characters must be a non-empty array'] };
  }

  const seenIds = new Map();

  characters.forEach((character, index) => {
    const label =
      character && isNonEmptyString(character.id)
        ? `Character "${character.id}"`
        : `Character at index ${index}`;

    errors.push(...validateOneCharacter(character, traits, label));

    if (character && isNonEmptyString(character.id)) {
      if (seenIds.has(character.id)) {
        errors.push(
          `Duplicate id "${character.id}" (indices ${seenIds.get(character.id)} and ${index})`
        );
      } else {
        seenIds.set(character.id, index);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
