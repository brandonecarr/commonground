import { SupabaseClient } from '@supabase/supabase-js'

interface QueueEntry {
  user_id: string
  topic_id: string | null
  spectrum_score: number
  joined_at: string
}

// Returns the candidate with the most opposite spectrum score
export function findBestMatch(myScore: number, candidates: QueueEntry[]): QueueEntry | null {
  if (!candidates.length) return null
  let best: QueueEntry | null = null
  let bestDiff = -1
  for (const c of candidates) {
    const diff = Math.abs(myScore - (c.spectrum_score as number))
    if (diff > bestDiff) {
      bestDiff = diff
      best = c
    }
  }
  return best
}

// Picks the best topic: prefer an explicitly chosen topic, fallback to random
export async function pickTopic(
  serviceSupabase: SupabaseClient,
  topicIdA: string | null,
  topicIdB: string | null,
): Promise<string | null> {
  const preferred = topicIdA || topicIdB
  if (preferred) return preferred

  const { data: topics } = await serviceSupabase
    .from('topics')
    .select('id')
    .eq('is_active', true)

  if (topics && topics.length > 0) {
    return topics[Math.floor(Math.random() * topics.length)].id
  }
  return null
}
