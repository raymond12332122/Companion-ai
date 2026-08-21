/* ==========================================================================
   Which Uma Are You? — Characters

   Content here is original fan interpretation consistent with each
   character's well-known public archetype — not sourced official
   characteristic data (none was provided; see
   docs/fan-content-permissions.md). No character artwork is bundled in
   this repository; `image` is the path a permitted asset will occupy
   once provided separately (see assets/characters/README.md).

   Schema (validated by js/characters.validate.js):
     id                 unique slug
     name               display name
     image              optional; "assets/characters/<id>.webp" once provided
     tagline            one-line hook
     summary            personality summary
     strengths          string[]
     weaknesses         string[]
     raceStrategy       flavor text
     personalityProfile { <trait>: 0-10, ... } — all seven TRAITS required
     color              CSS color used for the current placeholder
                         portrait/dot UI until real images are wired in;
                         not part of the schema requested for the
                         character system itself, kept for the existing
                         results-page rendering
   ========================================================================== */

export const CHARACTERS = [
  {
    id: "special-week",
    name: "Special Week",
    image: "assets/characters/special-week.webp",
    tagline: "The sunny, big-hearted go-getter.",
    summary:
      "Warm, relentlessly upbeat, and genuinely happy to see everyone else succeed. She trains hard because she loves it, not because she has to.",
    strengths: [
      "Lifts up everyone around her",
      "Bounces back from setbacks fast",
      "Genuine, contagious enthusiasm"
    ],
    weaknesses: [
      "Can take criticism personally",
      "Sometimes tries to do too much at once",
      "Struggles to say no to people who need her"
    ],
    raceStrategy:
      "Runs like every stride is a personal thank-you note to everyone who believed in her — full effort, front and center, no holding back.",
    personalityProfile: {
      Determination: 9,
      Kindness: 9,
      Confidence: 6,
      Competitiveness: 7,
      Discipline: 5,
      Chaos: 3,
      Optimism: 10
    },
    color: "#ff7a9c"
  },
  {
    id: "silence-suzuka",
    name: "Silence Suzuka",
    image: "assets/characters/silence-suzuka.webp",
    tagline: "The quiet front-runner who never looks back.",
    summary:
      "Steady, self-contained, and laser-focused on the finish line. She doesn't need the spotlight — she needs the track ahead of her clear.",
    strengths: [
      "Unshakeable focus under pressure",
      "Consistent, reliable pace",
      "Doesn't get rattled by rivals"
    ],
    weaknesses: [
      "Can seem distant or hard to read",
      "Rarely asks for help",
      "Uncomfortable relying on a comeback plan"
    ],
    raceStrategy:
      "Takes the lead early and dares the rest of the field to catch her — if she's ahead, she intends to stay there, quietly, the whole way.",
    personalityProfile: {
      Determination: 8,
      Kindness: 6,
      Confidence: 7,
      Competitiveness: 8,
      Discipline: 8,
      Chaos: 2,
      Optimism: 6
    },
    color: "#7ad0ff"
  },
  {
    id: "tokai-teio",
    name: "Tokai Teio",
    image: "assets/characters/tokai-teio.webp",
    tagline: "The fierce competitor who refuses to quit.",
    summary:
      "Bold, driven, and allergic to giving up. Setbacks don't discourage her — they're just the next thing to overcome.",
    strengths: [
      "Refuses to be counted out",
      "Turns setbacks into comebacks",
      "Inspires teammates by example"
    ],
    weaknesses: [
      "Can push herself past healthy limits",
      "Struggles to accept help mid-comeback",
      "Takes losses harder than she shows"
    ],
    raceStrategy:
      "Holds position through the pack, then throws everything into the final stretch — the kind of finish that makes people who wrote her off regret it.",
    personalityProfile: {
      Determination: 10,
      Kindness: 7,
      Confidence: 8,
      Competitiveness: 9,
      Discipline: 6,
      Chaos: 3,
      Optimism: 7
    },
    color: "#ffb84d"
  },
  {
    id: "gold-ship",
    name: "Gold Ship",
    image: "assets/characters/gold-ship.webp",
    tagline: "The unpredictable wildcard.",
    summary:
      "Loud, chaotic, and weirdly confident it'll all work out. Rules are more of a suggestion, and somehow that works in her favor.",
    strengths: [
      "Thrives in chaos and pressure",
      "Genuinely fearless about rules and expectations",
      "Keeps the mood light even when stakes are high"
    ],
    weaknesses: [
      "Skips preparation she probably needed",
      "Unpredictable, even to herself",
      "Hard for teammates to plan around"
    ],
    raceStrategy:
      "Has no consistent strategy, and somehow that's the strategy — full send, gut instinct, figure out the rest on the way down the stretch.",
    personalityProfile: {
      Determination: 6,
      Kindness: 5,
      Confidence: 9,
      Competitiveness: 6,
      Discipline: 2,
      Chaos: 10,
      Optimism: 8
    },
    color: "#c78dff"
  },
  {
    id: "haru-urara",
    name: "Haru Urara",
    image: "assets/characters/haru-urara.webp",
    tagline: "The eternal optimist who never stops trying.",
    summary:
      "Kind to a fault and impossible to discourage. Winning matters less to her than showing up and trying with a full heart.",
    strengths: [
      "Never truly discouraged by losses",
      "Makes everyone around her feel welcome",
      "Tries again without resentment or ego"
    ],
    weaknesses: [
      "Struggles to back herself competitively",
      "Can be underestimated, including by herself",
      "Rarely prioritizes her own recognition"
    ],
    raceStrategy:
      "Runs every race like it's the best one yet, regardless of the odds — the finish line matters less than proving she showed up and gave it everything.",
    personalityProfile: {
      Determination: 7,
      Kindness: 10,
      Confidence: 3,
      Competitiveness: 2,
      Discipline: 4,
      Chaos: 4,
      Optimism: 10
    },
    color: "#ffd166"
  },
  {
    id: "meisho-doto",
    name: "Meisho Doto",
    image: "assets/characters/meisho-doto.webp",
    tagline: "The disciplined tactician.",
    summary:
      "Methodical, sharp, and always thinking two steps ahead. She trusts preparation over luck, every single time.",
    strengths: [
      "Prepares meticulously for every scenario",
      "Reads races and situations well",
      "Rarely caught off guard"
    ],
    weaknesses: [
      "Can be inflexible when plans break",
      "Overthinks decisions under time pressure",
      "Slow to trust improvisation, even when it's needed"
    ],
    raceStrategy:
      "Studies the field beforehand and races the plan, not the moment — precise positioning, calculated moves, minimal wasted effort.",
    personalityProfile: {
      Determination: 8,
      Kindness: 6,
      Confidence: 7,
      Competitiveness: 8,
      Discipline: 9,
      Chaos: 3,
      Optimism: 5
    },
    color: "#4dd6a8"
  }
];
