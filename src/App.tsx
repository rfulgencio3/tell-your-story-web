import { type FormEvent, useEffect, useEffectEvent, useState } from 'react'
import {
  API_BASE_URL,
  ApiError,
  createRoom,
  getRoom,
  getTopStory,
  joinRoom,
  leaveRoom,
  listVotes,
  nextRound,
  pauseRoom,
  sessionFromRoomState,
  startRoom,
  submitStory,
  submitVote,
} from './api'
import { ActivityPanel } from './components/ActivityPanel'
import {
  AuthPanel,
  type CreateFormState,
  type EntryMode,
  type JoinFormState,
} from './components/AuthPanel'
import { BannerStack } from './components/BannerStack'
import { ParticipantsPanel } from './components/ParticipantsPanel'
import { RoomPanel } from './components/RoomPanel'
import { RoundPanel } from './components/RoundPanel'
import { StatusPill } from './components/StatusPill'
import officialLogo from './assets/official-logo.png'
import { useActivityFeed } from './hooks/useActivityFeed'
import { usePersistentSession } from './hooks/usePersistentSession'
import { useRealtime } from './hooks/useRealtime'
import { useRoundData } from './hooks/useRoundData'
import { defaultAvatarUrl } from './lib/avatar-options'
import { formatTimeRemaining } from './lib/format'
import type { RoomState } from './types'

const initialCreateForm: CreateFormState = {
  hostNickname: '',
  hostAvatarUrl: defaultAvatarUrl,
  maxRounds: 3,
  timePerRound: 120,
}

const initialJoinForm: JoinFormState = {
  roomCode: '',
  nickname: '',
  avatarUrl: defaultAvatarUrl,
}

const initialStoryForm = {
  title: '',
  body: '',
}

function generateRoomCodePreview() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const pick = (alphabet: string) => alphabet[Math.floor(Math.random() * alphabet.length)] ?? alphabet[0] ?? ''

  return `${pick(letters)}${pick(letters)}${pick(letters)}${pick(letters)}${pick(digits)}${pick(digits)}`
}

export default function App() {
  const [session, setSession] = usePersistentSession()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>('create')
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [joinForm, setJoinForm] = useState(initialJoinForm)
  const [storyForm, setStoryForm] = useState(initialStoryForm)
  const [roomCodePreview, setRoomCodePreview] = useState(() => generateRoomCodePreview())
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const { activityFeed, pushActivity } = useActivityFeed()
  const currentRound = roomState?.current_round ?? null
  const handleApiError = useEffectEvent(
    (error: unknown, fallbackMessage: string, clearCurrentSession = false) => {
      if (error instanceof ApiError) {
        if (error.status === 401 || clearCurrentSession) {
          setSession(null)
          setRoomState(null)
        }

        setErrorMessage(error.message)
        return
      }

      setErrorMessage(fallbackMessage)
    },
  )

  const {
    storyCards,
    voteSummaries,
    userVote,
    topStory,
    storyProgress,
    voteProgress,
    submittedStoryRounds,
    setUserVote,
    setTopStory,
    setStoryProgress,
    setVoteProgress,
    setVoteSummaries,
    clearAllRoundState,
    markStorySubmitted,
  } = useRoundData({
    session,
    currentRound,
    onApiError: (error, fallbackMessage) => {
      handleApiError(error, fallbackMessage)
    },
  })

  const realtimeStatus = useRealtime({
    session,
    onRoomState: (state) => {
      setRoomState(state)
    },
    onStoryProgress: (payload) => {
      setStoryProgress(payload)
    },
    onVoteProgress: (payload) => {
      setVoteProgress(payload)
    },
    onTopStory: (winner) => {
      setTopStory(winner)
    },
    onError: (message) => {
      setErrorMessage(message)
    },
    onActivity: (message) => {
      pushActivity(message)
    },
  })

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
  const hasLiveRoom = Boolean(session && roomState)
  const heroLabel =
    roomState?.room.status === 'waiting'
      ? 'Lobby da sala'
      : roomState?.room.status === 'paused'
        ? 'Rodada pausada'
        : currentRound?.status === 'writing'
          ? 'Fase de escrita'
          : currentRound?.status === 'voting'
            ? 'Fase de votacao'
            : currentRound?.status === 'revealed'
              ? 'Revelacao'
              : 'TellYourStory'
  const heroTitle =
    roomState?.room.status === 'waiting'
      ? 'Aguardando participantes.'
      : roomState?.room.status === 'paused'
        ? 'Segure o ritmo e retome quando quiser.'
        : currentRound?.status === 'writing'
          ? 'Escreva a melhor historia.'
          : currentRound?.status === 'voting'
            ? 'Vote na melhor historia!'
            : currentRound?.status === 'revealed'
              ? 'E o vencedor e...'
              : 'Sua sala esta pronta.'
  const heroDescription =
    roomState?.room.status === 'waiting'
      ? 'Monte o grupo, compartilhe o codigo e inicie quando todos estiverem prontos.'
      : roomState?.room.status === 'paused'
        ? 'A rodada esta em pausa e o estado atual segue preservado.'
        : currentRound?.status === 'writing'
          ? 'Use o bloco principal para contar sua narrativa antes do tempo acabar.'
          : currentRound?.status === 'voting'
            ? 'As historias aparecem como cards de votacao. Escolha a sua favorita.'
            : currentRound?.status === 'revealed'
              ? 'Confira o destaque da rodada e prepare o proximo tema.'
              : 'Acompanhe o estado da sala, participantes e feed em tempo real.'
  const surfaceNotice =
    notice ??
    (busyAction === 'restore-room' && session && !roomState
      ? 'Restaurando sessao local...'
      : realtimeStatus === 'reconnecting' && session
        ? 'Tentando reconectar o canal realtime...'
        : realtimeStatus === 'connecting' && session
          ? 'Conectando canal realtime...'
          : null)
  const isPageBusy = busyAction !== null
  const shareLink = createdRoomCode
    ? (() => {
        if (typeof window === 'undefined') {
          return `/?room=${createdRoomCode}`
        }

        const url = new URL(window.location.href)
        url.searchParams.set('room', createdRoomCode)
        return url.toString()
      })()
    : ''

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const roomCode = window.location.search ? new URLSearchParams(window.location.search).get('room') : null
    if (!roomCode) {
      return
    }

    setEntryMode('join')
    setJoinForm((current) => ({
      ...current,
      roomCode: roomCode.toUpperCase(),
    }))
  }, [])

  useEffect(() => {
    if (!session) {
      setRoomState(null)
      return
    }

    let cancelled = false
    setBusyAction('restore-room')

    void getRoom(session.roomCode)
      .then((state) => {
        if (cancelled) {
          return
        }

        setRoomState(state)
        setErrorMessage(null)
        setNotice('Sessao restaurada com sucesso.')
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

  useEffect(() => {
    if (!roomState) {
      return
    }

    if (roomState.room.status === 'finished') {
      setNotice('A partida terminou. Voce pode iniciar uma nova sala ou entrar em outra.')
    }

    if (roomState.room.status === 'expired') {
      setErrorMessage('A sala expirou.')
      setNotice('Sua sessao local foi encerrada. Use o codigo da sala para entrar novamente.')
      setEntryMode('join')
      setJoinForm((current) => ({ ...current, roomCode: roomState.room.code }))
      clearAllRoundState()
      setSession(null)
      setRoomState(null)
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

      clearAllRoundState()
      setSession(sessionFromRoomState(state))
      setRoomState(state)
      setCreatedRoomCode(state.room.code)
      setJoinForm((current) => ({ ...current, roomCode: state.room.code }))
      setCreateForm(initialCreateForm)
      setRoomCodePreview(generateRoomCodePreview())
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

      clearAllRoundState()
      setSession(sessionFromRoomState(state))
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
        setRoomState(null)
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

      markStorySubmitted(currentRound.id)
      setStoryForm(initialStoryForm)
      setNotice('Historia enviada com sucesso.')
      pushActivity('Sua historia foi enviada.')
    } catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'story_already_submitted') {
        markStorySubmitted(currentRound.id)
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
      setVoteSummaries(await listVotes(currentRound.id))
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

  async function copyInviteLink() {
    if (!createdRoomCode) {
      return
    }

    if (!navigator.clipboard) {
      setNotice(`Link da sala: ${shareLink}`)
      return
    }

    try {
      await navigator.clipboard.writeText(shareLink)
      setNotice('Link de convite copiado.')
    } catch {
      setNotice(`Link da sala: ${shareLink}`)
    }
  }

  if (!hasLiveRoom) {
    return (
      <main className="entry-page">
        <div className="entry-gradient" />
        <div className="entry-dots" />
        {isPageBusy ? (
          <div className="page-loader" role="status" aria-live="polite">
            <div className="page-loader-spinner" />
            <strong>Processando sua jogada...</strong>
            <span>Preparando sala, sessao e reconexao.</span>
          </div>
        ) : null}

        <section className="entry-shell">
          <header className="entry-branding">
            <div className="logo-stack">
              <img className="logo-mark" src={officialLogo} alt="Tell Your Story" />
            </div>
            <div className="entry-copy">
              <p className="eyebrow">Kinetic Narrative</p>
              <h1>Junte seu grupo e coloque a melhor historia na roda.</h1>
              <p>
                Sala, cronometro, rodada e reveal sincronizados com backend Go em tempo real.
              </p>
            </div>
          </header>

          <BannerStack errorMessage={errorMessage} notice={surfaceNotice} />

          <section className="entry-layout">
            <div className="entry-showcase">
              <div className="showcase-card showcase-card-primary">
                <div className="showcase-card-badge">Lobby vivo</div>
                <strong>Codigo compartilhavel com entrada imediata do grupo.</strong>
                <p>Crie a sala, distribua o codigo e veja os participantes ocupando o lobby em tempo real.</p>
                <div className="showcase-card-foot">
                  <span>Host + participantes</span>
                  <strong>Presenca sincronizada</strong>
                </div>
              </div>
              <div className="showcase-card showcase-card-secondary">
                <div className="showcase-card-badge">Rodadas</div>
                <strong>Escrita, votacao e reveal no mesmo fluxo visual.</strong>
                <p>O jogo alterna entre narrativa, escolha e resultado sem perder contexto entre as fases.</p>
                <div className="showcase-mini-grid">
                  <div>
                    <span>Escrita</span>
                    <strong>Bloco de historia</strong>
                  </div>
                  <div>
                    <span>Reveal</span>
                    <strong>Card vencedor</strong>
                  </div>
                </div>
              </div>
              <div className="showcase-card showcase-card-tertiary">
                <div className="showcase-card-badge">Realtime</div>
                <strong>Presenca, progresso e resultado chegando sem refresh.</strong>
                <p>O canal em tempo real atualiza contagem, reconnect e reveal com o ritmo do jogo.</p>
                <div className="showcase-pulse-row">
                  <span className="pulse-dot" />
                  <strong>WebSocket com reconexao automatica</strong>
                </div>
              </div>
            </div>

            <AuthPanel
              activeMode={entryMode}
              createForm={createForm}
              joinForm={joinForm}
              busyAction={busyAction}
              roomCodePreview={roomCodePreview}
              onModeChange={(mode) => {
                setEntryMode(mode)
                if (mode === 'create') {
                  setRoomCodePreview(generateRoomCodePreview())
                }
              }}
              onCreateRoom={onCreateRoom}
              onJoinRoom={onJoinRoom}
              onCreateFormChange={(field, value) => {
                setCreateForm((current) => ({ ...current, [field]: value }))
              }}
              onJoinFormChange={(field, value) => {
                setJoinForm((current) => ({ ...current, [field]: value }))
              }}
            />
          </section>

          <footer className="entry-footer">
            <span>Nenhuma sessao ativa</span>
            <span>API {API_BASE_URL}</span>
            <span>Realtime {realtimeStatus}</span>
          </footer>
        </section>
      </main>
    )
  }

  return (
    <main className="game-page">
      {isPageBusy ? (
        <div className="page-loader" role="status" aria-live="polite">
          <div className="page-loader-spinner" />
          <strong>Processando sua jogada...</strong>
          <span>Sincronizando sala, sessao e rodada.</span>
        </div>
      ) : null}

      {createdRoomCode ? (
        <div className="modal-backdrop" role="presentation">
          <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-room-title">
            <span className="eyebrow">Sala criada</span>
            <h2 id="share-room-title">Seu codigo randomico ja esta pronto.</h2>
            <p>Compartilhe o codigo ou envie o link direto para o grupo entrar na mesma sala.</p>
            <div className="share-modal-code">
              <span>Codigo da sala</span>
              <strong>{createdRoomCode}</strong>
            </div>
            <div className="share-modal-actions">
              <button type="button" onClick={() => void copyRoomCode()}>
                Copiar codigo
              </button>
              <button type="button" className="secondary" onClick={() => void copyInviteLink()}>
                Copiar link
              </button>
            </div>
            <button type="button" className="ghost share-modal-dismiss" onClick={() => setCreatedRoomCode(null)}>
              Continuar para a sala
            </button>
          </section>
        </div>
      ) : null}

      <header className="game-topbar">
        <div className="game-topbar-brand">
          <img className="game-topbar-logo" src={officialLogo} alt="Tell Your Story" />
        </div>
        <nav className="game-topbar-nav">
          <span className={roomState?.room.status === 'waiting' ? 'active' : ''}>Lobby</span>
          <span className={roomState?.room.status !== 'waiting' ? 'active' : ''}>Game</span>
          <span>Players</span>
        </nav>
        <div className="game-topbar-meta">
          <div className="room-code-chip">
            <span>Room Code</span>
            <strong>{roomState?.room.code}</strong>
          </div>
          <StatusPill
            label={`Realtime ${realtimeStatus}`}
            tone={
              realtimeStatus === 'connected'
                ? 'success'
                : realtimeStatus === 'offline' && !session
                  ? 'neutral'
                  : 'warning'
            }
          />
        </div>
      </header>

      <aside className="game-sidebar">
        <div className="sidebar-room-card">
          <div className="sidebar-avatar">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.nickname} />
            ) : (
              <span>{(currentUser?.nickname ?? session?.nickname ?? 'TS').slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <strong>Room: {roomState?.room.code}</strong>
          <p>{roomState?.users.length} participantes conectados</p>
        </div>

        <nav className="sidebar-nav">
          <button type="button" className={roomState?.room.status === 'waiting' ? 'active' : ''}>
            Lobby
          </button>
          <button type="button" className={roomState?.room.status !== 'waiting' ? 'active' : ''}>
            Game
          </button>
          <button type="button">Players</button>
          <button type="button">Settings</button>
        </nav>

        <button type="button" className="sidebar-cta" onClick={() => void copyRoomCode()}>
          Compartilhar sala
        </button>
      </aside>

      <section className="game-canvas">
        <BannerStack errorMessage={errorMessage} notice={surfaceNotice} />

        <section className="hero-panel">
          <div>
            <p className="eyebrow">{heroLabel}</p>
            <h1>{heroTitle}</h1>
            <p>{heroDescription}</p>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span>Rodada</span>
              <strong>{currentRoundLabel}</strong>
            </div>
            <div className="hero-stat">
              <span>Tempo</span>
              <strong>{phaseEndsIn}</strong>
            </div>
            <div className="hero-stat">
              <span>Jogadores</span>
              <strong>{roomState?.users.length}</strong>
            </div>
          </div>
        </section>

        <section className="game-grid">
          <div className="game-primary-column">
            {roomState?.room.status === 'waiting' || !currentRound ? (
              <ParticipantsPanel users={roomState?.users ?? []} currentUserId={session?.user_id} />
            ) : (
              <RoundPanel
                roomState={roomState}
                currentRoundLabel={currentRoundLabel}
                isHost={isHost}
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
            )}

            <ActivityPanel items={activityFeed} />
          </div>

          <aside className="game-secondary-column">
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

            {roomState?.room.status !== 'waiting' && currentRound ? (
              <ParticipantsPanel users={roomState?.users ?? []} currentUserId={session?.user_id} />
            ) : null}
          </aside>
        </section>
      </section>
    </main>
  )
}
