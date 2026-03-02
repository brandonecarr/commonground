'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Swords } from 'lucide-react'
import { toast } from 'sonner'

interface DebateButtonProps {
  postAuthorId: string
  postAuthorUsername: string
  currentUserId: string
}

export default function DebateButton({ postAuthorId, postAuthorUsername, currentUserId }: DebateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (postAuthorId === currentUserId) return null

  async function sendChallenge() {
    setLoading(true)
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeeId: postAuthorId }),
    })
    const data = await res.json()
    if (res.ok || data.already) {
      setSent(true)
      toast.success(`Challenge sent to @${postAuthorUsername}!`)
    } else {
      toast.error(data.error || 'Could not send challenge')
    }
    setLoading(false)
  }

  return (
    <Button
      size="sm"
      onClick={sendChallenge}
      disabled={loading || sent}
      className={`h-7 px-2 text-xs gap-1 ${sent ? 'bg-slate-700 text-slate-400' : 'bg-orange-700 hover:bg-orange-600 text-white'}`}
    >
      <Swords className="w-3 h-3" />
      {sent ? 'Challenged' : 'Debate'}
    </Button>
  )
}
