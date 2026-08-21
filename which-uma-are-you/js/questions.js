/* ==========================================================================
   Which Uma Are You? — Questions
   Each question has 4 answers. Each answer nudges one or two traits.
   Format: weights: { TraitName: points }
   ========================================================================== */

export const QUESTIONS = [
  {
    q: "You just lost an important race. What do you do?",
    answers: [
      { text: "Immediately start planning how to train harder for next time.", weights: { Determination: 3, Discipline: 1 } },
      { text: "Comfort your rival who's also disappointed.", weights: { Kindness: 3, Optimism: 1 } },
      { text: "Tell everyone you'll crush it next time.", weights: { Confidence: 3, Competitiveness: 1 } },
      { text: "Already turning it into a legendary story — best losses make the best tales.", weights: { Chaos: 3, Optimism: 1 } }
    ]
  },
  {
    q: "Your coach gives you a strict new training schedule. Reaction?",
    answers: [
      { text: "Follow it perfectly, no excuses.", weights: { Discipline: 3 } },
      { text: "Ask if you can add fun challenges to it.", weights: { Optimism: 2, Chaos: 1 } },
      { text: "Try to convince them to make it more intense.", weights: { Competitiveness: 3 } },
      { text: "Modify it to fit what feels right for you.", weights: { Chaos: 2, Confidence: 1 } }
    ]
  },
  {
    q: "A teammate is struggling before a big race. You:",
    answers: [
      { text: "Give them a pep talk about believing in themselves.", weights: { Confidence: 2, Kindness: 1 } },
      { text: "Sit with them and just listen.", weights: { Kindness: 3 } },
      { text: "Remind them this is what they trained for.", weights: { Discipline: 2, Determination: 1 } },
      { text: "Crack a joke to lighten the mood.", weights: { Chaos: 2, Optimism: 1 } }
    ]
  },
  {
    q: "It's race day. How do you feel?",
    answers: [
      { text: "Focused and ready to give everything I've got.", weights: { Determination: 3 } },
      { text: "Excited to see everyone do their best!", weights: { Optimism: 3 } },
      { text: "Confident I'll win.", weights: { Confidence: 3 } },
      { text: "Already picturing exactly how I'm going to beat my rivals.", weights: { Competitiveness: 3 } }
    ]
  },
  {
    q: "You see a rival about to overtake you in the final stretch.",
    answers: [
      { text: "Push harder — refuse to let them pass.", weights: { Determination: 3, Competitiveness: 1 } },
      { text: "Cheer them on even while racing.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Trust your training and stay steady.", weights: { Discipline: 3 } },
      { text: "Try something unpredictable to throw them off.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "Free day, no training. What do you do?",
    answers: [
      { text: "Use it to study race footage anyway.", weights: { Discipline: 2, Determination: 1 } },
      { text: "Hang out and check in on friends.", weights: { Kindness: 3 } },
      { text: "Do something spontaneous and fun.", weights: { Chaos: 3 } },
      { text: "Relax and stay positive about tomorrow.", weights: { Optimism: 3 } }
    ]
  },
  {
    q: "How do you handle criticism?",
    answers: [
      { text: "Take it seriously and use it to improve.", weights: { Discipline: 2, Determination: 1 } },
      { text: "It stings, but I bounce back quickly.", weights: { Optimism: 2, Confidence: 1 } },
      { text: "I brush it off — I know what I'm capable of.", weights: { Confidence: 3 } },
      { text: "Depends on my mood, honestly.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "What's your role on the team?",
    answers: [
      { text: "The reliable one who always shows up.", weights: { Discipline: 3 } },
      { text: "The heart that keeps everyone together.", weights: { Kindness: 3 } },
      { text: "The one who pushes everyone to be better.", weights: { Competitiveness: 3 } },
      { text: "The wildcard who keeps things interesting.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "Someone doubts you can win. Response?",
    answers: [
      { text: "I'll prove them wrong through hard work.", weights: { Determination: 3 } },
      { text: "That's okay, everyone's entitled to their opinion.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Watch me.", weights: { Confidence: 3 } },
      { text: "No idea what's going to happen — and that's exactly what makes this fun.", weights: { Chaos: 2, Optimism: 1 } }
    ]
  },
  {
    q: "Big win! How do you celebrate?",
    answers: [
      { text: "Immediately think about the next challenge.", weights: { Determination: 2, Competitiveness: 1 } },
      { text: "Thank everyone who helped me get there.", weights: { Kindness: 3 } },
      { text: "Soak in the moment — I earned this.", weights: { Confidence: 3 } },
      { text: "Throw an impromptu celebration party.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "Your training partner is way ahead of you in skill. You:",
    answers: [
      { text: "Train even harder to catch up.", weights: { Determination: 3 } },
      { text: "Ask them for tips — happy to learn.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "See it as motivation to prove I'm just as good.", weights: { Competitiveness: 3 } },
      { text: "Not worried, I'll get there my own way.", weights: { Chaos: 2, Confidence: 1 } }
    ]
  },
  {
    q: "How do you prepare the night before a race?",
    answers: [
      { text: "Stick to my exact routine.", weights: { Discipline: 3 } },
      { text: "Get some rest and stay calm.", weights: { Optimism: 2, Discipline: 1 } },
      { text: "Visualize myself crossing the finish line first.", weights: { Confidence: 2, Competitiveness: 1 } },
      { text: "Whatever happens happens — I don't overthink it.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "A friend needs help but it's inconvenient timing. You:",
    answers: [
      { text: "Help them anyway — they matter more.", weights: { Kindness: 3 } },
      { text: "Find a quick way to help without breaking stride.", weights: { Discipline: 2, Determination: 1 } },
      { text: "Turn it into a fun distraction for both of you.", weights: { Chaos: 2, Optimism: 1 } },
      { text: "Help them — and quietly turn it into a personal challenge to solve it faster than anyone expected.", weights: { Competitiveness: 2, Confidence: 1 } }
    ]
  },
  {
    q: "What motivates you most?",
    answers: [
      { text: "Becoming the best version of myself.", weights: { Determination: 3 } },
      { text: "Making the people around me happy.", weights: { Kindness: 3 } },
      { text: "Winning. Simple as that.", weights: { Competitiveness: 3 } },
      { text: "Just enjoying the ride.", weights: { Optimism: 2, Chaos: 1 } }
    ]
  },
  {
    q: "Describe your ideal race.",
    answers: [
      { text: "A tough one that tests everything I've trained for.", weights: { Discipline: 2, Determination: 1 } },
      { text: "One where everyone has fun and does their best.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "One where I'm clearly the star.", weights: { Confidence: 3 } },
      { text: "Unpredictable, chaotic, and thrilling.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "You're paired against your biggest rival in a head-to-head event. What's actually going through your head?",
    answers: [
      { text: "This is exactly the matchup I've been training for.", weights: { Competitiveness: 3, Determination: 1 } },
      { text: "I just want us both to walk away proud of how we ran.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "I already know how this ends.", weights: { Confidence: 3 } },
      { text: "Let's just see what happens — plans are overrated.", weights: { Chaos: 2, Optimism: 1 } }
    ]
  },
  {
    q: "Your best friend just got some huge news — great or terrible, doesn't matter which. First thing you do?",
    answers: [
      { text: "Drop everything and go be there in person.", weights: { Kindness: 3 } },
      { text: "Hype them up (or talk them off the ledge) with total confidence.", weights: { Confidence: 2, Kindness: 1 } },
      { text: "Start problem-solving or planning next steps with them immediately.", weights: { Discipline: 2, Determination: 1 } },
      { text: "Stay upbeat and remind them it'll work out, no matter what the news was.", weights: { Optimism: 3 } }
    ]
  },
  {
    q: "You bomb something you actually cared about — like, badly. A week later, you're...",
    answers: [
      { text: "Already deep into a new training plan so it never happens again.", weights: { Determination: 3, Discipline: 1 } },
      { text: "Mostly over it. Onward.", weights: { Optimism: 3 } },
      { text: "Telling the story like it's already a funny anecdote.", weights: { Chaos: 2, Optimism: 1 } },
      { text: "Still a little in my feelings about it, but using it as fuel.", weights: { Competitiveness: 2, Determination: 1 } }
    ]
  },
  {
    q: "Plans for the day just fell apart with zero warning. Your reaction?",
    answers: [
      { text: "Immediately start building a backup plan.", weights: { Discipline: 3 } },
      { text: "Kind of thrilling, honestly — let's improvise.", weights: { Chaos: 3 } },
      { text: "Check in on everyone else affected before worrying about myself.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Treat it like a challenge I can still win somehow.", weights: { Competitiveness: 3, Confidence: 1 } }
    ]
  },
  {
    q: "How do you actually think about long-term goals?",
    answers: [
      { text: "Detailed plan, clear milestones, no skipped steps.", weights: { Discipline: 3 } },
      { text: "I know the general direction and adjust as I go.", weights: { Optimism: 2, Confidence: 1 } },
      { text: "Goals are just future bragging rights waiting to happen.", weights: { Confidence: 2, Competitiveness: 1 } },
      { text: "Getting a little better than yesterday. And yeah, beating everyone else too.", weights: { Competitiveness: 2, Determination: 2 } }
    ]
  },
  {
    q: "Big deadline is closing in fast. Your actual work style right now?",
    answers: [
      { text: "Locked in. Structured schedule, no distractions.", weights: { Discipline: 3 } },
      { text: "Powering through on pure stubbornness until it's done.", weights: { Determination: 3 } },
      { text: "Somehow doing my best work at the very last minute.", weights: { Chaos: 2, Confidence: 1 } },
      { text: "Taking breaks to help others with theirs before mine's even done.", weights: { Kindness: 3 } }
    ]
  },
  {
    q: "You've got a genuinely tough decision to make — two good options. How do you actually decide?",
    answers: [
      { text: "Pros and cons list. Multiple drafts.", weights: { Discipline: 2, Confidence: 1 } },
      { text: "Go with my gut and don't look back.", weights: { Confidence: 3 } },
      { text: "Ask everyone I trust what they'd do.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Flip a coin, basically — I'll make it work either way.", weights: { Chaos: 3 } }
    ]
  },
  {
    q: "You and someone you respect completely disagree on something that actually matters. What now?",
    answers: [
      { text: "Make my case clearly and hold my ground.", weights: { Confidence: 2, Competitiveness: 1 } },
      { text: "Look for the version where we're both a little right.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Dig in — I don't back down just to keep the peace.", weights: { Determination: 2, Competitiveness: 2 } },
      { text: "Honestly? I'll probably just let it go and move on.", weights: { Optimism: 2, Chaos: 1 } }
    ]
  },
  {
    q: "A completely free afternoon, zero obligations. What actually happens?",
    answers: [
      { text: "I'll probably end up doing something productive anyway.", weights: { Discipline: 2, Determination: 1 } },
      { text: "Whatever my friends are doing, I'm in.", weights: { Kindness: 2, Optimism: 1 } },
      { text: "Something a little reckless, ideally with a good story after.", weights: { Chaos: 3 } },
      { text: "Competitive video games, sports, literally anything with a scoreboard.", weights: { Competitiveness: 3 } }
    ]
  },
  {
    q: "Someone challenges you to do something you're genuinely not sure you can pull off. Gut reaction?",
    answers: [
      { text: "Already in. I'll figure out the how later.", weights: { Confidence: 3 } },
      { text: "Let's do it — sounds fun regardless of outcome.", weights: { Optimism: 3 } },
      { text: "Absolutely. Now I have to be the best at it too.", weights: { Competitiveness: 3 } },
      { text: "Let's talk logistics first — I want an actual plan before I say yes.", weights: { Discipline: 3 } }
    ]
  }
];
