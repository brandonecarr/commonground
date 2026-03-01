import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topicId } = await req.json()

  // Get user's spectrum score
  const { data: profile } = await supabase
    .from('profiles')
    .select('spectrum_score')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const spectrumScore = profile.spectrum_score as number

  // Remove from queue if already in it
  await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', user.id)

  // Find the best opponent — someone with the most opposite spectrum score
  // If topicId is specified, match on that topic; otherwise any
  let query = serviceSupabase
    .from('matchmaking_queue')
    .select('*')
    .neq('user_id', user.id)
    .order('joined_at', { ascending: true })

  // If a topic was specified, try to match on same topic OR roulette (null topic) players
  // For roulette entry (null topicId), match with anyone
  if (topicId) {
    query = query.or(`topic_id.eq.${topicId},topic_id.is.null`)
  }

  const { data: candidates } = await query

  // Find best match: most opposite spectrum
  let bestMatch = null
  let bestDiff = -1

  if (candidates && candidates.length > 0) {
    for (const candidate of candidates) {
      const diff = Math.abs(spectrumScore - (candidate.spectrum_score as number))
      if (diff > bestDiff) {
        bestDiff = diff
        bestMatch = candidate
      }
    }
  }

  if (bestMatch) {
    // Create the debate session
    // Pick the topic: prefer the specified topic, fallback to opponent's topic
    const sessionTopic = topicId || bestMatch.topic_id || null

    // If roulette, pick a random active topic
    let finalTopicId = sessionTopic
    if (!finalTopicId) {
      const { data: randomTopics } = await serviceSupabase
        .from('topics')
        .select('id')
        .eq('is_active', true)
      if (randomTopics && randomTopics.length > 0) {
        finalTopicId = randomTopics[Math.floor(Math.random() * randomTopics.length)].id
      }
    }

    const { data: session } = await serviceSupabase
      .from('debate_sessions')
      .insert({
        topic_id: finalTopicId,
        user1_id: bestMatch.user_id,
        user2_id: user.id,
        status: 'active',
      })
      .select()
      .single()

    // Remove matched user from queue
    await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', bestMatch.user_id)

    return NextResponse.json({ sessionId: session?.id })
  }

  // No match found — add to queue
  await serviceSupabase.from('matchmaking_queue').insert({
    user_id: user.id,
    topic_id: topicId || null,
    spectrum_score: spectrumScore,
  })

  return NextResponse.json({ queued: true })
}
