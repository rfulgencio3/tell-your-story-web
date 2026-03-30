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
  submitTruthSetMock,
  submitTruthSetVoteMock,
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
    submitTruthSetMock: vi.fn(),
    submitTruthSetVoteMock: vi.fn(),
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
  submitTruthSet: submitTruthSetMock,
  submitTruthSetVote: submitTruthSetVoteMock,
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
      game_type: 'tell-your-story',
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
    submitTruthSetMock.mockReset()
    submitTruthSetVoteMock.mockReset()
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

    fireEvent.change(within(createForm).getByLabelText('Nickname'), { target: { value: 'Ricardo' } })
    fireEvent.click(within(createForm).getByRole('button', { name: 'Criar sala' }))

    await waitFor(() => {
      expect(createRoomMock).toHaveBeenCalledWith({
        host_nickname: 'Ricardo',
        host_avatar_url: defaultAvatarUrl,
        game_type: 'tell-your-story',
        max_rounds: 3,
        time_per_round: 120,
      })
    })

    expect(await screen.findByText('Seu codigo da sala ja esta pronto.')).toBeInTheDocument()
    const shareDialog = screen.getByRole('dialog', { name: 'Seu codigo da sala ja esta pronto.' })
    expect(within(shareDialog).getByRole('button', { name: 'Copiar codigo' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Iniciar jogo' })).toBeInTheDocument()
    expect(saveSessionMock).toHaveBeenCalled()
  })

  it('cria uma sala em three-lies-one-truth com o game_type correto', async () => {
    createRoomMock.mockResolvedValue(
      buildAuthenticatedRoomState({
        room: {
          ...buildRoomState().room,
          game_type: 'three-lies-one-truth',
        },
      }),
    )

    render(<App />)

    const createForm = screen.getByRole('heading', { name: 'Criar sala' }).closest('form')
    if (!createForm) {
      throw new Error('Create form not found')
    }

    fireEvent.change(within(createForm).getByLabelText('Nickname'), { target: { value: 'Ricardo' } })
    fireEvent.click(within(createForm).getByRole('button', { name: /Three Lies, One Truth/i }))
    fireEvent.click(within(createForm).getByRole('button', { name: 'Criar sala' }))

    await waitFor(() => {
      expect(createRoomMock).toHaveBeenCalledWith({
        host_nickname: 'Ricardo',
        host_avatar_url: defaultAvatarUrl,
        game_type: 'three-lies-one-truth',
        max_rounds: 3,
        time_per_round: 120,
      })
    })
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
          active_truth_set_id: null,
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
          active_truth_set_id: null,
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
    expect(screen.getByRole('heading', { name: 'Entrar em sala' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar em sala' })).toHaveClass('active')
    expect(screen.getByDisplayValue('ABCD12')).toBeInTheDocument()
    expect(clearSessionMock).toHaveBeenCalled()
  })

  it('renderiza o writing de three-lies-one-truth e envia afirmacoes', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          game_type: 'three-lies-one-truth',
          status: 'active',
        },
        current_round: {
          id: 'round-1',
          room_id: 'room-1',
          round_number: 1,
          status: 'writing',
          active_truth_set_id: null,
          started_at: '2026-03-27T10:00:00Z',
          phase_ends_at: '2026-03-27T10:02:00Z',
          paused_at: null,
          completed_at: null,
        },
      }),
    )
    submitTruthSetMock.mockResolvedValue({
      id: 'truth-set-1',
      room_id: 'room-1',
      round_id: 'round-1',
      author_user_id: 'user-1',
      presentation_order: 0,
      true_statement_index: 2,
      created_at: '2026-03-27T10:00:30Z',
      updated_at: '2026-03-27T10:00:30Z',
      statements: [
        { id: 'ts-1', truth_set_id: 'truth-set-1', statement_index: 1, content: 'A', created_at: '', updated_at: '' },
        { id: 'ts-2', truth_set_id: 'truth-set-1', statement_index: 2, content: 'B', created_at: '', updated_at: '' },
        { id: 'ts-3', truth_set_id: 'truth-set-1', statement_index: 3, content: 'C', created_at: '', updated_at: '' },
        { id: 'ts-4', truth_set_id: 'truth-set-1', statement_index: 4, content: 'D', created_at: '', updated_at: '' },
      ],
    })

    render(<App />)

    expect(await screen.findByText('Escreva 4 afirmacoes e esconda a verdade.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Escreva a afirmacao 1'), { target: { value: 'A' } })
    fireEvent.change(screen.getByPlaceholderText('Escreva a afirmacao 2'), { target: { value: 'B' } })
    fireEvent.change(screen.getByPlaceholderText('Escreva a afirmacao 3'), { target: { value: 'C' } })
    fireEvent.change(screen.getByPlaceholderText('Escreva a afirmacao 4'), { target: { value: 'D' } })
    fireEvent.click(screen.getAllByRole('radio')[1])
    fireEvent.click(screen.getByRole('button', { name: 'Enviar afirmacoes' }))

    await waitFor(() => {
      expect(submitTruthSetMock).toHaveBeenCalledWith({
        round_id: 'round-1',
        user_id: 'user-1',
        session_token: 'token-123',
        statements: ['A', 'B', 'C', 'D'],
        true_statement_index: 2,
      })
    })
  })

  it('renderiza presentation_voting e envia o voto no three-lies-one-truth', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          game_type: 'three-lies-one-truth',
          status: 'active',
        },
        current_round: {
          id: 'round-1',
          room_id: 'room-1',
          round_number: 1,
          status: 'presentation_voting',
          active_truth_set_id: 'truth-set-1',
          started_at: '2026-03-27T10:00:00Z',
          phase_ends_at: '2026-03-27T10:02:00Z',
          paused_at: null,
          completed_at: null,
        },
        three_lies: {
          active_truth_set: {
            id: 'truth-set-1',
            room_id: 'room-1',
            round_id: 'round-1',
            author_user_id: 'user-2',
            presentation_order: 1,
            true_statement_index: 3,
            created_at: '2026-03-27T10:00:30Z',
            updated_at: '2026-03-27T10:00:30Z',
            statements: [
              { id: 'ts-1', truth_set_id: 'truth-set-1', statement_index: 1, content: 'A', created_at: '', updated_at: '' },
              { id: 'ts-2', truth_set_id: 'truth-set-1', statement_index: 2, content: 'B', created_at: '', updated_at: '' },
              { id: 'ts-3', truth_set_id: 'truth-set-1', statement_index: 3, content: 'C', created_at: '', updated_at: '' },
              { id: 'ts-4', truth_set_id: 'truth-set-1', statement_index: 4, content: 'D', created_at: '', updated_at: '' },
            ],
          },
          voting_progress: {
            eligible_voters: 1,
            submitted_votes: 0,
          },
        },
      }),
    )
    submitTruthSetVoteMock.mockResolvedValue({
      id: 'vote-1',
      room_id: 'room-1',
      round_id: 'round-1',
      truth_set_id: 'truth-set-1',
      user_id: 'user-1',
      selected_statement_index: 3,
      created_at: '2026-03-27T10:01:00Z',
      updated_at: '2026-03-27T10:01:00Z',
    })

    render(<App />)

    expect(await screen.findByText('Uma pessoa conta quatro versoes da mesma historia.')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar como verdade' })[2])

    await waitFor(() => {
      expect(submitTruthSetVoteMock).toHaveBeenCalledWith({
        round_id: 'round-1',
        user_id: 'user-1',
        session_token: 'token-123',
        truth_set_id: 'truth-set-1',
        selected_statement_index: 3,
      })
    })
  })

  it('bloqueia o voto quando o usuario e o autor da apresentacao atual', async () => {
    loadSessionMock.mockReturnValue(buildSession())
    getRoomMock.mockResolvedValue(
      buildRoomState({
        room: {
          ...buildRoomState().room,
          game_type: 'three-lies-one-truth',
          status: 'active',
        },
        current_round: {
          id: 'round-1',
          room_id: 'room-1',
          round_number: 1,
          status: 'presentation_voting',
          active_truth_set_id: 'truth-set-1',
          started_at: '2026-03-27T10:00:00Z',
          phase_ends_at: '2026-03-27T10:02:00Z',
          paused_at: null,
          completed_at: null,
        },
        three_lies: {
          active_truth_set: {
            id: 'truth-set-1',
            room_id: 'room-1',
            round_id: 'round-1',
            author_user_id: 'user-1',
            presentation_order: 1,
            true_statement_index: 3,
            created_at: '2026-03-27T10:00:30Z',
            updated_at: '2026-03-27T10:00:30Z',
            statements: [
              { id: 'ts-1', truth_set_id: 'truth-set-1', statement_index: 1, content: 'A', created_at: '', updated_at: '' },
              { id: 'ts-2', truth_set_id: 'truth-set-1', statement_index: 2, content: 'B', created_at: '', updated_at: '' },
              { id: 'ts-3', truth_set_id: 'truth-set-1', statement_index: 3, content: 'C', created_at: '', updated_at: '' },
              { id: 'ts-4', truth_set_id: 'truth-set-1', statement_index: 4, content: 'D', created_at: '', updated_at: '' },
            ],
          },
          voting_progress: {
            eligible_voters: 1,
            submitted_votes: 0,
          },
        },
      }),
    )

    render(<App />)

    expect(await screen.findByText('Voce e o autor dessa historia, aguarde a votacao dos outros jogadores.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Bloqueado para o autor' })[0]).toBeDisabled()
  })
})
