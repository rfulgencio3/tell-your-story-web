export type RoomStatus = 'waiting' | 'active' | 'paused' | 'finished' | 'expired'
export type RoundStatus = 'writing' | 'voting' | 'revealed'

export interface Room {
  id: string
  code: string
  host_id: string
  max_rounds: number
  time_per_round: number
  status: RoomStatus
  created_at: string
  expires_at: string
}

export interface User {
  id: string
  room_id: string
  nickname: string
  avatar_url: string
  is_host: boolean
  created_at: string
}

export interface Round {
  id: string
  room_id: string
  round_number: number
  status: RoundStatus
  started_at: string
  phase_ends_at?: string | null
  paused_at?: string | null
  completed_at?: string | null
}

export interface RoomState {
  room: Room
  users: User[]
  current_round?: Round | null
}

export interface AuthSession {
  user_id: string
  session_token: string
}

export interface AuthenticatedRoomState extends RoomState {
  session: AuthSession
}

export interface SessionState extends AuthSession {
  roomCode: string
  nickname: string
  isHost: boolean
}

export interface Story {
  id: string
  round_id: string
  user_id: string
  title: string
  body: string
  is_revealed: boolean
  created_at: string
}

export interface StoryCard {
  id: string
  round_id: string
  title: string
  body: string
  is_revealed: boolean
  vote_count: number
  created_at: string
}

export interface VoteSummary {
  story_id: string
  vote_count: number
}

export interface UserVote {
  user_id: string
  round_id: string
  story_id: string
}

export interface TopStoryResult {
  story: Story
  author: User
  vote_count: number
}

export interface ProgressPayload {
  round_id: string
  count: number
}

export interface RealtimeEnvelope<T = unknown> {
  type: string
  room_code?: string
  timestamp: string
  data?: T
}
