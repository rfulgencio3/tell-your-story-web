import { type FormEvent, startTransition, useEffect, useEffectEvent, useState } from 'react'
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
import { ActivityPanel } from './components/ActivityPanel'
import { AuthPanel, type CreateFormState, type JoinFormState } from './components/AuthPanel'
import { BannerStack } from './components/BannerStack'
import { ParticipantsPanel } from './components/ParticipantsPanel'
import { RoomPanel } from './components/RoomPanel'
import { RoundPanel } from './components/RoundPanel'
import { StatusPill } from './components/StatusPill'
import { formatTimeRemaining } from './lib/format'
import { clearSession, loadSession, saveSession } from './storage'
import type {
  ProgressPayload,
  RealtimeEnvelope,
  RoomState,
  SessionState,
  StoryCard,
  TopStoryResult,
  UserVote,
  VoteSummary,
} from './types'

const initialCreateForm: CreateFormState = {
  hostNickname: '',
  hostAvatarUrl: '',
  maxRounds: 3,
  timePerRound: 120,
}

const initialJoinForm: JoinFormState = {
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
  const phaseEndsIn = currentRound?.phase_ends_at
    ? formatTimeRemaining(currentRound.phase_ends_at, now)
    : 'Sem cronometro'
  const currentRoundLabel = currentRound
    ? `${currentRound.round_number}/${roomState?.room.max_rounds ?? 1} - ${currentRound.status}`
    : roomState?.room.status ?? 'waiting'

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

  const clearGameplayPanels = useEffectEvent(() => {
    setStoryCards([])
    setVoteSummaries([])
    setUserVote(null)
    setTopStory(null)
    setStoryProgress(null)
    setVoteProgress(null)
  })

  const pushActivity = useEffectEvent((message: string) => {
    const stamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    startTransition(() => {
      setActivityFeed((current) => [`${stamp} - ${message}`, ...current].slice(0, 8))
    })
  })

  const handleApiError = useEffectEvent(
    (error: unknown, fallbackMessage: string, clearCurrentSession = false) => {
      if (error instanceof ApiError) {
        if (error.status === 401 || clearCurrentSession) {
          setSession(null)
          setRoomState(null)
          clearGameplayPanels()
        }

        setErrorMessage(error.message)
        return
      }

      setErrorMessage(fallbackMessage)
    },
  )

  useEffect(() => {
    if (!session) {
      setRoomState(null)
      clearGameplayPanels()
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
        if (!cancelled) {
          handleApiError(error, 'Nao foi possivel restaurar a sala.', true)
        }
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
        if (!cancelled) {
          startTransition(() => {
            setStoryCards(stories)
            setVoteSummaries(votes)
          })
        }
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

  useEffect(() => {
    if (!currentRound || currentRound.status !== 'revealed' || topStory) {
      return
    }

    let cancelled = false
    void getTopStory(currentRound.id)
      .then((winner) => {
        if (!cancelled) {
          setTopStory(winner)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          handleApiError(error, 'Nao foi possivel carregar a historia vencedora.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentRound?.id, currentRound?.status, topStory?.story.id])

  useEffect(() => {
    if (!roomState) {
      return
    }

    if (roomState.room.status === 'finished') {
      setNotice('A partida terminou.')
    }
    if (roomState.room.status === 'expired') {
      setErrorMessage('A sala expirou.')
    }
  }, [roomState?.room.status])

  function resetFeedback() {
    setErrorMessage(null)
    setNotice(null)
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

  async function copyRoomCode() {
    if (!roomState?.room.code || !navigator.clipboard) {
      setNotice(`Codigo da sala: ${roomState?.room.code ?? ''}`)
      return
    }

    try {
      await navigator.clipboard.writeText(roomState.room.code)
      setNotice(`Codigo ${roomState.room.code} copiado.`)
    } catch {
      setNotice(`Codigo da sala: ${roomState.room.code}`)
    }
  }

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

      <BannerStack errorMessage={errorMessage} notice={notice} />

      <section className="layout-grid">
        <AuthPanel
          createForm={createForm}
          joinForm={joinForm}
          busyAction={busyAction}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
          onCreateFormChange={(field, value) => {
            setCreateForm((current) => ({ ...current, [field]: value }))
          }}
          onJoinFormChange={(field, value) => {
            setJoinForm((current) => ({ ...current, [field]: value }))
          }}
        />

        <section className="workspace">
          <RoomPanel
            session={session}
            roomState={roomState}
            currentUser={currentUser}
            currentRoundNumberLabel={currentRoundLabel}
            phaseEndsIn={phaseEndsIn}
            isHost={isHost}
            busyAction={busyAction}
            onRefresh={() => void runRoomAction('refresh')}
            onStart={() => void runRoomAction('start')}
            onPause={() => void runRoomAction('pause')}
            onAdvance={() => void runRoomAction('advance')}
            onReveal={() => void runRoomAction('reveal')}
            onLeave={() => void runRoomAction('leave')}
            onCopyCode={() => void copyRoomCode()}
          />

          <div className="workspace-grid">
            <ParticipantsPanel users={roomState?.users ?? []} currentUserId={session?.user_id} />
            <RoundPanel
              roomState={roomState}
              currentRoundLabel={currentRoundLabel}
              storyProgress={storyProgress}
              voteProgress={voteProgress}
              storyCards={storyCards}
              voteSummaries={voteSummaries}
              userVote={userVote}
              topStory={topStory}
              storyForm={storyForm}
              busyAction={busyAction}
              hasSubmittedStory={hasSubmittedStory}
              hasVoted={hasVoted}
              onStoryFormChange={(field, value) => {
                setStoryForm((current) => ({ ...current, [field]: value }))
              }}
              onSubmitStory={onSubmitStory}
              onVote={(storyId) => void onVote(storyId)}
            />
          </div>

          <ActivityPanel items={activityFeed} />
        </section>
      </section>
    </main>
  )
}
