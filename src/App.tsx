import {
  type FormEvent,
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from 'react'
import {
  API_BASE_URL,
  ApiError,
  createRoom,
  getRealtimeUrl,
  getRoom,
  getTopStory,
  getUserVote,
  joinRoom,
  leaveRoom,
  listStories,
  listVotes,
  nextRound,
  pauseRoom,
  sessionFromRoomState,
  startRoom,
  submitStory,
  submitVote,
} from './api'
import { clearSession, loadSession, saveSession } from './storage'
import type {
  ProgressPayload,
  RealtimeEnvelope,
  RoomState,
  SessionState,
  StoryCard,
  TopStoryResult,
  User,
  UserVote,
  VoteSummary,
} from './types'

const initialCreateForm = {
  hostNickname: '',
  hostAvatarUrl: '',
  maxRounds: 3,
  timePerRound: 120,
}

const initialJoinForm = {
  roomCode: '',
  nickname: '',
  avatarUrl: '',
}

const initialStoryForm = {
  title: '',
  body: '',
}

type RealtimeStatus = 'offline' | 'connecting' | 'connected'

export default function App() {
  const [session, setSession] = useState<SessionState | null>(() => loadSession())
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [storyCards, setStoryCards] = useState<StoryCard[]>([])
  const [voteSummaries, setVoteSummaries] = useState<VoteSummary[]>([])
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [topStory, setTopStory] = useState<TopStoryResult | null>(null)
  const [storyProgress, setStoryProgress] = useState<ProgressPayload | null>(null)
  const [voteProgress, setVoteProgress] = useState<ProgressPayload | null>(null)
  const [activityFeed, setActivityFeed] = useState<string[]>([])
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [joinForm, setJoinForm] = useState(initialJoinForm)
  const [storyForm, setStoryForm] = useState(initialStoryForm)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('offline')
  const [now, setNow] = useState(() => Date.now())
  const [submittedStoryRounds, setSubmittedStoryRounds] = useState<string[]>([])

  const currentRound = roomState?.current_round ?? null
  const currentUser =
    roomState && session
      ? roomState.users.find((user) => user.id === session.user_id) ?? null
      : null
  const isHost = currentUser?.is_host ?? session?.isHost ?? false
  const hasSubmittedStory = currentRound ? submittedStoryRounds.includes(currentRound.id) : false
  const hasVoted = currentRound ? userVote?.round_id === currentRound.id : false

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (session) {
      saveSession(session)
      return
    }

    clearSession()
  }, [session])

  useEffect(() => {
    if (!session) {
      setRoomState(null)
      setStoryCards([])
      setVoteSummaries([])
      setUserVote(null)
      setTopStory(null)
      setStoryProgress(null)
      setVoteProgress(null)
      setRealtimeStatus('offline')
      return
    }

    let cancelled = false
    setBusyAction('restore-room')

    void getRoom(session.roomCode)
      .then((state) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setRoomState(state)
          setErrorMessage(null)
          setNotice('Sessao restaurada com sucesso.')
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        handleApiError(error, 'Nao foi possivel restaurar a sala.', true)
      })
      .finally(() => {
        if (!cancelled) {
          setBusyAction((current) => (current === 'restore-room' ? null : current))
        }
      })

    return () => {
      cancelled = true
    }
  }, [session?.roomCode, session?.user_id, session?.session_token])

  const pushActivity = useEffectEvent((message: string) => {
    const stamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    startTransition(() => {
      setActivityFeed((current) => [`${stamp} - ${message}`, ...current].slice(0, 8))
    })
  })

  const handleRealtimeEvent = useEffectEvent((event: RealtimeEnvelope) => {
    switch (event.type) {
      case 'room.state':
        startTransition(() => {
          setRoomState(event.data as RoomState)
        })
        break
      case 'story.progress':
        startTransition(() => {
          setStoryProgress(event.data as ProgressPayload)
        })
        break
      case 'vote.progress':
        startTransition(() => {
          setVoteProgress(event.data as ProgressPayload)
        })
        break
      case 'round.revealed':
        startTransition(() => {
          setTopStory(event.data as TopStoryResult)
        })
        pushActivity('A historia vencedora foi revelada.')
        break
      case 'presence.joined': {
        const payload = event.data as { nickname?: string }
        pushActivity(`${payload.nickname ?? 'Alguem'} entrou na sala.`)
        break
      }
      case 'presence.left': {
        const payload = event.data as { nickname?: string }
        pushActivity(`${payload.nickname ?? 'Alguem'} saiu da sala.`)
        break
      }
      case 'connection.ready':
        pushActivity('Canal realtime conectado.')
        break
      case 'room.expired':
        pushActivity('A sala expirou.')
        setErrorMessage('A sala expirou.')
        break
      case 'error': {
        const payload = event.data as { message?: string }
        setErrorMessage(payload.message ?? 'Falha no canal realtime.')
        break
      }
      default:
        break
    }
  })

  useEffect(() => {
    if (!session) {
      return
    }

    setRealtimeStatus('connecting')
    const socket = new WebSocket(getRealtimeUrl(session))

    socket.onopen = () => {
      setRealtimeStatus('connected')
      socket.send(JSON.stringify({ type: 'room.sync' }))
      socket.send(JSON.stringify({ type: 'story.progress.request' }))
      socket.send(JSON.stringify({ type: 'vote.progress.request' }))
    }

    socket.onmessage = (message) => {
      try {
        handleRealtimeEvent(JSON.parse(message.data) as RealtimeEnvelope)
      } catch {
        setErrorMessage('Falha ao processar evento realtime.')
      }
    }

    socket.onerror = () => {
      setRealtimeStatus('offline')
    }

    socket.onclose = () => {
      setRealtimeStatus('offline')
    }

    return () => {
      socket.close()
    }
  }, [session?.roomCode, session?.user_id, session?.session_token])

  useEffect(() => {
    if (!session || !currentRound) {
      setStoryCards([])
      setVoteSummaries([])
      setUserVote(null)
      setTopStory(null)
      return
    }

    if (currentRound.status === 'writing') {
      setStoryCards([])
      setVoteSummaries([])
      setUserVote(null)
      setTopStory(null)
      return
    }

    let cancelled = false

    void Promise.all([listStories(currentRound.id), listVotes(currentRound.id)])
      .then(([stories, votes]) => {
        if (cancelled) {
          return
        }
        startTransition(() => {
          setStoryCards(stories)
          setVoteSummaries(votes)
        })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          handleApiError(error, 'Nao foi possivel carregar historias e votos.')
        }
      })

    void getUserVote(currentRound.id, session)
      .then((vote) => {
        if (!cancelled) {
          setUserVote(vote)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setUserVote(null)
          return
        }
        handleApiError(error, 'Nao foi possivel carregar seu voto.')
      })

    return () => {
      cancelled = true
    }
  }, [currentRound?.id, currentRound?.status, session?.user_id, session?.session_token])

  function resetFeedback() {
    setErrorMessage(null)
    setNotice(null)
  }

  function handleApiError(error: unknown, fallbackMessage: string, clearCurrentSession = false) {
    if (error instanceof ApiError) {
      if (error.status === 401 || clearCurrentSession) {
        setSession(null)
        setRoomState(null)
      }

      setErrorMessage(error.message)
      return
    }

    setErrorMessage(fallbackMessage)
  }

  async function onCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()
    setBusyAction('create-room')

    try {
      const state = await createRoom({
        host_nickname: createForm.hostNickname,
        host_avatar_url: createForm.hostAvatarUrl,
        max_rounds: createForm.maxRounds,
        time_per_round: createForm.timePerRound,
      })
      const nextSession = sessionFromRoomState(state)
      setSession(nextSession)
      setRoomState(state)
      setJoinForm((current) => ({ ...current, roomCode: state.room.code }))
      setCreateForm(initialCreateForm)
      setNotice(`Sala ${state.room.code} criada. Compartilhe o codigo com o grupo.`)
      pushActivity('Sala criada e sessao autenticada.')
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel criar a sala.')
    } finally {
      setBusyAction(null)
    }
  }

  async function onJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetFeedback()
    setBusyAction('join-room')

    try {
      const state = await joinRoom(joinForm.roomCode.trim().toUpperCase(), {
        nickname: joinForm.nickname,
        avatar_url: joinForm.avatarUrl,
      })
      const nextSession = sessionFromRoomState(state)
      setSession(nextSession)
      setRoomState(state)
      setJoinForm(initialJoinForm)
      setNotice(`Voce entrou na sala ${state.room.code}.`)
      pushActivity('Entrada na sala concluida.')
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel entrar na sala.')
    } finally {
      setBusyAction(null)
    }
  }

  async function runRoomAction(action: 'start' | 'pause' | 'advance' | 'refresh' | 'leave' | 'reveal') {
    if (!session) {
      return
    }

    resetFeedback()
    setBusyAction(action)

    try {
      if (action === 'refresh') {
        const state = await getRoom(session.roomCode)
        setRoomState(state)
        setNotice('Estado da sala atualizado.')
        return
      }

      if (action === 'leave') {
        await leaveRoom(session)
        setSession(null)
        setNotice('Voce saiu da sala.')
        return
      }

      if (action === 'reveal' && currentRound) {
        const winner = await getTopStory(currentRound.id)
        setTopStory(winner)
        setNotice('Historia vencedora carregada.')
        return
      }

      let nextState: RoomState
      if (action === 'start') {
        nextState = await startRoom(session)
      } else if (action === 'pause') {
        nextState = await pauseRoom(session)
      } else {
        nextState = await nextRound(session)
      }

      setRoomState(nextState)
      if (action === 'start') {
        setNotice('Rodada iniciada.')
      }
      if (action === 'pause') {
        setNotice('Estado de pausa atualizado.')
      }
      if (action === 'advance') {
        setNotice('Sala avancou para a proxima fase.')
      }
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel concluir a acao.')
    } finally {
      setBusyAction(null)
    }
  }

  async function onSubmitStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !currentRound) {
      return
    }

    resetFeedback()
    setBusyAction('submit-story')

    try {
      await submitStory({
        round_id: currentRound.id,
        user_id: session.user_id,
        session_token: session.session_token,
        title: storyForm.title,
        body: storyForm.body,
      })
      setSubmittedStoryRounds((current) =>
        current.includes(currentRound.id) ? current : [...current, currentRound.id],
      )
      setStoryForm(initialStoryForm)
      setNotice('Historia enviada com sucesso.')
      pushActivity('Sua historia foi enviada.')
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'story_already_submitted') {
        setSubmittedStoryRounds((current) =>
          current.includes(currentRound.id) ? current : [...current, currentRound.id],
        )
      }
      handleApiError(error, 'Nao foi possivel enviar a historia.')
    } finally {
      setBusyAction(null)
    }
  }

  async function onVote(storyId: string) {
    if (!session || !currentRound) {
      return
    }

    resetFeedback()
    setBusyAction(`vote-${storyId}`)

    try {
      await submitVote({
        round_id: currentRound.id,
        user_id: session.user_id,
        session_token: session.session_token,
        story_id: storyId,
      })
      setUserVote({
        round_id: currentRound.id,
        story_id: storyId,
        user_id: session.user_id,
      })
      const votes = await listVotes(currentRound.id)
      setVoteSummaries(votes)
      setNotice('Voto registrado com sucesso.')
      pushActivity('Seu voto foi enviado.')
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel registrar o voto.')
    } finally {
      setBusyAction(null)
    }
  }

  const phaseEndsIn = currentRound?.phase_ends_at
    ? formatTimeRemaining(currentRound.phase_ends_at, now)
    : 'Sem cronometro'
  const storyVoteMap = Object.fromEntries(voteSummaries.map((vote) => [vote.story_id, vote.vote_count]))

  return (
    <main className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tell Your Story</p>
          <h1>Lobby, rodada e realtime conectados ao backend Go.</h1>
        </div>
        <div className="topbar-meta">
          <StatusPill label={`API ${API_BASE_URL}`} tone="neutral" />
          <StatusPill
            label={`Realtime ${realtimeStatus}`}
            tone={realtimeStatus === 'connected' ? 'success' : 'warning'}
          />
        </div>
      </header>

      {(errorMessage || notice) && (
        <section className="banner-stack">
          {errorMessage ? <div className="banner error">{errorMessage}</div> : null}
          {notice ? <div className="banner success">{notice}</div> : null}
        </section>
      )}

      <section className="layout-grid">
        <aside className="panel auth-panel">
          <div className="panel-header">
            <span>Entrada</span>
            <strong>Criar ou entrar em uma sala</strong>
          </div>

          <form className="stack-form" onSubmit={onCreateRoom}>
            <h2>Criar sala</h2>
            <label>
              <span>Seu nome</span>
              <input
                value={createForm.hostNickname}
                onChange={(event) => setCreateForm((current) => ({ ...current, hostNickname: event.target.value }))}
                placeholder="Ricardo"
                required
              />
            </label>
            <label>
              <span>Avatar URL</span>
              <input
                value={createForm.hostAvatarUrl}
                onChange={(event) => setCreateForm((current) => ({ ...current, hostAvatarUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <div className="inline-fields">
              <label>
                <span>Rodadas</span>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={createForm.maxRounds}
                  onChange={(event) => setCreateForm((current) => ({ ...current, maxRounds: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>Tempo (s)</span>
                <input
                  type="number"
                  min={60}
                  max={300}
                  value={createForm.timePerRound}
                  onChange={(event) => setCreateForm((current) => ({ ...current, timePerRound: Number(event.target.value) }))}
                />
              </label>
            </div>
            <button type="submit" disabled={busyAction === 'create-room'}>
              {busyAction === 'create-room' ? 'Criando...' : 'Criar sala'}
            </button>
          </form>

          <form className="stack-form muted-form" onSubmit={onJoinRoom}>
            <h2>Entrar em sala</h2>
            <label>
              <span>Codigo da sala</span>
              <input
                value={joinForm.roomCode}
                onChange={(event) => setJoinForm((current) => ({ ...current, roomCode: event.target.value.toUpperCase() }))}
                placeholder="ABCD12"
                required
              />
            </label>
            <label>
              <span>Seu nome</span>
              <input
                value={joinForm.nickname}
                onChange={(event) => setJoinForm((current) => ({ ...current, nickname: event.target.value }))}
                placeholder="Ana"
                required
              />
            </label>
            <label>
              <span>Avatar URL</span>
              <input
                value={joinForm.avatarUrl}
                onChange={(event) => setJoinForm((current) => ({ ...current, avatarUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <button type="submit" className="secondary" disabled={busyAction === 'join-room'}>
              {busyAction === 'join-room' ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </aside>

        <section className="workspace">
          <article className="panel room-panel">
            <div className="panel-header">
              <span>Sala atual</span>
              <strong>{roomState ? roomState.room.code : 'Nenhuma sessao ativa'}</strong>
            </div>

            {session && roomState ? (
              <>
                <div className="room-overview">
                  <div>
                    <p className="metric-label">Jogador</p>
                    <strong>{currentUser?.nickname ?? session.nickname}</strong>
                  </div>
                  <div>
                    <p className="metric-label">Status</p>
                    <strong>{roomState.room.status}</strong>
                  </div>
                  <div>
                    <p className="metric-label">Rodada</p>
                    <strong>
                      {currentRound ? `${currentRound.round_number}/${roomState.room.max_rounds}` : 'Ainda nao iniciou'}
                    </strong>
                  </div>
                  <div>
                    <p className="metric-label">Fase encerra em</p>
                    <strong>{phaseEndsIn}</strong>
                  </div>
                </div>

                <div className="action-row">
                  <button type="button" onClick={() => void runRoomAction('refresh')} disabled={busyAction === 'refresh'}>
                    Atualizar
                  </button>
                  {isHost && (roomState.room.status === 'waiting' || roomState.room.status === 'paused') ? (
                    <button type="button" onClick={() => void runRoomAction('start')} disabled={busyAction === 'start'}>
                      {roomState.room.status === 'paused' ? 'Retomar rodada' : 'Iniciar jogo'}
                    </button>
                  ) : null}
                  {isHost && roomState.room.status === 'active' ? (
                    <button type="button" onClick={() => void runRoomAction('pause')} disabled={busyAction === 'pause'}>
                      Pausar
                    </button>
                  ) : null}
                  {isHost && currentRound ? (
                    <button type="button" className="secondary" onClick={() => void runRoomAction('advance')} disabled={busyAction === 'advance'}>
                      Avancar fase
                    </button>
                  ) : null}
                  {isHost && currentRound?.status === 'revealed' ? (
                    <button type="button" className="secondary" onClick={() => void runRoomAction('reveal')} disabled={busyAction === 'reveal'}>
                      Revelar vencedora
                    </button>
                  ) : null}
                  <button type="button" className="ghost" onClick={() => void runRoomAction('leave')} disabled={busyAction === 'leave'}>
                    Sair da sala
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <strong>Crie ou entre em uma sala para iniciar o jogo.</strong>
                <p>Assim que uma sessao for criada, o frontend salva user_id e session_token localmente.</p>
              </div>
            )}
          </article>

          <div className="workspace-grid">
            <article className="panel players-panel">
              <div className="panel-header">
                <span>Participantes</span>
                <strong>{roomState?.users.length ?? 0} conectados</strong>
              </div>
              <div className="user-list">
                {roomState?.users.map((user) => (
                  <UserCard key={user.id} user={user} isCurrentUser={user.id === session?.user_id} />
                ))}
              </div>
            </article>

            <article className="panel round-panel">
              <div className="panel-header">
                <span>Rodada atual</span>
                <strong>{currentRound ? currentRound.status : 'waiting'}</strong>
              </div>

              {currentRound ? (
                <>
                  <div className="progress-grid">
                    <ProgressCard
                      label="Historias enviadas"
                      value={`${storyProgress?.count ?? storyCards.length}/${roomState?.users.length ?? 0}`}
                    />
                    <ProgressCard
                      label="Votos registrados"
                      value={`${voteProgress?.count ?? voteSummaries.reduce((sum, vote) => sum + vote.vote_count, 0)}/${Math.max((roomState?.users.length ?? 1) - 1, 1)}`}
                    />
                  </div>

                  {currentRound.status === 'writing' ? (
                    <form className="stack-form" onSubmit={onSubmitStory}>
                      <h2>Envie sua historia</h2>
                      <label>
                        <span>Titulo</span>
                        <input
                          value={storyForm.title}
                          onChange={(event) => setStoryForm((current) => ({ ...current, title: event.target.value }))}
                          placeholder="Aquele dia improvavel"
                          required
                        />
                      </label>
                      <label>
                        <span>Historia</span>
                        <textarea
                          value={storyForm.body}
                          onChange={(event) => setStoryForm((current) => ({ ...current, body: event.target.value }))}
                          placeholder="Conte uma historia curta e memoravel..."
                          rows={5}
                          required
                        />
                      </label>
                      <button type="submit" disabled={busyAction === 'submit-story' || hasSubmittedStory || roomState?.room.status !== 'active'}>
                        {hasSubmittedStory ? 'Historia ja enviada' : busyAction === 'submit-story' ? 'Enviando...' : 'Enviar historia'}
                      </button>
                    </form>
                  ) : (
                    <div className="story-list">
                      {storyCards.length === 0 ? (
                        <div className="empty-state compact">
                          <strong>As historias ainda nao chegaram aqui.</strong>
                          <p>Use Atualizar ou aguarde o realtime sincronizar o painel.</p>
                        </div>
                      ) : null}

                      {storyCards.map((story) => {
                        const isSelected = userVote?.story_id === story.id
                        const voteCount = storyVoteMap[story.id] ?? story.vote_count
                        return (
                          <article key={story.id} className={`story-card${isSelected ? ' selected' : ''}`}>
                            <div className="story-card-header">
                              <strong>{story.title}</strong>
                              <span>{voteCount} voto(s)</span>
                            </div>
                            <p>{story.body}</p>
                            {currentRound.status === 'voting' ? (
                              <button
                                type="button"
                                className="secondary"
                                disabled={hasVoted || busyAction === `vote-${story.id}`}
                                onClick={() => void onVote(story.id)}
                              >
                                {isSelected ? 'Seu voto' : hasVoted ? 'Votacao encerrada para voce' : 'Votar nesta historia'}
                              </button>
                            ) : null}
                          </article>
                        )
                      })}
                    </div>
                  )}

                  {topStory ? (
                    <div className="winner-card">
                      <span>Vencedora</span>
                      <strong>{topStory.story.title}</strong>
                      <p>{topStory.story.body}</p>
                      <small>
                        por {topStory.author.nickname} com {topStory.vote_count} voto(s)
                      </small>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="empty-state compact">
                  <strong>O host ainda nao iniciou a primeira rodada.</strong>
                  <p>Quando a sala sair de waiting, a escrita abre automaticamente.</p>
                </div>
              )}
            </article>
          </div>

          <article className="panel feed-panel">
            <div className="panel-header">
              <span>Atividade</span>
              <strong>Ultimos eventos</strong>
            </div>
            <ul className="activity-list">
              {activityFeed.length === 0 ? <li>Nenhum evento realtime recebido ainda.</li> : null}
              {activityFeed.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </article>
        </section>
      </section>
    </main>
  )
}

function StatusPill({ label, tone }: { label: string; tone: 'neutral' | 'success' | 'warning' }) {
  return <span className={`status-pill ${tone}`}>{label}</span>
}

function UserCard({ user, isCurrentUser }: { user: User; isCurrentUser: boolean }) {
  return (
    <article className={`user-card${isCurrentUser ? ' current' : ''}`}>
      <div>
        <strong>{user.nickname}</strong>
        <p>{user.is_host ? 'Host' : 'Participante'}</p>
      </div>
      {isCurrentUser ? <span>Voce</span> : null}
    </article>
  )
}

function ProgressCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="progress-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function formatTimeRemaining(targetDate: string, now: number) {
  const diffMs = new Date(targetDate).getTime() - now
  if (Number.isNaN(diffMs)) {
    return 'Sem dado'
  }
  if (diffMs <= 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
