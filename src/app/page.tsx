import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Shield, Trophy, Users, ArrowRight, Star } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-400" />
          <span className="font-bold text-xl">CommonGround</span>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-4xl mx-auto">
        <Badge className="mb-6 bg-blue-900/50 text-blue-300 border-blue-700 text-sm px-4 py-1 hover:bg-blue-900/50">
          AI-Moderated Political Debate
        </Badge>
        <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
          Debate someone who{' '}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            disagrees
          </span>{' '}
          with you.
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          CommonGround matches you with someone on the opposite end of the political spectrum — someone who, it turns out, loves the same movies as you. Our AI keeps it respectful. You do the rest.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
            <Link href="/signup">
              Take the Quiz
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-600 text-slate-300 text-lg px-8 py-6 hover:bg-slate-800">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How CommonGround Works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Find Your Spectrum',
              desc: 'Take a 15-question quiz that places you on the political spectrum — and tells you why.',
              icon: Star,
              color: 'text-yellow-400',
            },
            {
              step: '02',
              title: 'Get Matched',
              desc: 'We pair you with someone from the other side who shares surprising similarities.',
              icon: Users,
              color: 'text-blue-400',
            },
            {
              step: '03',
              title: 'Debate Respectfully',
              desc: 'Our AI moderator ensures the conversation stays civil. All views are welcome; attacks are not.',
              icon: Shield,
              color: 'text-green-400',
            },
            {
              step: '04',
              title: 'Earn Merit Points',
              desc: 'Get scored on respectfulness, evidence, and open-mindedness. Climb the leaderboard.',
              icon: Trophy,
              color: 'text-purple-400',
            },
          ].map(({ step, title, desc, icon: Icon, color }) => (
            <div key={step} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="text-xs text-slate-600 font-mono mb-3">{step}</div>
              <Icon className={`w-8 h-8 ${color} mb-3`} />
              <h3 className="font-bold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Topics */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">Hot Topics</h2>
        <p className="text-slate-400 text-center mb-10">12 of today&apos;s most contested political debates</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            'Abortion Rights', 'Gun Control', 'Immigration Policy', 'Climate Change',
            'Healthcare System', 'Tax Policy', 'Police Reform', 'Education Policy',
            'Social Media Regulation', 'Drug Policy', 'Free Speech', 'Foreign Policy',
          ].map(topic => (
            <Badge key={topic} variant="outline" className="border-slate-600 text-slate-300 px-4 py-2 text-sm hover:border-blue-500 hover:text-blue-300 transition-colors cursor-default">
              {topic}
            </Badge>
          ))}
        </div>
      </section>

      {/* Merit system */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">You Get Points for Being a Good Human</h2>
        <p className="text-slate-400 mb-10 text-lg">
          CommonGround doesn&apos;t reward being loud or extreme. It rewards being thoughtful, evidenced-based, and open to a different view.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Respectfulness', pts: '+0–10', color: 'text-yellow-400' },
            { label: 'Use of Evidence', pts: '+0–10', color: 'text-green-400' },
            { label: 'Staying on Topic', pts: '+0–10', color: 'text-blue-400' },
            { label: 'Open-Mindedness', pts: '+0–10', color: 'text-purple-400' },
          ].map(({ label, pts, color }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className={`text-2xl font-black ${color} mb-1`}>{pts}</div>
              <div className="text-slate-400 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to find some common ground?</h2>
        <p className="text-slate-400 text-lg mb-8">Join the platform built to bridge divides, not widen them.</p>
        <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-10 py-6">
          <Link href="/signup">
            Create Free Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center text-slate-600 text-sm">
        <p>© 2025 CommonGround. Built to bridge divides, one conversation at a time.</p>
      </footer>
    </div>
  )
}
