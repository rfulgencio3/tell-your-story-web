import { type FormEvent, useEffect, useEffectEvent, useRef, useState } from 'react'
import {
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
  submitTruthSet,
  submitTruthSetVote,
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
import { ThreeLiesGamePanel } from './components/three-lies-one-truth/ThreeLiesGamePanel'
import { ThreeLiesRulesPanel } from './components/three-lies-one-truth/ThreeLiesRulesPanel'
import officialLogo from './assets/official-logo.png'
import { useActivityFeed } from './hooks/useActivityFeed'
import { usePersistentSession } from './hooks/usePersistentSession'
import { useRealtime } from './hooks/useRealtime'
import { useRoundData } from './hooks/useRoundData'
import { defaultAvatarUrl, normalizeAvatarUrl } from './lib/avatar-options'
import { formatTimeRemaining } from './lib/format'
import type { RoomState } from './types'

const initialCreateForm: CreateFormState = {
  hostNickname: '',
  hostAvatarUrl: defaultAvatarUrl,
  gameType: 'tell-your-story',
  maxRounds: 3,
  timePerRound: 60,
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

const initialTruthSetForm = {
  statements: ['', '', '', ''],
  trueStatementIndex: null as number | null,
}

function TellYourStoryRulesPanel() {
  return (
    <aside className="rules-panel">
      <div className="panel-header">
        <span>TELL YOUR STORY</span>
        <strong>Como funciona</strong>
      </div>
      <div className="rules-list">
        <article className="rule-card">
          <span>01</span>
          <strong>Todo mundo entra na mesma sala.</strong>
          <p>O host cria a sala e compartilha o codigo com o grupo.</p>
        </article>
        <article className="rule-card">
          <span>02</span>
          <strong>Cada rodada tem escrita, voto e revelacao.</strong>
          <p>Voce escreve sua historia, vota na favorita e espera o resultado.</p>
        </article>
        <article className="rule-card">
          <span>03</span>
          <strong>Ganha a historia que conquistar mais votos.</strong>
          <p>O host avanca as fases e pode iniciar a proxima rodada quando quiser.</p>
        </article>
      </div>
    </aside>
  )
}

function formatRoundLabel(roundState: RoomState | null) {
  const currentRound = roundState?.current_round
  if (!currentRound) {
    return 'Aguardando inicio'
  }

  const phaseLabel =
    currentRound.status === 'countdown'
      ? 'Countdown'
      : currentRound.status === 'writing'
        ? 'Escrita'
        : currentRound.status === 'voting' || currentRound.status === 'presentation_voting'
          ? 'Votacao'
          : currentRound.status === 'revealed' || currentRound.status === 'reveal'
            ? 'Revelacao'
            : currentRound.status === 'commentary'
              ? 'Comentario'
              : 'Encerrada'

  return `Rodada ${currentRound.round_number} - ${phaseLabel}`
}

function getPhaseSecondsLeft(phaseEndsAt: string | null | undefined, now: number) {
  if (!phaseEndsAt) {
    return null
  }

  const diff = new Date(phaseEndsAt).getTime() - now
  return Math.max(Math.ceil(diff / 1000), 0)
}

function playAlarmTone() {
  if (typeof window === 'undefined') {
    return
  }

  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextCtor) {
    return
  }

  try {
    const audioContext = new AudioContextCtor()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.45)
    void audioContext.close().catch(() => undefined)
  } catch {
    // Ignore browsers that block autoplay audio.
  }
}

function getHeroCopy(roomState: RoomState | null) {
  const gameType = roomState?.room.game_type ?? 'tell-your-story'
  const roomStatus = roomState?.room.status ?? 'waiting'
  const roundStatus = roomState?.current_round?.status ?? null

  if (gameType === 'three-lies-one-truth') {
    if (roomStatus === 'waiting') {
      return {
        label: 'Three Lies, One Truth',
        title: 'Monte a sala e prepare a primeira rodada.',
        description: 'O host define o ritmo da partida e o grupo entra na mesma sala antes do countdown inicial.',
      }
    }

    if (roomStatus === 'paused') {
      return {
        label: 'Rodada pausada',
        title: 'O modo novo esta em pausa.',
        description: 'O countdown, a escrita ou a apresentacao voltam do mesmo ponto assim que o host retomar.',
      }
    }

    if (roundStatus === 'countdown') {
      return {
        label: 'Countdown',
        title: 'A partida comeca em instantes.',
        description: 'A contagem aparece para todo mundo antes da janela de escrita abrir.',
      }
    }

    if (roundStatus === 'writing') {
      return {
        label: 'Writing',
        title: 'Escreva 4 afirmacoes e esconda a verdade.',
        description: 'Todo mundo prepara o proprio conjunto em 1 minuto e a rodada segue com quem enviou antes do tempo acabar.',
      }
    }

    if (roundStatus === 'presentation_voting') {
      return {
        label: 'Presentation Voting',
        title: 'Uma pessoa conta quatro versoes da mesma historia.',
        description: 'Leia as afirmacoes, marque a verdade e ajuste seu voto enquanto o cronometro estiver aberto.',
      }
    }

    if (roundStatus === 'reveal') {
      return {
        label: 'Reveal',
        title: 'A verdade apareceu para a sala inteira.',
        description: 'Agora o grupo ve quem acertou e quem caiu em uma mentira antes do comentario do autor.',
      }
    }

    if (roundStatus === 'commentary') {
      return {
        label: 'Commentary',
        title: 'O autor tem ate 1 minuto para comentar.',
        description: 'O host pode avancar para a proxima historia antes do timeout quando o grupo ja estiver pronto.',
      }
    }

    if (roomStatus === 'finished') {
      return {
        label: 'Ranking final',
        title: 'A partida terminou e o placar ficou definido.',
        description: 'Agora a sala mostra apenas a classificacao final com posicoes compartilhadas em caso de empate.',
      }
    }

    return {
      label: 'Three Lies, One Truth',
      title: 'O modo novo esta em andamento.',
      description: 'As proximas fases do frontend entram nas proximas slices de integracao.',
    }
  }

  return {
    label:
      roomStatus === 'waiting'
        ? 'Lobby da sala'
        : roomStatus === 'paused'
          ? 'Rodada pausada'
          : roundStatus === 'writing'
            ? 'Fase de escrita'
            : roundStatus === 'voting'
              ? 'Fase de votacao'
              : roundStatus === 'revealed'
                ? 'Revelacao'
                : 'TellYourStory',
    title:
      roomStatus === 'waiting'
        ? 'Aguardando participantes.'
        : roomStatus === 'paused'
          ? 'Segure o ritmo e retome quando quiser.'
          : roundStatus === 'writing'
            ? 'Escreva a melhor historia.'
            : roundStatus === 'voting'
              ? 'Vote na melhor historia!'
              : roundStatus === 'revealed'
                ? 'E o vencedor e...'
                : 'Sua sala esta pronta.',
    description:
      roomStatus === 'waiting'
        ? 'Monte o grupo, compartilhe o codigo e inicie quando todos estiverem prontos.'
        : roomStatus === 'paused'
          ? 'A rodada esta em pausa e o estado atual segue preservado.'
          : roundStatus === 'writing'
            ? 'Use o bloco principal para contar sua narrativa antes do tempo acabar.'
            : roundStatus === 'voting'
              ? 'As historias aparecem como cards de votacao. Escolha a sua favorita.'
              : roundStatus === 'revealed'
                ? 'Confira o destaque da rodada e prepare o proximo tema.'
                : 'Acompanhe o estado da sala, participantes e feed em tempo real.',
  }
}

export default function App() {
  const currentYear = new Date().getFullYear()
  const [session, setSession] = usePersistentSession()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [entryMode, setEntryMode] = useState<EntryMode>('create')
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [joinForm, setJoinForm] = useState(initialJoinForm)
  const [storyForm, setStoryForm] = useState(initialStoryForm)
  const [truthSetForm, setTruthSetForm] = useState(initialTruthSetForm)
  const [submittedTruthSetRounds, setSubmittedTruthSetRounds] = useState<string[]>([])
  const [truthSetVoteSelections, setTruthSetVoteSelections] = useState<Record<string, number>>({})
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastAlarmPhaseKeyRef = useRef<string | null>(null)

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
    gameType: roomState?.room.game_type ?? null,
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
    onRoomInvalidated: () => {
      if (!session) {
        return
      }

      void getRoom(session.roomCode)
        .then((state) => {
          setRoomState(state)
        })
        .catch(() => {
          // Ignore transient sync failures; realtime can retry on the next event.
        })
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
  const isThreeLiesRoom = roomState?.room.game_type === 'three-lies-one-truth'
  const hasSubmittedStory = currentRound ? submittedStoryRounds.includes(currentRound.id) : false
  const hasSubmittedTruthSet = currentRound ? submittedTruthSetRounds.includes(currentRound.id) : false
  const activeTruthSetId = roomState?.three_lies?.active_truth_set?.id ?? null
  const selectedTruthSetVote = activeTruthSetId ? truthSetVoteSelections[activeTruthSetId] ?? null : null
  const hasVoted = currentRound ? userVote?.round_id === currentRound.id : false
  const phaseSecondsLeft = getPhaseSecondsLeft(currentRound?.phase_ends_at, now)
  const phaseEndsIn = currentRound?.phase_ends_at
    ? formatTimeRemaining(currentRound.phase_ends_at, now)
    : 'Sem cronometro'
  const currentRoundLabel = formatRoundLabel(roomState)
  const hasLiveRoom = Boolean(session && roomState)
  const heroCopy = getHeroCopy(roomState)
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
  const appFooter = (
    <footer className="app-footer">
      <span>Feito em {currentYear} por</span>
      <a
        href="https://github.com/rfulgencio3"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub de rfulgencio3"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.59 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.09 0-1.13.39-2.06 1.03-2.79-.1-.26-.45-1.31.1-2.73 0 0 .85-.28 2.8 1.07A9.4 9.4 0 0 1 12 6.84c.85 0 1.71.12 2.51.36 1.95-1.35 2.8-1.07 2.8-1.07.56 1.42.21 2.47.1 2.73.64.73 1.03 1.66 1.03 2.79 0 3.96-2.33 4.82-4.56 5.08.36.32.68.95.68 1.92 0 1.39-.01 2.5-.01 2.84 0 .28.18.6.69.49A10.25 10.25 0 0 0 22 12.24C22 6.59 17.52 2 12 2Z" />
        </svg>
        <strong>rfulgencio3</strong>
      </a>
    </footer>
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setSubmittedTruthSetRounds([])
      setTruthSetForm(initialTruthSetForm)
      setTruthSetVoteSelections({})
    }
  }, [session?.roomCode, session?.user_id])

  useEffect(() => {
    setTruthSetForm(initialTruthSetForm)
  }, [currentRound?.id, roomState?.room.game_type])

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

  useEffect(() => {
    if (!isThreeLiesRoom || !currentRound) {
      lastAlarmPhaseKeyRef.current = null
      return
    }

    const phaseKey = `${currentRound.id}:${currentRound.status}`
    if (phaseSecondsLeft === null || phaseSecondsLeft > 0) {
      if (lastAlarmPhaseKeyRef.current !== phaseKey) {
        lastAlarmPhaseKeyRef.current = null
      }
      return
    }

    if (lastAlarmPhaseKeyRef.current === phaseKey) {
      return
    }

    lastAlarmPhaseKeyRef.current = phaseKey
    playAlarmTone()
  }, [currentRound?.id, currentRound?.status, isThreeLiesRoom, phaseSecondsLeft])

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
        game_type: createForm.gameType,
        max_rounds: createForm.maxRounds,
        time_per_round: createForm.timePerRound,
      })

      clearAllRoundState()
      setSubmittedTruthSetRounds([])
      setTruthSetForm(initialTruthSetForm)
      setTruthSetVoteSelections({})
      setSession(sessionFromRoomState(state))
      setRoomState(state)
      setCreatedRoomCode(state.room.code)
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

      clearAllRoundState()
      setSubmittedTruthSetRounds([])
      setTruthSetForm(initialTruthSetForm)
      setTruthSetVoteSelections({})
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

  async function onSubmitTruthSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !currentRound || truthSetForm.trueStatementIndex === null) {
      return
    }

    resetFeedback()
    setBusyAction('submit-truth-set')

    try {
      await submitTruthSet({
        round_id: currentRound.id,
        user_id: session.user_id,
        session_token: session.session_token,
        statements: truthSetForm.statements,
        true_statement_index: truthSetForm.trueStatementIndex,
      })

      setSubmittedTruthSetRounds((current) =>
        current.includes(currentRound.id) ? current : [...current, currentRound.id],
      )
      setNotice(hasSubmittedTruthSet ? 'Afirmacoes atualizadas com sucesso.' : 'Afirmacoes enviadas com sucesso.')
      pushActivity(hasSubmittedTruthSet ? 'Suas afirmacoes foram atualizadas.' : 'Suas afirmacoes foram enviadas.')
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel enviar as afirmacoes.')
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

  async function onTruthSetVote(statementIndex: number) {
    if (!session || !currentRound || !roomState?.three_lies?.active_truth_set) {
      return
    }

    resetFeedback()
    setBusyAction(`vote-truth-set-${statementIndex}`)

    try {
      const vote = await submitTruthSetVote({
        round_id: currentRound.id,
        user_id: session.user_id,
        session_token: session.session_token,
        truth_set_id: roomState.three_lies.active_truth_set.id,
        selected_statement_index: statementIndex,
      })

      setTruthSetVoteSelections((current) => ({
        ...current,
        [vote.truth_set_id]: vote.selected_statement_index,
      }))
      setNotice('Voto registrado com sucesso.')
      pushActivity('Seu voto na rodada atual foi salvo.')
    } catch (error: unknown) {
      handleApiError(error, 'Nao foi possivel registrar o voto nesta apresentacao.')
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
              <p>Crie a sala, convide seus amigos e acompanhe cada rodada ao vivo.</p>
            </div>
          </header>

          <BannerStack errorMessage={errorMessage} notice={surfaceNotice} />

          <section className="entry-layout">
            <div className="entry-feature-row">
              <div className="showcase-card showcase-card-primary compact">
                <div className="showcase-card-badge">Convide rapido</div>
                <strong>Crie a sala, escolha o modo e compartilhe o codigo com o grupo.</strong>
                <p>O grupo entra no mesmo lobby em poucos segundos e acompanha a mesma partida.</p>
              </div>
              <div className="showcase-card showcase-card-secondary compact">
                <div className="showcase-card-badge">Mude o ritmo</div>
                <strong>Escolha o tipo de partida que combina melhor com o grupo.</strong>
                <p>Cada modo organiza as rodadas com regras claras e uma experiencia visual guiada.</p>
              </div>
              <div className="showcase-card showcase-card-tertiary compact">
                <div className="showcase-card-badge">Tudo ao vivo</div>
                <strong>A sala se atualiza automaticamente enquanto todo mundo joga.</strong>
                <p>Entrada, progresso, transicoes e resultado aparecem em tempo real para o grupo inteiro.</p>
              </div>
            </div>

            <div className="entry-action-row">
              <AuthPanel
                activeMode={entryMode}
                createForm={createForm}
                joinForm={joinForm}
                busyAction={busyAction}
                onModeChange={(mode) => {
                  setEntryMode(mode)
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

              {entryMode === 'join' ? (
                <div className="entry-rules-stack">
                  <TellYourStoryRulesPanel />
                  <ThreeLiesRulesPanel title="THREE LIES, ONE TRUTH" heading="Como funciona" />
                </div>
              ) : createForm.gameType === 'three-lies-one-truth' ? (
                <ThreeLiesRulesPanel title="THREE LIES, ONE TRUTH" heading="Como funciona" />
              ) : (
                <TellYourStoryRulesPanel />
              )}
            </div>
          </section>

          {appFooter}
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
            <h2 id="share-room-title">Seu codigo da sala ja esta pronto.</h2>
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
        <div className="game-topbar-meta">
          <div className="room-code-chip">
            <span>Room Code</span>
            <strong>{roomState?.room.code}</strong>
          </div>
        </div>
      </header>

      <aside className="game-sidebar">
        <div className="sidebar-room-card">
          <div className="sidebar-avatar">
            {currentUser?.avatar_url ? (
              <img src={normalizeAvatarUrl(currentUser.avatar_url)} alt={currentUser.nickname} />
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
            Rodada
          </button>
          <button type="button">Players</button>
        </nav>

        <button type="button" className="sidebar-cta" onClick={() => void copyRoomCode()}>
          Compartilhar sala
        </button>
      </aside>

      <section className="game-canvas">
        <BannerStack errorMessage={errorMessage} notice={surfaceNotice} />

        <section className="hero-panel">
          <div>
            <p className="eyebrow">{heroCopy.label}</p>
            <h1>{heroCopy.title}</h1>
            <p>{heroCopy.description}</p>
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
            {isThreeLiesRoom && roomState ? (
              <ThreeLiesGamePanel
                roomState={roomState}
                currentUserId={session?.user_id}
                isHost={isHost}
                currentRoundLabel={currentRoundLabel}
                phaseEndsIn={phaseEndsIn}
                phaseSecondsLeft={phaseSecondsLeft}
                truthSetForm={truthSetForm}
                busyAction={busyAction}
                hasSubmittedTruthSet={hasSubmittedTruthSet}
                selectedStatementIndex={selectedTruthSetVote}
                onStatementChange={(index, value) => {
                  setTruthSetForm((current) => ({
                    ...current,
                    statements: current.statements.map((statement, statementIndex) =>
                      statementIndex === index ? value : statement,
                    ),
                  }))
                }}
                onTrueStatementChange={(index) => {
                  setTruthSetForm((current) => ({ ...current, trueStatementIndex: index }))
                }}
                onSubmitTruthSet={onSubmitTruthSet}
                onVote={(statementIndex) => void onTruthSetVote(statementIndex)}
                onAdvanceCommentary={() => void runRoomAction('advance')}
              />
            ) : roomState?.room.status === 'waiting' || !currentRound ? (
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

        {appFooter}
      </section>
    </main>
  )
}
