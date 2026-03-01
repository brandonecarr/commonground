'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface FriendButtonProps {
  profileId: string
  currentUserId: string
}

export default function FriendButton({ profileId, currentUserId }: FriendButtonProps) {
  const [status, setStatus] = useState<'none' | 'pending' | 'accepted'>('none')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadStatus() {
      const { data } = await supabase
        .from('friendships')
        .select('status')
        .or(
          `and(requester_id.eq.${currentUserId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${currentUserId})`
        )
        .single()

      if (data) setStatus(data.status as 'pending' | 'accepted')
      setLoading(false)
    }
    loadStatus()
  }, [profileId, currentUserId, supabase])

  async function sendRequest() {
    const { error } = await supabase.from('friendships').insert({
      requester_id: currentUserId,
      addressee_id: profileId,
    })

    if (error) {
      toast.error('Could not send friend request')
    } else {
      setStatus('pending')
      toast.success('Friend request sent!')
    }
  }

  if (loading) return null

  if (status === 'accepted') {
    return (
      <Button variant="outline" size="sm" disabled className="border-green-600 text-green-400">
        <UserCheck className="w-4 h-4 mr-1" />
        Friends
      </Button>
    )
  }

  if (status === 'pending') {
    return (
      <Button variant="outline" size="sm" disabled className="border-slate-600 text-slate-400">
        <Clock className="w-4 h-4 mr-1" />
        Pending
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={sendRequest} className="bg-blue-600 hover:bg-blue-700">
      <UserPlus className="w-4 h-4 mr-1" />
      Add Friend
    </Button>
  )
}
