import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const TIMEOUT_SECONDS = 180

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if user has been matched (no longer in queue but a session exists)
  const { data: queueEntry } = await serviceSupabase
    .from('matchmaking_queue')
    .select('joined_at')
    .eq('user_id', user.id)
    .single()

  if (!queueEntry) {
    // Check if a new session was created for them
    const { data: session } = await supabase
      .from('debate_sessions')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    if (session) {
      return NextResponse.json({ sessionId: session.id })
    }
    return NextResponse.json({ timeout: true })
  }

  // Check if we've timed out
  const joinedAt = new Date(queueEntry.joined_at).getTime()
  const elapsed = (Date.now() - joinedAt) / 1000

  if (elapsed > TIMEOUT_SECONDS) {
    await serviceSupabase.from('matchmaking_queue').delete().eq('user_id', user.id)
    return NextResponse.json({ timeout: true })
  }

  return NextResponse.json({ waiting: true, elapsed: Math.round(elapsed) })
}
