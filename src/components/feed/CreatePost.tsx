'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { toast } from 'sonner'

export default function CreatePost({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const router = useRouter()
  const remaining = 280 - content.length

  async function createPost() {
    if (!content.trim() || posting) return
    setPosting(true)

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })

    if (res.ok) {
      setContent('')
      router.refresh()
    } else {
      toast.error('Could not post. Try again.')
    }

    setPosting(false)
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardContent className="pt-4">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value.slice(0, 280))}
          placeholder="Share a thought on today's political landscape..."
          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none mb-3"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${remaining < 20 ? 'text-red-400' : 'text-slate-500'}`}>
            {remaining} characters remaining
          </span>
          <Button
            onClick={createPost}
            disabled={!content.trim() || posting || remaining < 0}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
