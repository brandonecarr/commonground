'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FriendRequest {
  id: string
  requester_id: string
  requester: {
    id: string
    username: string
    political_label: string | null
    custom_label: string | null
    spectrum_score: number
  }
}

interface FriendRequestsProps {
  requests: FriendRequest[]
  currentUserId: string
}

export default function FriendRequests({ requests, currentUserId }: FriendRequestsProps) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const supabase = createClient()
  const router = useRouter()

  async function acceptRequest(friendshipId: string) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    setDismissed(prev => [...prev, friendshipId])
    toast.success('Friend request accepted!')
    router.refresh()
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setDismissed(prev => [...prev, friendshipId])
  }

  const visible = requests.filter(r => !dismissed.includes(r.id))
  if (visible.length === 0) return null

  return (
    <Card className="border-amber-700/50 bg-amber-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-300 text-base flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          Friend Requests ({visible.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.map(req => {
          const label = req.requester.custom_label || req.requester.political_label || 'Unknown'
          return (
            <div key={req.id} className="flex items-center gap-3">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-purple-700 text-white text-sm font-bold">
                  {req.requester.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">@{req.requester.username}</span>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    {label}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => acceptRequest(req.id)}
                  className="bg-green-700 hover:bg-green-600 h-7 px-3"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => declineRequest(req.id)}
                  className="text-slate-400 hover:text-white h-7 px-2"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
