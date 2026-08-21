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

   No image files are bundled yet (see assets/characters/README.md). The
   results page renders the image when it loads and falls back to a
   shared CSS gradient + initials otherwise — no per-character color
   field is needed for that, so none is stored here.
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  },
  {
    id: "mejiro-mcqueen",
    name: "Mejiro McQueen",
    image: "assets/characters/mejiro-mcqueen.webp",
    tagline: "The elegant aristocrat who never lets her composure slip.",
    summary:
      "Poised, proper, and quietly formidable. She carries herself like royalty because, in every way that matters to her, she is — grace and grit in equal measure.",
    strengths: [
      "Composed under any pressure",
      "Sets a standard others aspire to",
      "Turns discipline into effortless-looking excellence"
    ],
    weaknesses: [
      "Struggles to loosen up or improvise",
      "Can come across as unapproachable",
      "Takes etiquette more seriously than most situations call for"
    ],
    raceStrategy:
      "Runs with picture-perfect form from gate to finish — no wasted motion, no theatrics, just relentless, elegant precision.",
    personalityProfile: {
      Determination: 6,
      Kindness: 4,
      Confidence: 8,
      Competitiveness: 3,
      Discipline: 10,
      Chaos: 1,
      Optimism: 5
    }
  },
  {
    id: "symboli-rudolf",
    name: "Symboli Rudolf",
    image: "assets/characters/symboli-rudolf.webp",
    tagline: "The dignified leader with an emperor's presence.",
    summary:
      "Commanding without needing to raise her voice. Where she stands becomes the center of the room, and she carries that weight like it was always meant to be hers.",
    strengths: [
      "Natural, unforced authority",
      "Never rattled, never rushed",
      "Earns respect rather than demanding it"
    ],
    weaknesses: [
      "Sets an intimidatingly high bar for others",
      "Rarely shows vulnerability, even when it might help",
      "Can seem distant or unreachable"
    ],
    raceStrategy:
      "Controls the pace from the front like it's simply the natural order of things — calm, commanding, uncontested.",
    personalityProfile: {
      Determination: 8,
      Kindness: 5,
      Confidence: 10,
      Competitiveness: 4,
      Discipline: 6,
      Chaos: 2,
      Optimism: 5
    }
  },
  {
    id: "air-groove",
    name: "Air Groove",
    image: "assets/characters/air-groove.webp",
    tagline: "The composed big sister everyone wishes they had.",
    summary:
      "Warm but unshakeable — the kind of steady presence that makes everyone around her feel like things are going to be okay, because she's clearly got it handled.",
    strengths: [
      "Keeps her head when everyone else loses theirs",
      "Genuinely invested in the people around her",
      "Leads by quiet example, not by orders"
    ],
    weaknesses: [
      "Puts others' needs ahead of her own too often",
      "Slow to ask for support herself",
      "Can suppress her own stress to keep others calm"
    ],
    raceStrategy:
      "Paces herself like she's got the whole race mapped out already — measured, controlled, and devastating in the final stretch.",
    personalityProfile: {
      Determination: 7,
      Kindness: 8,
      Confidence: 8,
      Competitiveness: 5,
      Discipline: 8,
      Chaos: 1,
      Optimism: 6
    }
  },
  {
    id: "vodka",
    name: "Vodka",
    image: "assets/characters/vodka.webp",
    tagline: "The fiery rival who never backs down.",
    summary:
      "Blunt, intense, and allergic to losing gracefully. She doesn't do quiet rivalries — if you're in her way, she wants you to know exactly how she feels about it.",
    strengths: [
      "Absolute fire in head-to-head moments",
      "Says what she means, no games",
      "Turns being underestimated into fuel"
    ],
    weaknesses: [
      "Temper flares faster than she'd like to admit",
      "Struggles to let go of a grudge",
      "Can burn bridges she didn't mean to burn"
    ],
    raceStrategy:
      "Locks onto whoever's ahead of her and refuses to let them feel comfortable for a single second of the race.",
    personalityProfile: {
      Determination: 8,
      Kindness: 4,
      Confidence: 8,
      Competitiveness: 9,
      Discipline: 4,
      Chaos: 6,
      Optimism: 5
    }
  },
  {
    id: "daiwa-scarlet",
    name: "Daiwa Scarlet",
    image: "assets/characters/daiwa-scarlet.webp",
    tagline: "The prideful showstopper who races like it's a performance.",
    summary:
      "Glamorous, self-assured, and fully aware of the spotlight — because she intends to be standing in it. Winning is great; winning beautifully is the actual goal.",
    strengths: [
      "Turns pressure into a stage she thrives on",
      "Unshakeable belief in her own talent",
      "Makes even hard-fought wins look effortless"
    ],
    weaknesses: [
      "Prioritizes looking good over playing it safe",
      "Can be dismissive of anyone who doubts her",
      "Struggles to accept a win that wasn't flashy"
    ],
    raceStrategy:
      "Holds back just enough to make the crowd nervous, then closes with a flourish built for the highlight reel.",
    personalityProfile: {
      Determination: 6,
      Kindness: 5,
      Confidence: 9,
      Competitiveness: 6,
      Discipline: 7,
      Chaos: 3,
      Optimism: 8
    }
  },
  {
    id: "grass-wonder",
    name: "Grass Wonder",
    image: "assets/characters/grass-wonder.webp",
    tagline: "The gentle one whose quiet resolve outlasts everyone's expectations.",
    summary:
      "Soft-spoken and easy to underestimate — which is exactly the mistake people make right before she proves, calmly and without fanfare, exactly what she's capable of.",
    strengths: [
      "Steady effort that never wavers, even unnoticed",
      "Genuinely, unpretentiously kind",
      "Doesn't need recognition to keep trying"
    ],
    weaknesses: [
      "Rarely advocates for herself",
      "Can be overlooked or talked over",
      "Avoids conflict even when she shouldn't"
    ],
    raceStrategy:
      "Stays quietly within striking distance the whole way, then closes the gap so smoothly no one notices until it's already done.",
    personalityProfile: {
      Determination: 7,
      Kindness: 8,
      Confidence: 4,
      Competitiveness: 2,
      Discipline: 7,
      Chaos: 3,
      Optimism: 5
    }
  },
  {
    id: "mayano-top-gun",
    name: "Mayano Top Gun",
    image: "assets/characters/mayano-top-gun.webp",
    tagline: "The loud, wild enthusiast who's having the best day of her life, always.",
    summary:
      "Pure, unfiltered excitement with legs. She throws herself into everything at full volume, and somehow that energy is contagious enough to carry the whole team with her.",
    strengths: [
      "Genuine, infectious enthusiasm",
      "Never too cool to cheer loudest",
      "Turns nerves into excitement instead of fear"
    ],
    weaknesses: [
      "Rarely thinks two steps ahead",
      "Energy can overwhelm quieter teammates",
      "Struggles to sit still through the boring parts of preparation"
    ],
    raceStrategy:
      "Sprints like the race is a party she's determined to win — chaotic bursts of speed, zero conservation of energy, maximum enthusiasm.",
    personalityProfile: {
      Determination: 6,
      Kindness: 6,
      Confidence: 4,
      Competitiveness: 5,
      Discipline: 2,
      Chaos: 9,
      Optimism: 8
    }
  },
  {
    id: "rice-shower",
    name: "Rice Shower",
    image: "assets/characters/rice-shower.webp",
    tagline: "The humble grinder who never quite believes in herself, and works twice as hard anyway.",
    summary:
      "Convinced she's the underdog even when she isn't. She doesn't train hard to prove anyone wrong — she trains hard because deep down she's not sure she deserves to win otherwise.",
    strengths: [
      "Outworks everyone without complaint",
      "Genuinely humble, never boastful",
      "Handles disappointment without falling apart"
    ],
    weaknesses: [
      "Doesn't believe in her own results",
      "Downplays her wins to a fault",
      "Assumes the worst about her chances by default"
    ],
    raceStrategy:
      "Grinds through every stride like she's got something to prove — because in her own head, she always does.",
    personalityProfile: {
      Determination: 9,
      Kindness: 5,
      Confidence: 2,
      Competitiveness: 5,
      Discipline: 9,
      Chaos: 1,
      Optimism: 3
    }
  },
  {
    id: "agnes-tachyon",
    name: "Agnes Tachyon",
    image: "assets/characters/agnes-tachyon.webp",
    tagline: "The eccentric genius who trains by her own unconventional theories.",
    summary:
      "Brilliant, intense, and just a little bit somewhere else mentally — mid-calculation on an idea most people haven't caught up to yet. Her methods are strange. They also tend to work.",
    strengths: [
      "Sees patterns and angles others miss entirely",
      "Genuinely original thinking under pressure",
      "Relentlessly curious and self-driven"
    ],
    weaknesses: [
      "Explanations often make sense only to her",
      "Can miss obvious social cues mid-focus",
      "Trusts her theories over conventional advice, sometimes to a fault"
    ],
    raceStrategy:
      "Runs the race according to a personal formula nobody else understands — and somehow, more often than it should, the math works out.",
    personalityProfile: {
      Determination: 8,
      Kindness: 4,
      Confidence: 6,
      Competitiveness: 4,
      Discipline: 6,
      Chaos: 8,
      Optimism: 6
    }
  },
  {
    id: "oguri-cap",
    name: "Oguri Cap",
    image: "assets/characters/oguri-cap.webp",
    tagline: "The mysterious ace who came from nowhere and stayed unbothered about it.",
    summary:
      "Calm, unconventional, and hard to read. She didn't take the expected path to get here, and she's in no hurry to explain herself — the results speak for themselves eventually.",
    strengths: [
      "Thrives outside conventional expectations",
      "Unbothered by doubt or a rough start",
      "Delivers when it matters most, quietly"
    ],
    weaknesses: [
      "Keeps people at arm's length",
      "Unconventional prep can look like a lack of effort",
      "Rarely explains herself, even when it would help"
    ],
    raceStrategy:
      "Takes an unorthodox route through the field that looks like a mistake right up until it isn't.",
    personalityProfile: {
      Determination: 6,
      Kindness: 5,
      Confidence: 7,
      Competitiveness: 5,
      Discipline: 3,
      Chaos: 7,
      Optimism: 6
    }
  },
  {
    id: "mihono-bourbon",
    name: "Mihono Bourbon",
    image: "assets/characters/mihono-bourbon.webp",
    tagline: "The obsessive perfectionist who never allows herself to rest.",
    summary:
      "Locked into an impossibly demanding standard of her own making. Every session is measured, logged, and never quite good enough — she isn't chasing anyone else's approval, just her own.",
    strengths: [
      "Unmatched work ethic",
      "Never cuts corners, ever",
      "Holds herself to a standard no one else could enforce"
    ],
    weaknesses: [
      "Doesn't know how to ease off",
      "Struggles to accept praise or rest",
      "Isolates herself under the weight of her own expectations"
    ],
    raceStrategy:
      "Executes a training-honed plan down to the second — no flair, no deviation, just relentless, exacting precision.",
    personalityProfile: {
      Determination: 10,
      Kindness: 2,
      Confidence: 3,
      Competitiveness: 3,
      Discipline: 10,
      Chaos: 0,
      Optimism: 2
    }
  },
  {
    id: "nice-nature",
    name: "Nice Nature",
    image: "assets/characters/nice-nature.webp",
    tagline: "The good-natured almost-winner who's never once been bitter about it.",
    summary:
      "Second place, again — and somehow completely fine with it. She shows up, gives an honest effort, and is genuinely, uncomplicatedly happy to watch someone else take the win.",
    strengths: [
      "Effortlessly good sport",
      "Never lets a loss sour her mood",
      "Makes everyone around her feel at ease"
    ],
    weaknesses: [
      "Rarely pushes herself past \"good enough\"",
      "Can be too easily satisfied with almost",
      "Doesn't advocate for what she actually wants"
    ],
    raceStrategy:
      "Runs a perfectly pleasant race, ends up close but not first, and is already cheering for the winner before she's crossed the line herself.",
    personalityProfile: {
      Determination: 4,
      Kindness: 9,
      Confidence: 3,
      Competitiveness: 4,
      Discipline: 4,
      Chaos: 5,
      Optimism: 8
    }
  },
  {
    id: "sakura-bakushin-o",
    name: "Sakura Bakushin O",
    image: "assets/characters/sakura-bakushin-o.webp",
    tagline: "The boisterous sprinter with main-character energy and the lungs to match.",
    summary:
      "Loud, thrilled to be here, and utterly convinced she's about to win — at full volume, the whole time. Her enthusiasm isn't a strategy, it's just who she is at every possible moment.",
    strengths: [
      "Explosive, contagious energy",
      "Genuinely fearless about big moments",
      "Never quietly settles for second"
    ],
    weaknesses: [
      "Peaks hard, fades fast",
      "Struggles with anything slow or patient",
      "Volume sometimes substitutes for a plan"
    ],
    raceStrategy:
      "Holds nothing back from the opening burst — all-out sprint energy, front-loaded and unapologetic, betting everything on the explosion.",
    personalityProfile: {
      Determination: 6,
      Kindness: 4,
      Confidence: 9,
      Competitiveness: 9,
      Discipline: 3,
      Chaos: 7,
      Optimism: 8
    }
  },
  {
    id: "twin-turbo",
    name: "Twin Turbo",
    image: "assets/characters/twin-turbo.webp",
    tagline: "The self-styled speed demon who's already naming her own signature move.",
    summary:
      "Convinced she's the coolest, fastest thing on the track, and loud about it in the most endearing way possible. Reality doesn't always agree, but her commitment to the bit never wavers.",
    strengths: [
      "Unshakeable enthusiasm for her own hype",
      "Turns even a loss into a good story",
      "Never boring to be around"
    ],
    weaknesses: [
      "Style frequently outpaces substance",
      "Skips prep in favor of vibes",
      "Overestimates how well the bit is landing"
    ],
    raceStrategy:
      "Announces exactly how she's going to win, in detail, beforehand — then improvises something completely different once the gate opens.",
    personalityProfile: {
      Determination: 4,
      Kindness: 3,
      Confidence: 6,
      Competitiveness: 4,
      Discipline: 1,
      Chaos: 9,
      Optimism: 9
    }
  },
  {
    id: "winning-ticket",
    name: "Winning Ticket",
    image: "assets/characters/winning-ticket.webp",
    tagline: "The carefree gambler who's pretty sure it'll work out.",
    summary:
      "Doesn't stress, doesn't overplan, doesn't really see the point of either. Wins and losses roll off her the same way — she's here for the fun of it, and mostly, that's genuinely enough.",
    strengths: [
      "Impossible to rattle",
      "Never brings unnecessary pressure into a room",
      "Enjoys the process regardless of outcome"
    ],
    weaknesses: [
      "Rarely prepares beyond \"we'll see\"",
      "Can come across as not caring at all",
      "Leaves results almost entirely to chance"
    ],
    raceStrategy:
      "Shows up, picks a lane that feels right in the moment, and lets the race sort itself out from there.",
    personalityProfile: {
      Determination: 2,
      Kindness: 7,
      Confidence: 6,
      Competitiveness: 1,
      Discipline: 1,
      Chaos: 7,
      Optimism: 8
    }
  },
  {
    id: "maruzensky",
    name: "Maruzensky",
    image: "assets/characters/maruzensky.webp",
    tagline: "The dominant natural talent who doesn't need to explain herself.",
    summary:
      "Simply, overwhelmingly good — and not particularly interested in softening that fact for anyone's comfort. She doesn't posture or provoke; the results already say everything she'd bother saying.",
    strengths: [
      "Talent that speaks entirely for itself",
      "Completely unbothered by doubt",
      "Delivers without needing hype or setup"
    ],
    weaknesses: [
      "Blunt to the point of distance",
      "Little patience for those who need encouragement",
      "Rarely explains her reasoning to anyone"
    ],
    raceStrategy:
      "Runs like the outcome was decided before the gate even opened — no wasted effort, no theatrics, just overwhelming, matter-of-fact superiority.",
    personalityProfile: {
      Determination: 6,
      Kindness: 3,
      Confidence: 10,
      Competitiveness: 6,
      Discipline: 3,
      Chaos: 2,
      Optimism: 5
    }
  },
  {
    id: "taiki-shuttle",
    name: "Taiki Shuttle",
    image: "assets/characters/taiki-shuttle.webp",
    tagline: "The charismatic globe-trotter who makes everywhere feel like home turf.",
    summary:
      "Warm, well-traveled, and genuinely excited by the idea of proving herself anywhere, against anyone. She collects rivals like souvenirs and somehow stays friends with all of them.",
    strengths: [
      "Effortlessly charming across any crowd",
      "Thrives specifically on new, unfamiliar challenges",
      "Turns rivals into friends without really trying"
    ],
    weaknesses: [
      "Restless with familiar, repetitive routine",
      "Sometimes chases the next big stage over the current one",
      "Underprepares for anything that isn't novel"
    ],
    raceStrategy:
      "Treats every race like a new stage worth putting on a show for — confident, adaptable, and clearly having the time of her life doing it.",
    personalityProfile: {
      Determination: 5,
      Kindness: 6,
      Confidence: 8,
      Competitiveness: 5,
      Discipline: 3,
      Chaos: 4,
      Optimism: 9
    }
  },
  {
    id: "kitasan-black",
    name: "Kitasan Black",
    image: "assets/characters/kitasan-black.webp",
    tagline: "The steady captain who lifts the whole team just by showing up.",
    summary:
      "Doesn't need to be the loudest in the room to be the one everyone rallies around. She works hard, means what she says, and genuinely wants to see the people around her succeed.",
    strengths: [
      "Quietly powerful work ethic",
      "Makes teammates believe in themselves",
      "Trustworthy in exactly the moments that matter"
    ],
    weaknesses: [
      "Undersells her own achievements",
      "Takes on more than her share to protect others",
      "Slow to ask the team to carry her in return"
    ],
    raceStrategy:
      "Runs a strong, honest race built on effort rather than flash — and somehow the whole team seems to run a little better whenever she's in it.",
    personalityProfile: {
      Determination: 8,
      Kindness: 9,
      Confidence: 4,
      Competitiveness: 6,
      Discipline: 6,
      Chaos: 2,
      Optimism: 7
    }
  },
  {
    id: "satono-diamond",
    name: "Satono Diamond",
    image: "assets/characters/satono-diamond.webp",
    tagline: "The idealistic perfectionist chasing a victory that has to look exactly right.",
    summary:
      "Isn't satisfied with just winning — it has to be the right kind of win, earned the way he's always pictured it. That vision is beautiful. It's also a very hard standard to live up to.",
    strengths: [
      "Holds a genuinely inspiring vision of excellence",
      "Refuses to cut corners on his own ideals",
      "Elevates the standard for everyone around him"
    ],
    weaknesses: [
      "A win that isn't \"clean\" still feels like a loss to him",
      "Second-guesses himself when reality doesn't match the vision",
      "Can be paralyzed by his own high bar"
    ],
    raceStrategy:
      "Waits for exactly the right moment to make his move — not the fastest opening, not the safest, but the one that matches the picture in his head.",
    personalityProfile: {
      Determination: 8,
      Kindness: 3,
      Confidence: 5,
      Competitiveness: 3,
      Discipline: 6,
      Chaos: 4,
      Optimism: 7
    }
  },
  {
    id: "smart-falcon",
    name: "Smart Falcon",
    image: "assets/characters/smart-falcon.webp",
    tagline: "The unpretentious grinder who just wants to get the job done.",
    summary:
      "No glamour, no theatrics, no interest in either. She shows up, does the work, and heads home — competent and steady in a way that never needs to announce itself.",
    strengths: [
      "Reliable without needing recognition for it",
      "Unbothered by flashier competition",
      "Consistent effort, race after race"
    ],
    weaknesses: [
      "Undersells herself in big moments",
      "Can be overlooked next to louder personalities",
      "Rarely pushes for the spotlight she's earned"
    ],
    raceStrategy:
      "Runs the same honest, no-frills race every time — steady pace, no wasted drama, quietly gets it done.",
    personalityProfile: {
      Determination: 7,
      Kindness: 6,
      Confidence: 5,
      Competitiveness: 3,
      Discipline: 4,
      Chaos: 2,
      Optimism: 6
    }
  }
];
