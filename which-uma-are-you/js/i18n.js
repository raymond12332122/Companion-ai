/* ==========================================================================
   Which Uma Are You? — Language layer (en / es)

   Design constraint: questions.js and characters.js are protected content
   files and are NOT modified to support translation. English lives there
   as the canonical source; Spanish lives in lang-es.js keyed by the same
   question index / character id. Every lookup here takes the English
   original as a `fallback` argument and returns it whenever a Spanish
   string is missing, so a partial translation degrades to English per
   string rather than breaking the page.

   Scoring safety: matching.js reads only `weights` and
   `personalityProfile` (numbers). Nothing in this layer touches those, so
   switching language provably cannot change which character you match.

   Persistence: the chosen language is stored under 'uma-lang'. On a first
   visit with no stored choice, the browser's own language decides, so a
   Spanish-speaking visitor lands in Spanish without touching anything.
   ========================================================================== */

import { ES } from './lang-es.js';

export const LANGS = ['en', 'es'];
const LANG_KEY = 'uma-lang';

/* English UI strings live here rather than inline in the HTML so that the
   two languages sit side by side in one place, and so a missing key is a
   visible key rather than a silently blank element. */
const EN = {
  titleHome: 'Which Uma Are You? — Personality Quiz',
  titleQuiz: 'Which Uma Are You? — Quiz',
  titleResults: 'Which Uma Are You? — Your Result',

  heroBadge: '🏇 Fan Personality Quiz',
  heroTitle: 'Which Uma<br />Are You?',
  heroBlurb:
    "Answer 25 quick questions about how you race, train, and treat your rivals — we'll match you to the racehorse girl whose heart runs closest to yours.",
  metaQuestions: '<strong>25</strong> Questions',
  metaTime: '<strong>~4</strong> min',
  metaChars: '<strong>26</strong> Characters',
  startBtn: 'Start the Race →',
  homeFooter:
    'Fan-made project. Original characters, names, and personality interpretations only — no official artwork or copyrighted material used.',

  exitQuiz: '← Exit quiz',
  questionLabel: 'QUESTION',
  prevBtn: '← Previous',
  nextBtn: 'Next →',
  seeResults: 'See Results →',

  backHome: '← Back to home',
  yourMatch: '🏆 Your Match',
  youAre: 'You Are',
  matchLabel: 'Match',
  sectionStats: 'Racing Stats',
  sectionAnalysis: 'Race Analysis',
  sectionField: 'The Rest Of The Field',
  profileTab: 'PROFILE',
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  retakeBtn: 'Take Quiz Again',
  resultsFooter:
    'Results are a fun approximation based on your answers, not an official or scientific measurement.',

  emptyBadge: '⚠️ No Answers Found',
  emptyTitle: 'Take the quiz first!',
  emptyBody:
    "We couldn't find any saved answers. Start the quiz to get your result.",
  emptyBtn: 'Start Quiz'
};

let current = detectInitialLang();
const listeners = [];

function detectInitialLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && LANGS.indexOf(saved) !== -1) return saved;
  } catch (e) {
    /* storage unavailable — fall through to browser detection */
  }
  try {
    const nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (nav.indexOf('es') === 0) return 'es';
  } catch (e) {
    /* no navigator language — fall through to the default */
  }
  return 'en';
}

export function getLang() {
  return current;
}

/**
 * Switches language, persists the choice, re-applies every static string
 * on the page, and notifies any page that registered a re-render via
 * onLangChange(). No page reload: the quiz re-renders the current
 * question in place and results re-render the same computed match, so
 * nothing is recomputed and no progress is lost.
 */
export function setLang(lang) {
  if (LANGS.indexOf(lang) === -1 || lang === current) return;
  current = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    /* preference just won't persist across visits */
  }
  applyStaticTranslations();
  listeners.forEach((fn) => {
    try {
      fn(lang);
    } catch (e) {
      /* one page's re-render failing must not block the others */
    }
  });
}

export function onLangChange(fn) {
  if (typeof fn === 'function') listeners.push(fn);
}

/** UI string by key. Falls back to English, then to the key itself. */
export function t(key) {
  if (current === 'es') {
    const v = ES.ui[key];
    if (v !== undefined) return v;
  }
  const en = EN[key];
  return en !== undefined ? en : key;
}

/** Trait display name. Trait keys themselves stay English everywhere. */
export function tTrait(name) {
  if (current === 'es') {
    const v = ES.traits[name];
    if (v !== undefined) return v;
  }
  return name;
}

/** Question text by index, falling back to the English original. */
export function tQuestion(index, fallback) {
  if (current === 'es') {
    const q = ES.questions[index];
    if (q && q.q) return q.q;
  }
  return fallback;
}

/** Answer text by question index + answer index. */
export function tAnswer(questionIndex, answerIndex, fallback) {
  if (current === 'es') {
    const q = ES.questions[questionIndex];
    if (q && q.a && q.a[answerIndex]) return q.a[answerIndex];
  }
  return fallback;
}

/**
 * Character field by id. Handles both strings (tagline, summary,
 * raceStrategy) and string arrays (strengths, weaknesses) — an array
 * translation is only used when it has the same length as the English
 * original, so a half-finished list can never silently drop entries.
 */
export function tChar(id, field, fallback) {
  if (current !== 'es') return fallback;
  const c = ES.characters[id];
  if (!c) return fallback;
  const v = c[field];
  if (v === undefined) return fallback;
  if (Array.isArray(fallback)) {
    return Array.isArray(v) && v.length === fallback.length ? v : fallback;
  }
  return v;
}

/**
 * Applies every static string on the current page and syncs the pieces of
 * page chrome that aren't plain elements: <html lang>, <title>, and the
 * one CSS-injected label (.match-card::before reads --label-profile, so
 * the "PROFILE" tab can be translated without JS reaching into CSS text).
 */
export function applyStaticTranslations(root) {
  const scope = root || document;

  document.documentElement.setAttribute('lang', current);

  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = t(key);
    else el.textContent = t(key);
  });

  const titleKey = document.body && document.body.getAttribute('data-i18n-title');
  if (titleKey) document.title = t(titleKey);

  /* CSS `content` needs a quoted string; JSON.stringify supplies the
     quotes and escapes anything awkward inside the label. */
  document.documentElement.style.setProperty(
    '--label-profile',
    JSON.stringify(t('profileTab'))
  );
}

/**
 * Wires a button as the language toggle. The button always shows the
 * language it will switch *to* (the standard pattern), and carries that
 * language's own `lang` attribute so screen readers pronounce it right.
 */
export function initLangToggle(buttonEl) {
  if (!buttonEl) return;

  function render() {
    const other = current === 'en' ? 'es' : 'en';
    buttonEl.textContent = other.toUpperCase();
    buttonEl.setAttribute('lang', other);
    buttonEl.setAttribute(
      'aria-label',
      current === 'en' ? 'Cambiar a español' : 'Switch to English'
    );
  }

  render();
  buttonEl.addEventListener('click', () => {
    setLang(current === 'en' ? 'es' : 'en');
    render();
  });
}
