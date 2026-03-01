-- CommonGround V1 Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  political_label TEXT,
  custom_label TEXT,
  spectrum_score FLOAT DEFAULT 0 CHECK (spectrum_score >= -1 AND spectrum_score <= 1),
  total_merit_points INT DEFAULT 0,
  debates_completed INT DEFAULT 0,
  quiz_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_owner_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_owner_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- QUIZ RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  question_id INT NOT NULL,
  answer_value INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_responses_owner" ON quiz_responses
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TOPICS
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_public_read" ON topics
  FOR SELECT USING (true);

-- ============================================================
-- DEBATE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS debate_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debate_sessions_participant_read" ON debate_sessions
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "debate_sessions_participant_update" ON debate_sessions
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES debate_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can read/write messages in their sessions
CREATE POLICY "messages_participant_read" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debate_sessions ds
      WHERE ds.id = session_id
      AND (ds.user1_id = auth.uid() OR ds.user2_id = auth.uid())
    )
  );

CREATE POLICY "messages_participant_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM debate_sessions ds
      WHERE ds.id = session_id
      AND (ds.user1_id = auth.uid() OR ds.user2_id = auth.uid())
    )
  );

-- ============================================================
-- AI INTERVENTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_interventions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES debate_sessions(id) ON DELETE CASCADE NOT NULL,
  trigger_message_id UUID REFERENCES messages(id),
  intervention_type TEXT NOT NULL CHECK (intervention_type IN ('tone_warning', 'shared_interest')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_interventions_participant_read" ON ai_interventions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debate_sessions ds
      WHERE ds.id = session_id
      AND (ds.user1_id = auth.uid() OR ds.user2_id = auth.uid())
    )
  );

-- ============================================================
-- DEBATE SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS debate_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES debate_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  respectfulness INT CHECK (respectfulness BETWEEN 1 AND 10),
  evidence_use INT CHECK (evidence_use BETWEEN 1 AND 10),
  topic_adherence INT CHECK (topic_adherence BETWEEN 1 AND 10),
  open_mindedness INT CHECK (open_mindedness BETWEEN 1 AND 10),
  total_score INT,
  merit_points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE debate_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debate_scores_public_read" ON debate_scores
  FOR SELECT USING (true);

-- ============================================================
-- MATCHMAKING QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  topic_id UUID REFERENCES topics(id),
  spectrum_score FLOAT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Service role only manages the queue
CREATE POLICY "matchmaking_queue_owner_read" ON matchmaking_queue
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friendships_participant_read" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "friendships_requester_insert" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "friendships_addressee_update" ON friendships
  FOR UPDATE USING (auth.uid() = addressee_id);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_read" ON posts
  FOR SELECT USING (true);

CREATE POLICY "posts_owner_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_owner_delete" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_interventions;
ALTER PUBLICATION supabase_realtime ADD TABLE debate_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;

-- ============================================================
-- SEED: TOPICS
-- ============================================================
INSERT INTO topics (title, description, category) VALUES
  ('Abortion Rights', 'Should abortion be legal, and to what extent should it be regulated by the government?', 'Social'),
  ('Gun Control', 'What gun regulations, if any, should the federal government implement to balance rights and safety?', 'Social'),
  ('Immigration Policy', 'How should the U.S. handle immigration, border security, and undocumented residents?', 'Policy'),
  ('Climate Change', 'What role should government play in addressing climate change and transitioning to clean energy?', 'Environment'),
  ('Healthcare System', 'Should the U.S. move toward universal healthcare, or maintain a market-based system?', 'Policy'),
  ('Tax Policy', 'How should the tax burden be distributed, and what should government revenue fund?', 'Economy'),
  ('Police Reform', 'How should law enforcement be reformed to address both crime and civil rights concerns?', 'Justice'),
  ('Education Policy', 'What is the proper role of government in education, including school choice and curriculum standards?', 'Policy'),
  ('Social Media Regulation', 'Should the government regulate social media companies for content moderation and misinformation?', 'Technology'),
  ('Drug Policy', 'Should drug use be decriminalized or legalized, and how should addiction be treated?', 'Justice'),
  ('Free Speech', 'Where should the limits of free speech be, especially regarding hate speech and online content?', 'Civil Rights'),
  ('Foreign Policy & Military', 'What should be the role of the U.S. military and our involvement in international conflicts?', 'Foreign Policy');

-- ============================================================
-- FUNCTION: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
