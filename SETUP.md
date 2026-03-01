# CommonGround — Setup Guide

## Prerequisites
- Node.js 18+
- A Supabase account (free at supabase.com)
- A MiniMax API key (get at platform.minimax.io)

---

## Step 1: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **SQL Editor** and run the migration:
   - Open `supabase/migrations/001_initial.sql`
   - Copy the entire contents and paste into the SQL editor
   - Click **Run**

4. Go to **Realtime** in the sidebar and ensure it's enabled for:
   - `messages`
   - `ai_interventions`
   - `debate_sessions`
   - `matchmaking_queue`

---

## Step 2: MiniMax API Key

1. Go to [platform.minimax.io](https://platform.minimax.io)
2. Create an account and navigate to **API Keys**
3. Generate a new key → `MINIMAX_API_KEY`

---

## Step 3: Environment Variables

Edit `.env.local` and fill in your actual values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
MINIMAX_API_KEY=your_minimax_api_key
```

---

## Step 4: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## User Flow to Test

1. **Sign up** at `/signup` with a username, email, and password
2. **Take the quiz** at `/onboarding` (15 questions)
3. **See your political profile** — accept or override the AI label
4. **Go to Debate** and pick a topic or enter Roulette
5. **Open a second browser window** (incognito), sign up a second user with a very different quiz profile
6. Both users enter the queue — they get matched
7. **Chat** — try sending an inflammatory message to see AI moderation
8. **End the debate** — see the scorecard and friend request prompt
9. **Check the leaderboard** at `/leaderboard`

---

## Architecture Notes

- **Matchmaking**: Polls every 3 seconds for a match (max 3 minutes wait)
- **AI Moderation**: Every message triggers a MiniMax API call for tone checking
- **Real-time chat**: Uses Supabase Realtime Postgres Changes subscriptions
- **Scoring**: Called when either user ends the debate; MiniMax scores 4 dimensions (1-10 each)
- **Merit points**: Total score / 2 (max 20 per debate) + bonus for friend requests

## V2 Ideas (not built yet)
- Real-time fact-checking with nonpartisan news feed
- Specialist badges for debating well on specific topics
- Spectator mode
- Topic submission by users
- ELO-weighted matchmaking
- Premium tier
