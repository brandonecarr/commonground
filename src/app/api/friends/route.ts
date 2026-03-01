import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addresseeId } = await req.json()
  if (!addresseeId) return NextResponse.json({ error: 'Missing addresseeId' }, { status: 400 })
  if (addresseeId === user.id) return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 })

  // Check if already friends or pending
  const { data: existing } = await supabase
    .from('friendships')
    .select('id')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`
    )
    .single()

  if (existing) return NextResponse.json({ already: true })

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Also award +3 merit points for sending friend request (called from chat room)
