export interface QuizQuestion {
  id: number
  type: 'political' | 'personality'
  question: string
  options: { label: string; value: number }[]
  // For political: value maps to spectrum (-2 to +2, negative = left, positive = right)
  // For personality: value is just stored as-is for AI personality matching
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // POLITICAL QUESTIONS (8)
  {
    id: 1,
    type: 'political',
    question: 'When it comes to government spending on social programs (healthcare, housing, education), I believe:',
    options: [
      { label: 'The government should significantly expand these programs', value: -2 },
      { label: 'The government should moderately expand these programs', value: -1 },
      { label: 'The current level of spending is about right', value: 0 },
      { label: 'The government should moderately cut these programs', value: 1 },
      { label: 'The government should significantly cut these programs and let the private sector handle it', value: 2 },
    ],
  },
  {
    id: 2,
    type: 'political',
    question: 'Regarding immigration policy, I think:',
    options: [
      { label: 'We should have very open borders and a clear path to citizenship for all', value: -2 },
      { label: 'We should be welcoming and expand legal immigration pathways', value: -1 },
      { label: 'We need balanced reform that addresses both security and humanitarian concerns', value: 0 },
      { label: 'We should tighten immigration laws and focus on enforcement', value: 1 },
      { label: 'We need strict border control and significantly reduced immigration', value: 2 },
    ],
  },
  {
    id: 3,
    type: 'political',
    question: 'On gun rights and regulations, I believe:',
    options: [
      { label: 'We need comprehensive gun control including bans on many firearms', value: -2 },
      { label: 'We need stronger background checks and regulations', value: -1 },
      { label: 'Some common-sense regulations are fine, but rights must be protected', value: 0 },
      { label: 'Gun rights are a fundamental right and most regulations are overreach', value: 1 },
      { label: 'The Second Amendment should be unrestricted; virtually no government limits', value: 2 },
    ],
  },
  {
    id: 4,
    type: 'political',
    question: 'When it comes to climate change and environmental policy:',
    options: [
      { label: 'We need a Green New Deal — massive government-led transformation immediately', value: -2 },
      { label: 'We need strong government action: carbon taxes, renewable mandates, regulations', value: -1 },
      { label: 'A balanced approach using both market incentives and reasonable regulations', value: 0 },
      { label: 'Climate concerns are often overstated; market solutions are better', value: 1 },
      { label: "Climate change policy does more harm than good to our economy and shouldn't be a priority", value: 2 },
    ],
  },
  {
    id: 5,
    type: 'political',
    question: 'Regarding taxation and wealth distribution:',
    options: [
      { label: 'Dramatically raise taxes on the wealthy and corporations to fund public services', value: -2 },
      { label: 'Increase taxes on top earners to reduce inequality', value: -1 },
      { label: "The current tax structure needs some reform but isn't fundamentally broken", value: 0 },
      { label: 'Lower taxes across the board to stimulate economic growth', value: 1 },
      { label: 'Taxes should be minimal; a flat tax or consumption tax only', value: 2 },
    ],
  },
  {
    id: 6,
    type: 'political',
    question: 'On law enforcement and criminal justice:',
    options: [
      { label: 'We need to defund and fundamentally restructure police; focus on root causes of crime', value: -2 },
      { label: 'Significant police reform is needed; redirect some funding to social services', value: -1 },
      { label: 'We need targeted reforms while maintaining strong law enforcement', value: 0 },
      { label: "Support law enforcement strongly; current reform efforts go too far", value: 1 },
      { label: 'We need to increase police funding and take a much harder stance on crime', value: 2 },
    ],
  },
  {
    id: 7,
    type: 'political',
    question: 'Regarding the role of religion in public life and government:',
    options: [
      { label: 'There must be strict separation of church and state in all matters', value: -2 },
      { label: 'Religion should stay private; government must be secular', value: -1 },
      { label: 'Religion can inform values, but laws should be broadly applicable to all', value: 0 },
      { label: 'Religious values should have more influence on our laws and culture', value: 1 },
      { label: 'This is a Christian nation and our laws should reflect that', value: 2 },
    ],
  },
  {
    id: 8,
    type: 'political',
    question: "On America's role in international affairs:",
    options: [
      { label: 'We should drastically reduce military spending and focus on diplomacy and global cooperation', value: -2 },
      { label: 'We should be more restrained internationally and work through multilateral institutions', value: -1 },
      { label: 'A balanced approach — strong defense, but avoid unnecessary entanglements', value: 0 },
      { label: 'We should maintain military superiority and be willing to act unilaterally', value: 1 },
      { label: 'America first — significantly reduce foreign aid and international commitments', value: 2 },
    ],
  },

  // PERSONALITY / INTERESTS QUESTIONS (7)
  {
    id: 9,
    type: 'personality',
    question: 'What kind of movies or TV do you enjoy most?',
    options: [
      { label: 'Documentaries and thought-provoking dramas', value: 1 },
      { label: 'Action, thrillers, and crime shows', value: 2 },
      { label: 'Comedy and feel-good entertainment', value: 3 },
      { label: 'Sports content and reality TV', value: 4 },
      { label: "I don't watch much TV", value: 5 },
    ],
  },
  {
    id: 10,
    type: 'personality',
    question: 'How do you prefer to spend your weekends?',
    options: [
      { label: 'Outdoor activities: hiking, sports, hunting, fishing', value: 1 },
      { label: 'City life: restaurants, museums, events', value: 2 },
      { label: 'At home with family', value: 3 },
      { label: 'Community events or religious activities', value: 4 },
      { label: 'Gaming, hobbies, personal projects', value: 5 },
    ],
  },
  {
    id: 11,
    type: 'personality',
    question: 'When it comes to food, I most enjoy:',
    options: [
      { label: 'Comfort food — BBQ, burgers, classic American', value: 1 },
      { label: 'International cuisine and trying new things', value: 2 },
      { label: 'Home-cooked meals, family recipes', value: 3 },
      { label: "Health-conscious, organic, or plant-based", value: 4 },
      { label: 'Whatever is quick and convenient', value: 5 },
    ],
  },
  {
    id: 12,
    type: 'personality',
    question: 'What best describes your relationship with religion?',
    options: [
      { label: 'Actively religious — it is a core part of my life', value: 1 },
      { label: 'Spiritual but not religious', value: 2 },
      { label: 'Cultural connection to religion but not practicing', value: 3 },
      { label: 'Agnostic — uncertain about these questions', value: 4 },
      { label: 'Atheist — I do not believe in a god', value: 5 },
    ],
  },
  {
    id: 13,
    type: 'personality',
    question: 'Where do you currently live?',
    options: [
      { label: 'Rural area or small town', value: 1 },
      { label: 'Suburban area', value: 2 },
      { label: 'Mid-sized city', value: 3 },
      { label: 'Large city / urban area', value: 4 },
      { label: 'Prefer not to say', value: 5 },
    ],
  },
  {
    id: 14,
    type: 'personality',
    question: 'Which of these do you follow most closely?',
    options: [
      { label: 'Sports (football, baseball, basketball, NASCAR)', value: 1 },
      { label: 'Business and finance', value: 2 },
      { label: 'Arts, music, and entertainment', value: 3 },
      { label: 'Science and technology', value: 4 },
      { label: 'Local community news', value: 5 },
    ],
  },
  {
    id: 15,
    type: 'personality',
    question: 'How do you handle disagreements with people you care about?',
    options: [
      { label: 'I engage directly and debate until we reach understanding', value: 1 },
      { label: 'I state my view clearly, then listen carefully', value: 2 },
      { label: "I prefer to avoid conflict — agree to disagree", value: 3 },
      { label: 'I try to find common ground first before stating my view', value: 4 },
      { label: 'I need time to reflect before I respond', value: 5 },
    ],
  },
]

export function calculateSpectrumScore(
  responses: Record<number, number>
): number {
  const politicalQuestions = QUIZ_QUESTIONS.filter(q => q.type === 'political')
  const scores = politicalQuestions
    .map(q => responses[q.id])
    .filter(v => v !== undefined)

  if (scores.length === 0) return 0

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  // Normalize from [-2, 2] to [-1, 1]
  return avg / 2
}

// Maps spectrum score to a political label matching the available set
export function scoreToLabel(score: number): string {
  if (score <= -0.6) return 'Progressive'
  if (score <= -0.3) return 'Liberal'
  if (score <= -0.1) return 'Moderate Liberal'
  if (score <= 0.1) return 'Centrist'
  if (score <= 0.3) return 'Moderate Conservative'
  if (score <= 0.6) return 'Conservative'
  return 'Conservative'
}

export function formatSpectrumLabel(score: number): string {
  if (score <= -0.75) return 'Far Left'
  if (score <= -0.4) return 'Left'
  if (score <= -0.1) return 'Center-Left'
  if (score <= 0.1) return 'Center'
  if (score <= 0.4) return 'Center-Right'
  if (score <= 0.75) return 'Right'
  return 'Far Right'
}
