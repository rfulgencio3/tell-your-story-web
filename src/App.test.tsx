import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { defaultAvatarUrl } from './lib/avatar-options'
import type { AuthenticatedRoomState, RoomState, SessionState, TopStoryResult } from './types'

const {
  MockApiError,
  createRoomMock,
  getRoomMock,
  getTopStoryMock,
  joinRoomMock,
  leaveRoomMock,
  listStoriesMock,
  listVotesMock,
  nextRoundMock,
  pauseRoomMock,
  startRoomMock,
  submitStoryMock,
  submitVoteMock,
  getUserVoteMock,
  loadSessionMock,
  saveSessionMock,
  clearSessionMock,
} = vi.hoisted(() => {
  class HoistedApiError extends Error {
    status: number
    code?: string

    constructor(message: string, status: number, code?: string) {
      super(message)
      this.name = 'ApiError'
      this.status = status
      this.code = code
    }
  }

  return {
    MockApiError: HoistedApiError,
    createRoomMock: vi.fn(),
    getRoomMock: vi.fn(),
    getTopStoryMock: vi.fn(),
    joinRoomMock: vi.fn(),
    leaveRoomMock: vi.fn(),
    listStoriesMock: vi.fn(),
    listVotesMock: vi.fn(),
    nextRoundMock: vi.fn(),
    pauseRoomMock: vi.fn(),
    startRoomMock: vi.fn(),
    submitStoryMock: vi.fn(),
    submitVoteMock: vi.fn(),
    getUserVoteMock: vi.fn(),
    loadSessionMock: vi.fn(),
    saveSessionMock: vi.fn(),
    clearSessionMock: vi.fn(),
  }
})

vi.mock('./api', () => ({
  API_BASE_URL: 'http://localhost:8080',
  ApiError: MockApiError,
  createRoom: createRoomMock,
  getRealtimeUrl: vi.fn(() => 'ws://localhost:8080/ws'),
  getRoom: getRoomMock,
  getTopStory: getTopStoryMock,
  getUserVote: getUserVoteMock,
  joinRoom: joinRoomMock,
  leaveRoom: leaveRoomMock,
  listStories: listStoriesMock,
  listVotes: listVotesMock,
  nextRound: nextRoundMock,
  pauseRoom: pauseRoomMock,
  sessionFromRoomState: (state: AuthenticatedRoomState) => {
    const currentUser = state.users.find((user) => user.id === state.session.user_id)

    return {
      roomCode: state.room.code,
      user_id: state.session.user_id,
      session_token: state.session.session_token,
      nickname: currentUser?.nickname ?? 'Player',
      isHost: currentUser?.is_host ?? false,
    }
  },
  startRoom: startRoomMock,
  submitStory: submitStoryMock,
  submitVote: submitVoteMock,
}))

vi.mock('./storage', () => ({
  loadSession: loadSessionMock,
  saveSession: saveSessionMock,
  clearSession: clearSessionMock,
}))

function buildRoomState(overrides?: Partial<RoomState>): RoomState {
  return {
    room: {
      id: 'room-1',
      code: 'ABCD12',
      host_id: 'user-1',
      max_rounds: 3,
      time_per_round: 120,
      status: 'waiting',
      created_at: '2026-03-27T10:00:00Z',
      expires_at: '2026-03-27T12:00:00Z',
    },
    users: [
      {
        id: 'user-1',
        room_id: 'room-1',
        nickname: 'Ricardo',
        avatar_url: '',
        is_host: true,
        created_at: '2026-03-27T10:00:00Z',
      },
      {
        id: 'user-2',
        room_id: 'room-1',
        nickname: 'Ana',
        avatar_url: '',
        is_host: false,
        created_at: '2026-03-27T10:01:00Z',
      },
    ],
    current_round: null,
    ...overrides,
  }
}

function buildAuthenticatedRoomState(overrides?: Partial<AuthenticatedRoomState>): AuthenticatedRoomState {
  const base = buildRoomState()

  return {
    ...base,
    session: {
      user_id: 'user-1',
      session_token: 'token-123',
    },
    ...overrides,
  }
}

function buildSession(): SessionState {
  return {
    roomCode: 'ABCD12',
    user_id: 'user-1',
    session_token: 'token-123',
    nickname: 'Ricardo',
    isHost: true,
  }
}

function buildWinner(): TopStoryResult {
  return {
    story: {
      id: 'story-1',
      round_id: 'round-1',
      user_id: 'user-2',
      title: 'A montanha',
      body: 'Uma trilha virou aventura.',
      is_revealed: true,
      created_at: '2026-03-27T10:05:00Z',
    },
    author: {
      id: 'user-2',
      room_id: 'room-1',
      nickname: 'Ana',
      avatar_url: '',
      is_host: false,
      created_at: '2026-03-27T10:01:00Z',
    },
    vote_count: 2,
  }
}

describe('App', () => {
  beforeEach(() => {
    loadSessionMock.mockReturnValue(null)
    createRoomMock.mockReset()
    getRoomMock.mockReset()
    getTopStoryMock.mockReset()
    joinRoomMock.mockReset()
    leaveRoomMock.mockReset()
    listStoriesMock.mockReset()
    listVotesMock.mockReset()
    nextRoundMock.mockReset()
    pauseRoomMock.mockReset()
    startRoomMock.mockReset()
    submitStoryMock.mockReset()
    submitVoteMock.mockReset()
    getUserVoteMock.mockReset()
    saveSessionMock.mockReset()
    clearSessionMock.mockReset()
    getRoomMock.mockResolvedValue(buildRoomState())
  })

  it('cria uma sala e mostra a sessao autenticada', async () => {
    createRoomMock.mockResolvedValue(buildAuthenticatedRoomState())

    render(<App />)

    const createForm = screen.getByRole('heading', { name: 'Criar sala' }).closest('form')
    if (!createForm) {
      throw new Error('Create form not found')
    }

    fireEvent.change(within(createForm).getByLabelText('Seu nome'), { target: { value: 'Ricardo' } })
    fireEvent.click(within(createForm).getByRole('button', { name: 'Criar sala' }))

    await waitFor(() => {
      expect(createRoomMock).toHaveBeenCalledWith({
        host_nickname: 'Ricardo',
        host_avatar_url: defaultAvatarUrl,
        max_rounds: 3,
        time_per_round: 120,
      })
    })

    expect(await screen.findByText('Seu codigo randomico ja esta pronto.')).toBeInTheDocument()
    const shareDialog = screen.getByRole('dialog', { name: 'Seu codigo randomico ja esta pronto.' })
    expect(within(shareDialog).getByRole('button', { name: 'Copiar codigo' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Iniciar jogo' })).toBeInTheDocument()
    expect(saveSessionMock).toHaveBeenCalled()
  })

  it('entra em uma sala usando o codigo em uppercase', async () => {
    joinRoomMock.mockResolvedValue(buildAuthenticatedRoomState())

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Entrar em sala' }))

    const joinForm = screen.getByRole('heading', { name: 'Entrar em sala' }).closest('form')
    if (!joinForm) {
      throw new Error('Join form not found')
    }

    const [roomCodeInput, nicknameInput] = within(joinForm).getAllByRole('textbox')
    fireEvent.change(roomCodeInput, { target: { value: 'abcd12' } })
    fireEvent.change(nicknameInput, { target: { value: 'Ana' } })
    fireEvent.click(within(joinForm).getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      expect(joinRoomMock).toHaveBeenCalledWith('ABCD12', {
        nickname: 'Ana',
        avatar_url: defaultAvatarUrl,
      })
    })

    expect(await screen.findByRole('button', { name: 'Iniciar jogo' })).toBeInTheDocument()
    expect(saveSessionMock).toHaveBeenCalled()
  })

  it('restaura a sessao salva e carrega a sala', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(buildRoomState())

    render(<App />)

    await waitFor(() => {
      expect(getRoomMock).toHaveBeenCalledWith('ABCD12')
    })

    expect(await screen.findByText('Sessao restaurada com sucesso.')).toBeInTheDocument()
    expect(screen.getAllByText('Ricardo').length).toBeGreaterThan(0)
  })

  it('renderiza o estado de votacao com historias carregadas', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          status: 'active',
        },
        current_round: {
          id: 'round-1',
          room_id: 'room-1',
          round_number: 1,
          status: 'voting',
          started_at: '2026-03-27T10:00:00Z',
          phase_ends_at: '2026-03-27T10:02:00Z',
          paused_at: null,
          completed_at: null,
        },
      }),
    )
    listStoriesMock.mockResolvedValue([
      {
        id: 'story-1',
        round_id: 'round-1',
        title: 'A montanha',
        body: 'Uma trilha virou aventura.',
        is_revealed: false,
        vote_count: 1,
        created_at: '2026-03-27T10:05:00Z',
      },
    ])
    listVotesMock.mockResolvedValue([{ story_id: 'story-1', vote_count: 1 }])
    getUserVoteMock.mockRejectedValue(new MockApiError('Not found', 404))

    render(<App />)

    expect(await screen.findByText('A montanha')).toBeInTheDocument()
    expect(screen.getAllByText('Fase de votacao').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Avancar para revelacao' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Votar nesta historia' })).toBeInTheDocument()
  })

  it('renderiza a vencedora quando a rodada esta revelada', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          status: 'active',
        },
        current_round: {
          id: 'round-1',
          room_id: 'room-1',
          round_number: 1,
          status: 'revealed',
          started_at: '2026-03-27T10:00:00Z',
          phase_ends_at: null,
          paused_at: null,
          completed_at: '2026-03-27T10:03:00Z',
        },
      }),
    )
    listStoriesMock.mockResolvedValue([
      {
        id: 'story-1',
        round_id: 'round-1',
        title: 'A montanha',
        body: 'Uma trilha virou aventura.',
        is_revealed: true,
        vote_count: 2,
        created_at: '2026-03-27T10:05:00Z',
      },
    ])
    listVotesMock.mockResolvedValue([{ story_id: 'story-1', vote_count: 2 }])
    getUserVoteMock.mockRejectedValue(new MockApiError('Not found', 404))
    getTopStoryMock.mockResolvedValue(buildWinner())

    render(<App />)

    expect(await screen.findByText('Vencedora')).toBeInTheDocument()
    expect(screen.getAllByText('A montanha').length).toBeGreaterThan(0)
    expect(screen.getByText('por Ana com 2 voto(s)')).toBeInTheDocument()
  })

  it('limpa a sessao local quando a sala expira', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          status: 'expired',
        },
      }),
    )

    render(<App />)

    expect(await screen.findByText('A sala expirou.')).toBeInTheDocument()
    expect(screen.getByText('Sua sessao local foi encerrada. Use o codigo da sala para entrar novamente.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma sessao ativa')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar em sala' })).toHaveClass('active')
    expect(screen.getByDisplayValue('ABCD12')).toBeInTheDocument()
    expect(clearSessionMock).toHaveBeenCalled()
  })
})
