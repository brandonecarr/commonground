-- ============================================================
-- DEBATE CHALLENGES
-- ============================================================
CREATE TABLE IF NOT EXISTS debate_challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenger_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  challengee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES topics(id),
  session_id UUID REFERENCES debate_sessions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index: only one pending challenge per pair at a time,
-- but allows re-challenges after a decline
CREATE UNIQUE INDEX challenges_one_pending_per_pair
  ON debate_challenges (challenger_id, challengee_id)
  WHERE status = 'pending';

ALTER TABLE debate_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges_participant_read" ON debate_challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challengee_id);

CREATE POLICY "challenges_challenger_insert" ON debate_challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- Challengee can update (accept/decline); service role handles the session_id update
CREATE POLICY "challenges_challengee_update" ON debate_challenges
  FOR UPDATE USING (auth.uid() = challengee_id OR auth.uid() = challenger_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE debate_challenges;
