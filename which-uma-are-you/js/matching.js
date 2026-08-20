/* ==========================================================================
   Which Uma Are You? — Matching Engine
   Pure scoring logic. No DOM access, no rendering. Safe to import from
   any page (or from Node for the self-test) without side effects.
   ========================================================================== */

import { TRAITS } from './traits.js';
import { QUESTIONS } from './questions.js';

const CHARACTER_TRAIT_MAX = 10; /* character profile values are authored 0-10 */

/**
 * For each trait, sum the highest weight any single answer could contribute
 * to it, across all questions. This is the ceiling a user could hit on that
 * trait if every answer they picked maximized it.
 */
export function computeMaxPossibleScores() {
  const max = {};
  TRAITS.forEach((trait) => (max[trait] = 0));

  QUESTIONS.forEach((question) => {
    TRAITS.forEach((trait) => {
      let best = 0;
      question.answers.forEach((answer) => {
        const weight = answer.weights[trait] || 0;
        if (weight > best) best = weight;
      });
      max[trait] += best;
    });
  });

  return max;
}

/**
 * Sums the trait weights of the user's chosen answers. `answers` is an
 * array aligned to QUESTIONS, where answers[i] is the chosen answer index
 * for QUESTIONS[i] (or null/undefined if unanswered).
 */
function computeRawUserScores(answers) {
  const raw = {};
  TRAITS.forEach((trait) => (raw[trait] = 0));

  QUESTIONS.forEach((question, i) => {
    const choiceIndex = answers[i];
    if (choiceIndex === null || choiceIndex === undefined) return;

    const weights = question.answers[choiceIndex].weights;
    TRAITS.forEach((trait) => {
      raw[trait] += weights[trait] || 0;
    });
  });

  return raw;
}

/**
 * Builds a normalized user trait profile (each trait in [0, 1]) from a
 * completed (or partially completed) answers array.
 */
export function computeUserProfile(answers) {
  const max = computeMaxPossibleScores();
  const raw = computeRawUserScores(answers);

  const profile = {};
  TRAITS.forEach((trait) => {
    profile[trait] = max[trait] > 0 ? raw[trait] / max[trait] : 0;
  });

  return profile;
}

/**
 * Builds a normalized trait profile (each trait in [0, 1]) for a character,
 * from its authored 0-10 profile values.
 */
export function normalizeCharacterProfile(character) {
  const profile = {};
  TRAITS.forEach((trait) => {
    profile[trait] = (character.profile[trait] || 0) / CHARACTER_TRAIT_MAX;
  });
  return profile;
}

/**
 * Scores how closely two normalized trait profiles (each trait in [0, 1])
 * match, using normalized Euclidean distance converted to a similarity
 * percentage.
 *
 * Why Euclidean distance instead of cosine similarity: cosine similarity
 * only compares the *direction* of two trait vectors, not their magnitude.
 * That means a character written as deliberately mild (low values across
 * every trait) and a user who maxed out every trait could score a false
 * 100% match, as long as the *ratios* between traits lined up — even though
 * their actual intensities are opposite. Euclidean distance treats "how far
 * apart are these two profiles" literally, in every dimension, so intensity
 * mismatches correctly lower the score instead of being invisible.
 *
 * - Identical profiles -> distance 0 -> 100%.
 * - Maximally different profiles (every trait at opposite extremes) -> 0%.
 * - Result is always clamped to [0, 100].
 */
export function scoreCharacter(userProfile, characterProfile) {
  let sumSquares = 0;

  TRAITS.forEach((trait) => {
    const userValue = userProfile[trait] || 0;
    const characterValue = characterProfile[trait] || 0;
    const diff = userValue - characterValue;
    sumSquares += diff * diff;
  });

  const distance = Math.sqrt(sumSquares);
  /* Each trait is bounded in [0, 1], so the farthest two profiles can be
     apart is sqrt(numTraits) — every trait maximally mismatched. */
  const maxDistance = Math.sqrt(TRAITS.length);

  const similarity = maxDistance > 0 ? 1 - distance / maxDistance : 1;
  const clamped = Math.max(0, Math.min(1, similarity));

  return clamped * 100;
}

/**
 * Ranks a list of characters against a normalized user profile, highest
 * match first. Each result is { character, score } where score is a
 * 0-100 percentage.
 */
export function rankCharacters(userProfile, characters) {
  return characters
    .map((character) => ({
      character,
      score: scoreCharacter(userProfile, normalizeCharacterProfile(character))
    }))
    .sort((a, b) => b.score - a.score);
}
