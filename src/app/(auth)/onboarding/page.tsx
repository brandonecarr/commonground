'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { QUIZ_QUESTIONS, calculateSpectrumScore } from '@/lib/quiz/questions'
import { POLITICAL_LABELS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react'

type QuizState = 'quiz' | 'processing' | 'result'

export default function OnboardingPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<number, number>>({})
  const [state, setState] = useState<QuizState>('quiz')
  const [aiLabel, setAiLabel] = useState('')
  const [aiExplanation, setAiExplanation] = useState('')
  const [spectrumScore, setSpectrumScore] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const question = QUIZ_QUESTIONS[currentQuestion]
  const progress = ((currentQuestion) / QUIZ_QUESTIONS.length) * 100
  const isAnswered = responses[question?.id] !== undefined

  function selectAnswer(value: number) {
    setResponses(prev => ({ ...prev, [question.id]: value }))
  }

  function nextQuestion() {
    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      submitQuiz()
    }
  }

  function prevQuestion() {
    if (currentQuestion > 0) setCurrentQuestion(prev => prev - 1)
  }

  async function submitQuiz() {
    setState('processing')
    const score = calculateSpectrumScore(responses)
    setSpectrumScore(score)

    // Build summary for AI
    const politicalResponses = QUIZ_QUESTIONS
      .filter(q => q.type === 'political')
      .map(q => `${q.question}: ${q.options.find(o => o.value === responses[q.id])?.label ?? 'no answer'}`)
      .join('\n')

    try {
      const res = await fetch('/api/quiz/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ politicalResponses, spectrumScore: score }),
      })
      const data = await res.json()
      setAiLabel(data.label || 'Centrist')
      setAiExplanation(data.explanation || '')
      setSelectedLabel(data.label || 'Centrist')
    } catch {
      setAiLabel('Centrist')
      setSelectedLabel('Centrist')
    }

    setState('result')
  }

  async function completeOnboarding() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save quiz responses
    const responseRows = Object.entries(responses).map(([questionId, answerValue]) => ({
      user_id: user.id,
      question_id: parseInt(questionId),
      answer_value: answerValue,
    }))

    await supabase.from('quiz_responses').insert(responseRows)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        spectrum_score: spectrumScore,
        political_label: aiLabel,
        custom_label: selectedLabel !== aiLabel ? selectedLabel : null,
        quiz_completed: true,
      })
      .eq('id', user.id)

    toast.success('Profile complete! Time to find your debate partner.')
    router.push('/feed')
  }

  const displayLabel = selectedLabel || aiLabel

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {state === 'quiz' && question && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-white mb-1">Political Spectrum Quiz</h1>
              <p className="text-slate-400">
                Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
                {question.type === 'personality' && (
                  <span className="ml-2 text-blue-400">— About You</span>
                )}
              </p>
            </div>

            <Progress value={progress} className="mb-6 h-2 bg-slate-700" />

            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white text-xl leading-relaxed">
                  {question.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {question.options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => selectAnswer(option.value)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      responses[question.id] === option.value
                        ? 'border-blue-500 bg-blue-900/40 text-white'
                        : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={prevQuestion}
                    disabled={currentQuestion === 0}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    onClick={nextQuestion}
                    disabled={!isAnswered}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {currentQuestion === QUIZ_QUESTIONS.length - 1 ? 'See Results' : 'Next'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {state === 'processing' && (
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Analyzing your responses...</h2>
            <p className="text-slate-400">Our AI is determining where you stand on the spectrum.</p>
          </div>
        )}

        {state === 'result' && (
          <div>
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">Your Political Profile</h2>
              <p className="text-slate-400">Based on your answers, our AI suggests:</p>
            </div>

            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur mb-4">
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  <Badge className="text-xl px-6 py-2 bg-blue-600 hover:bg-blue-600">
                    {displayLabel}
                  </Badge>
                </div>
                {aiExplanation && (
                  <p className="text-slate-300 text-sm max-w-md mx-auto mb-4">{aiExplanation}</p>
                )}
                <div className="flex items-center gap-4 my-6">
                  <span className="text-slate-400 text-sm w-16 text-right">Far Left</span>
                  <div className="flex-1 relative h-4 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-full">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full border-2 border-slate-800 shadow-lg"
                      style={{ left: `${((spectrumScore + 1) / 2) * 100}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    />
                  </div>
                  <span className="text-slate-400 text-sm w-16">Far Right</span>
                </div>

                <button
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  {showLabelPicker ? 'Hide options' : "This doesn't feel right — let me choose"}
                </button>

                {showLabelPicker && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {POLITICAL_LABELS.map(label => (
                      <button
                        key={label}
                        onClick={() => setSelectedLabel(label)}
                        className={`p-2 rounded-lg text-sm transition-all ${
                          selectedLabel === label
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={completeOnboarding}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
            >
              Complete Profile & Start Debating
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
