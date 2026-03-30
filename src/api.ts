import type {
  AuthenticatedRoomState,
  GameType,
  RoomState,
  SessionState,
  Story,
  StoryCard,
  TopStoryResult,
  TruthSet,
  TruthSetVote,
  UserVote,
  VoteSummary,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const WS_BASE_URL = (import.meta.env.VITE_WS_BASE_URL ?? API_BASE_URL.replace(/^http/, 'ws')).replace(/\/$/, '')

type HttpMethod = 'GET' | 'POST'

interface Envelope<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
  const response = await fetch(API_BASE_URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as Envelope<T> | null
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ?? 'Request failed',
      response.status,
      payload?.error,
    )
  }

  return payload.data
}

export function getRealtimeUrl(session: SessionState): string {
  const url = new URL('/ws', WS_BASE_URL)
  url.searchParams.set('room_code', session.roomCode)
  url.searchParams.set('user_id', session.user_id)
  url.searchParams.set('session_token', session.session_token)
  return url.toString()
}

export function createRoom(input: {
  host_nickname: string
  host_avatar_url?: string
  game_type: GameType
  max_rounds: number
  time_per_round: number
}) {
  return request<AuthenticatedRoomState>('/api/rooms', 'POST', input)
}

export function joinRoom(code: string, input: { nickname: string; avatar_url?: string }) {
  return request<AuthenticatedRoomState>(`/api/rooms/${code}/join`, 'POST', input)
}

export function getRoom(code: string) {
  return request<RoomState>(`/api/rooms/${code}`, 'GET')
}

function roomAction(path: string, session: SessionState) {
  return request<RoomState>(path, 'POST', {
    user_id: session.user_id,
    session_token: session.session_token,
  })
}

export function leaveRoom(session: SessionState) {
  return roomAction(`/api/rooms/${session.roomCode}/leave`, session)
}

export function startRoom(session: SessionState) {
  return roomAction(`/api/rooms/${session.roomCode}/start`, session)
}

export function pauseRoom(session: SessionState) {
  return roomAction(`/api/rooms/${session.roomCode}/pause`, session)
}

export function nextRound(session: SessionState) {
  return roomAction(`/api/rooms/${session.roomCode}/next-round`, session)
}

export function submitStory(input: {
  round_id: string
  user_id: string
  session_token: string
  title: string
  body: string
}) {
  return request<Story>('/api/stories', 'POST', input)
}

export function listStories(roundId: string) {
  return request<StoryCard[]>(`/api/rounds/${roundId}/stories`, 'GET')
}

export function submitVote(input: {
  round_id: string
  user_id: string
  session_token: string
  story_id: string
}) {
  return request('/api/votes', 'POST', input)
}

export function listVotes(roundId: string) {
  return request<VoteSummary[]>(`/api/rounds/${roundId}/votes`, 'GET')
}

export function getUserVote(roundId: string, session: SessionState) {
  return request<UserVote>(
    `/api/users/${session.user_id}/rounds/${roundId}/vote?session_token=${session.session_token}`,
    'GET',
  )
}

export function getTopStory(roundId: string) {
  return request<TopStoryResult>(`/api/rounds/${roundId}/top-story`, 'GET')
}

export function submitTruthSet(input: {
  round_id: string
  user_id: string
  session_token: string
  statements: string[]
  true_statement_index: number
}) {
  return request<TruthSet>('/api/three-lies/truth-sets', 'POST', input)
}

export function submitTruthSetVote(input: {
  round_id: string
  user_id: string
  session_token: string
  truth_set_id: string
  selected_statement_index: number
}) {
  return request<TruthSetVote>('/api/three-lies/votes', 'POST', input)
}

export function sessionFromRoomState(state: AuthenticatedRoomState): SessionState {
  const currentUser = state.users.find((user) => user.id === state.session.user_id)

  return {
    roomCode: state.room.code,
    user_id: state.session.user_id,
    session_token: state.session.session_token,
    nickname: currentUser?.nickname ?? 'Player',
    isHost: currentUser?.is_host ?? false,
  }
}

export { API_BASE_URL }
