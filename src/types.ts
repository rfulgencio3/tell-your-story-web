export type GameType = 'tell-your-story' | 'three-lies-one-truth'
export type RoomStatus = 'waiting' | 'active' | 'paused' | 'finished' | 'expired'
export type RoundStatus =
  | 'countdown'
  | 'writing'
  | 'voting'
  | 'revealed'
  | 'presentation_voting'
  | 'reveal'
  | 'commentary'
  | 'finished'

export interface Room {
  id: string
  code: string
  host_id: string
  game_type: GameType
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
  active_truth_set_id?: string | null
  started_at: string
  phase_ends_at?: string | null
  paused_at?: string | null
  completed_at?: string | null
}

export interface TruthSetStatement {
  id: string
  truth_set_id: string
  statement_index: number
  content: string
  created_at: string
  updated_at: string
}

export interface TruthSet {
  id: string
  room_id: string
  round_id: string
  author_user_id: string
  presentation_order: number
  true_statement_index: number
  commentary_text?: string
  created_at: string
  updated_at: string
  statements: TruthSetStatement[]
}

export interface PresentedTruthSet {
  id: string
  room_id: string
  round_id: string
  author_user_id: string
  presentation_order: number
  created_at: string
  updated_at: string
  statements: TruthSetStatement[]
}

export interface ThreeLiesVotingProgress {
  eligible_voters: number
  submitted_votes: number
}

export interface ThreeLiesRevealedVote {
  user_id: string
  selected_statement_index: number
  is_correct: boolean
}

export interface ThreeLiesRevealState {
  truth_set: TruthSet
  true_statement_index: number
  revealed_votes: ThreeLiesRevealedVote[]
}

export interface TruthSetVote {
  id: string
  room_id: string
  round_id: string
  truth_set_id: string
  user_id: string
  selected_statement_index: number
  created_at: string
  updated_at: string
}

export interface ThreeLiesRankingEntry {
  position: number
  user_id: string
  nickname: string
  avatar_url: string
  score: number
}

export interface ThreeLiesState {
  active_truth_set?: PresentedTruthSet | null
  voting_progress?: ThreeLiesVotingProgress | null
  reveal?: ThreeLiesRevealState | null
  final_ranking?: ThreeLiesRankingEntry[] | null
}

export interface RoomState {
  room: Room
  users: User[]
  current_round?: Round | null
  three_lies?: ThreeLiesState | null
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
