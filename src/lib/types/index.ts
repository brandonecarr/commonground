export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  political_label: string | null
  custom_label: string | null
  spectrum_score: number
  total_merit_points: number
  debates_completed: number
  created_at: string
}

export interface Topic {
  id: string
  title: string
  description: string
  category: string
  is_active: boolean
}

export interface DebateSession {
  id: string
  topic_id: string
  user1_id: string
  user2_id: string
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  started_at: string
  ended_at: string | null
  topic?: Topic
  user1?: Profile
  user2?: Profile
}

export interface Message {
  id: string
  session_id: string
  user_id: string
  content: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}

export interface AIIntervention {
  id: string
  session_id: string
  trigger_message_id: string | null
  intervention_type: 'tone_warning' | 'shared_interest'
  content: string
  created_at: string
}

export interface DebateScore {
  id: string
  session_id: string
  user_id: string
  respectfulness: number
  evidence_use: number
  topic_adherence: number
  open_mindedness: number
  total_score: number
  merit_points_awarded: number
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profile?: Profile
}

export interface MatchmakingQueue {
  id: string
  user_id: string
  topic_id: string | null
  spectrum_score: number
  joined_at: string
}

export const POLITICAL_LABELS = [
  'Progressive',
  'Liberal',
  'Moderate Liberal',
  'Centrist',
  'Moderate Conservative',
  'Conservative',
  'Libertarian',
  'Authoritarian',
  'Democratic Socialist',
  'Nationalist',
  'Green / Environmentalist',
  'Populist',
]
