import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const serviceSupabase = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { challengeeId, topicId } = await req.json()

  if (!challengeeId) return NextResponse.json({ error: 'challengeeId required' }, { status: 400 })
  if (challengeeId === user.id) return NextResponse.json({ error: 'Cannot challenge yourself' }, { status: 400 })

  // Check for an existing pending challenge between these two users
  const { data: existing } = await supabase
    .from('debate_challenges')
    .select('id')
    .eq('challenger_id', user.id)
    .eq('challengee_id', challengeeId)
    .eq('status', 'pending')
    .single()

  if (existing) return NextResponse.json({ already: true })

  const { error } = await serviceSupabase.from('debate_challenges').insert({
    challenger_id: user.id,
    challengee_id: challengeeId,
    topic_id: topicId || null,
  })

  if (error) {
    console.error('Challenge insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
