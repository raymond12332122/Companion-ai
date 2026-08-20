/* ==========================================================================
   Which Uma Are You? — Answer Storage
   Wraps localStorage with an explicit schema version so old or incompatible
   saved data (e.g. from a previous question set) is detected and safely
   reset instead of silently misapplied.
   ========================================================================== */

const STORAGE_KEY = 'uma-quiz-answers';
const STORAGE_VERSION = 1;

function freshAnswers(questionCount) {
  return new Array(questionCount).fill(null);
}

/**
 * Loads saved answers for a quiz with `questionCount` questions. Returns a
 * fresh all-null answers array if nothing is saved, or if what's saved is
 * corrupted, wrong-version, or the wrong length (e.g. the question set
 * changed since it was saved).
 */
export function loadAnswers(questionCount) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshAnswers(questionCount);

    const parsed = JSON.parse(raw);
    const isValid =
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === STORAGE_VERSION &&
      Array.isArray(parsed.answers) &&
      parsed.answers.length === questionCount;

    if (isValid) {
      return parsed.answers;
    }
  } catch (e) {
    /* corrupted JSON — fall through to reset */
  }

  clearAnswers();
  return freshAnswers(questionCount);
}

export function saveAnswers(answers) {
  const payload = { version: STORAGE_VERSION, answers };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearAnswers() {
  localStorage.removeItem(STORAGE_KEY);
}
