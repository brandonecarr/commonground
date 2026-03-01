'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Topic } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shuffle, MessageSquare, Clock, X } from 'lucide-react'
import { toast } from 'sonner'

interface TopicSelectorProps {
  topics: Topic[]
  profile: {
    id: string
    username: string
    spectrum_score: number
    political_label: string | null
    custom_label: string | null
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  Social: 'bg-purple-900/50 text-purple-300 border-purple-700',
  Policy: 'bg-blue-900/50 text-blue-300 border-blue-700',
  Environment: 'bg-green-900/50 text-green-300 border-green-700',
  Economy: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  Justice: 'bg-red-900/50 text-red-300 border-red-700',
  Technology: 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  'Civil Rights': 'bg-pink-900/50 text-pink-300 border-pink-700',
  'Foreign Policy': 'bg-orange-900/50 text-orange-300 border-orange-700',
}

export default function TopicSelector({ topics, profile }: TopicSelectorProps) {
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [isQueuing, setIsQueuing] = useState(false)
  const [waitTime, setWaitTime] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const waitRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (waitRef.current) clearInterval(waitRef.current)
    }
  }, [])

  async function joinQueue(topicId: string | null) {
    setIsQueuing(true)
    setWaitTime(0)

    const res = await fetch('/api/debate/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId }),
    })

    if (!res.ok) {
      toast.error('Could not join queue. Try again.')
      setIsQueuing(false)
      return
    }

    const data = await res.json()

    // If immediately matched
    if (data.sessionId) {
      router.push(`/debate/${data.sessionId}`)
      return
    }

    // Poll for a match
    waitRef.current = setInterval(() => setWaitTime(t => t + 1), 1000)

    pollRef.current = setInterval(async () => {
      const pollRes = await fetch('/api/debate/match/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })
      const pollData = await pollRes.json()

      if (pollData.sessionId) {
        clearInterval(pollRef.current!)
        clearInterval(waitRef.current!)
        router.push(`/debate/${pollData.sessionId}`)
      } else if (pollData.timeout) {
        clearInterval(pollRef.current!)
        clearInterval(waitRef.current!)
        setIsQueuing(false)
        toast.error('No match found. Try again in a moment — more users are joining every day!')
      }
    }, 3000)
  }

  function leaveQueue() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (waitRef.current) clearInterval(waitRef.current)
    setIsQueuing(false)
    setWaitTime(0)
    fetch('/api/debate/match/leave', { method: 'POST' })
  }

  if (isQueuing) {
    return (
      <div className="text-center py-20">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-purple-500 border-t-transparent animate-spin animate-[spin_1.5s_linear_infinite_reverse]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Finding Your Opponent...</h2>
        {selectedTopic && (
          <p className="text-blue-400 mb-1 font-medium">{selectedTopic.title}</p>
        )}
        <p className="text-slate-400 mb-6">
          Looking for someone with different views to match you with
          {waitTime > 0 && <span className="text-white"> · {waitTime}s</span>}
        </p>
        <Button variant="outline" onClick={leaveQueue} className="border-slate-600 text-slate-400">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Roulette option */}
      <Card
        className="border-2 border-dashed border-purple-500 bg-purple-900/20 cursor-pointer hover:bg-purple-900/30 transition-colors"
        onClick={() => {
          setSelectedTopic(null)
          joinQueue(null)
        }}
      >
        <CardContent className="flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <Shuffle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Roulette Debate</h3>
            <p className="text-purple-300 text-sm">
              Get matched on a random topic. Embrace the unknown.
            </p>
          </div>
          <Button className="ml-auto bg-purple-600 hover:bg-purple-700 flex-shrink-0">
            Enter Queue
          </Button>
        </CardContent>
      </Card>

      {/* Topics grid */}
      <div>
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          Choose a Topic
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {topics.map(topic => (
            <Card
              key={topic.id}
              className={`border cursor-pointer transition-all ${
                selectedTopic?.id === topic.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
              onClick={() => setSelectedTopic(topic)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-white text-base leading-snug">{topic.title}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs flex-shrink-0 ${CATEGORY_COLORS[topic.category] || 'border-slate-600 text-slate-400'}`}
                  >
                    {topic.category}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400 text-xs">{topic.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {selectedTopic && (
        <div className="sticky bottom-4">
          <Button
            onClick={() => joinQueue(selectedTopic.id)}
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-base"
          >
            <Clock className="w-4 h-4 mr-2" />
            Debate: {selectedTopic.title}
          </Button>
        </div>
      )}
    </div>
  )
}
