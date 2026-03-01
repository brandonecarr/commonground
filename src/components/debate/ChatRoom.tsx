'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Message, AIIntervention, DebateSession } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Send, Bot, Flag, X, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { formatSpectrumLabel } from '@/lib/quiz/questions'

interface ChatRoomProps {
  session: DebateSession & {
    topics: { id: string; title: string; description: string; category: string }
    user1: { id: string; username: string; spectrum_score: number; political_label: string | null; custom_label: string | null }
    user2: { id: string; username: string; spectrum_score: number; political_label: string | null; custom_label: string | null } | null
  }
  currentUserId: string
  initialMessages: Message[]
  initialInterventions: AIIntervention[]
}

type ChatItem =
  | ({ type: 'message' } & Message)
  | ({ type: 'intervention' } & AIIntervention)

export default function ChatRoom({
  session,
  currentUserId,
  initialMessages,
  initialInterventions,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [interventions, setInterventions] = useState<AIIntervention[]>(initialInterventions)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showFriendDialog, setShowFriendDialog] = useState(false)
  const [partnerLeft, setPartnerLeft] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const opponent = session.user1_id === currentUserId ? session.user2 : session.user1
  const me = session.user1_id === currentUserId ? session.user1 : session.user2

  // Merge and sort messages + interventions by time
  const chatItems: ChatItem[] = [
    ...messages.map(m => ({ ...m, type: 'message' as const })),
    ...interventions.map(i => ({ ...i, type: 'intervention' as const })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatItems.length])

  // Subscribe to new messages
  useEffect(() => {
    const msgChannel = supabase
      .channel(`messages:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${session.id}`,
        },
        payload => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()

    const interventionChannel = supabase
      .channel(`interventions:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_interventions',
          filter: `session_id=eq.${session.id}`,
        },
        payload => {
          setInterventions(prev => {
            if (prev.find(i => i.id === payload.new.id)) return prev
            return [...prev, payload.new as AIIntervention]
          })
        }
      )
      .subscribe()

    // Watch for session status changes
    const sessionChannel = supabase
      .channel(`session:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'debate_sessions',
          filter: `id=eq.${session.id}`,
        },
        payload => {
          if (payload.new.status === 'completed') {
            router.push(`/debate/${session.id}/results`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(interventionChannel)
      supabase.removeChannel(sessionChannel)
    }
  }, [session.id, supabase, router])

  async function sendMessage() {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const res = await fetch(`/api/debate/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })

    if (!res.ok) {
      toast.error('Message failed to send')
      setInput(text)
    }

    setSending(false)
  }

  async function endDebate() {
    setShowEndDialog(false)
    const res = await fetch(`/api/debate/${session.id}/end`, { method: 'POST' })
    if (res.ok) {
      setShowFriendDialog(true)
    }
  }

  async function sendFriendRequest() {
    if (!opponent) return
    await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresseeId: opponent.id }),
    })
    setShowFriendDialog(false)
    toast.success('Friend request sent!')
    router.push(`/debate/${session.id}/results`)
  }

  function skipFriendRequest() {
    setShowFriendDialog(false)
    router.push(`/debate/${session.id}/results`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const opponentLabel = opponent
    ? opponent.custom_label || opponent.political_label || 'Unknown'
    : 'Unknown'

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-4">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-800/80 border-b border-slate-700 px-4 py-3 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{session.topics?.title ?? 'Debate'}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {opponent ? (
                <>
                  <span className="text-slate-400 text-sm">vs</span>
                  <span className="text-blue-300 text-sm font-medium">@{opponent.username}</span>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    {opponentLabel}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-500">
                    {formatSpectrumLabel(opponent.spectrum_score)}
                  </Badge>
                </>
              ) : (
                <span className="text-slate-400 text-sm">Waiting for opponent...</span>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEndDialog(true)}
            className="border-red-800 text-red-400 hover:bg-red-900/30"
          >
            <Flag className="w-4 h-4 mr-1" />
            End Debate
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-900/50">
        {opponent === null && (
          <div className="text-center text-slate-500 py-8">
            <div className="animate-pulse text-2xl mb-2">⏳</div>
            <p>Waiting for your opponent to connect...</p>
          </div>
        )}

        {chatItems.map(item => {
          if (item.type === 'intervention') {
            return (
              <div key={item.id} className="flex justify-center">
                <div className="flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-3 max-w-lg">
                  <Bot className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200 text-sm">{item.content}</p>
                </div>
              </div>
            )
          }

          const isMe = item.user_id === currentUserId
          const sender = isMe ? me : opponent

          return (
            <div key={item.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className={`text-xs font-bold ${isMe ? 'bg-blue-700' : 'bg-purple-700'} text-white`}>
                  {sender?.username?.[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`rounded-2xl px-4 py-2.5 ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-700 text-white rounded-tl-sm'
                } ${item.is_flagged ? 'opacity-60 border border-red-500/50' : ''}`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                </div>
                {item.is_flagged && (
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    Flagged by moderator
                  </span>
                )}
                <span className="text-slate-600 text-xs">
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-slate-800/80 border-t border-slate-700 px-4 py-3">
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your perspective... (Enter to send, Shift+Enter for new line)"
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none min-h-[44px] max-h-32"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !opponent}
            className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-slate-600 text-xs mt-2 text-center">
          CommonGround AI moderates for respectful conversation only — all political views are welcome.
        </p>
      </div>

      {/* End Debate Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">End this debate?</DialogTitle>
            <DialogDescription className="text-slate-400">
              Your conversation will be scored and added to your profile. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndDialog(false)} className="border-slate-600 text-slate-300">
              Keep Debating
            </Button>
            <Button onClick={endDebate} className="bg-red-600 hover:bg-red-700">
              End & Score Debate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Friend Request Dialog */}
      <Dialog open={showFriendDialog} onOpenChange={setShowFriendDialog}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Great conversation!</DialogTitle>
            <DialogDescription className="text-slate-400">
              You just debated <strong className="text-white">@{opponent?.username}</strong>. Even though you may disagree politically, would you like to stay connected?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={skipFriendRequest} className="border-slate-600 text-slate-300">
              No thanks
            </Button>
            <Button onClick={sendFriendRequest} className="bg-green-600 hover:bg-green-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add as Friend (+3 pts)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
