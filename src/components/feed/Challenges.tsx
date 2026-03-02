'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Swords, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface IncomingChallenge {
  id: string
  challenger_id: string
  challengee_id: string
  session_id: string | null
  status: string
  challenger: {
    id: string
    username: string
    political_label: string | null
    custom_label: string | null
    spectrum_score: number
  }
}

interface AcceptedChallenge {
  id: string
  challenger_id: string
  challengee_id: string
  session_id: string | null
  status: string
  challengee: {
    id: string
    username: string
  }
}

interface ChallengesProps {
  incoming: IncomingChallenge[]
  accepted: AcceptedChallenge[]
  currentUserId: string
}

export default function Challenges({ incoming, accepted, currentUserId }: ChallengesProps) {
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function respond(challengeId: string, action: 'accept' | 'decline') {
    setLoading(challengeId)
    const res = await fetch(`/api/challenges/${challengeId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    setLoading(null)

    if (!res.ok) {
      toast.error(data.error || 'Something went wrong')
      return
    }

    if (action === 'decline') {
      setDismissed(prev => [...prev, challengeId])
      toast.success('Challenge declined')
      return
    }

    // Accepted — navigate to the debate session
    if (data.sessionId) {
      router.push(`/debate/${data.sessionId}`)
    } else {
      toast.error('Session not found')
    }
  }

  const visibleIncoming = incoming.filter(c => !dismissed.includes(c.id))
  const visibleAccepted = accepted.filter(c => !dismissed.includes(c.id))

  if (visibleIncoming.length === 0 && visibleAccepted.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Incoming challenges — someone challenged me */}
      {visibleIncoming.length > 0 && (
        <Card className="border-orange-700/50 bg-orange-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-300 text-base flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Debate Challenges ({visibleIncoming.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleIncoming.map(challenge => {
              const label =
                challenge.challenger.custom_label ||
                challenge.challenger.political_label ||
                'Unknown'
              const isLoading = loading === challenge.id
              return (
                <div key={challenge.id} className="flex items-center gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-orange-800 text-white text-sm font-bold">
                      {challenge.challenger.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">
                        @{challenge.challenger.username}
                      </span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {label}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">wants to debate you</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isLoading}
                      onClick={() => respond(challenge.id, 'accept')}
                      className="bg-green-700 hover:bg-green-600 h-7 px-3 text-xs"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isLoading}
                      onClick={() => respond(challenge.id, 'decline')}
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
      )}

      {/* Accepted sent challenges — my challenge was accepted, ready to join */}
      {visibleAccepted.length > 0 && (
        <Card className="border-green-700/50 bg-green-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-300 text-base flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Ready to Debate ({visibleAccepted.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleAccepted.map(challenge => (
              <div key={challenge.id} className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-green-800 text-white text-sm font-bold">
                    {challenge.challengee.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">
                    @{challenge.challengee.username}
                  </span>
                  <p className="text-slate-400 text-xs mt-0.5">accepted your challenge</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push(`/debate/${challenge.session_id}`)}
                  className="bg-green-700 hover:bg-green-600 h-7 px-3 text-xs gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Join Debate
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
