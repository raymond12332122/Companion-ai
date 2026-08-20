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
      { text: "Shrug it off and grab some snacks.", weights: { Chaos: 3, Optimism: 1 } }
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
      { text: "A little chaotic energy — let's just see what happens.", weights: { Chaos: 3 } }
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
      { text: "Ha, maybe they're right — who knows.", weights: { Chaos: 2, Optimism: 1 } }
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
      { text: "Help while turning it into a bit of friendly competition.", weights: { Competitiveness: 2, Confidence: 1 } }
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
  }
];
