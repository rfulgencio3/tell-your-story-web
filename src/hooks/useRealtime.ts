import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { getRealtimeUrl } from '../api'
import type {
  ProgressPayload,
  RealtimeEnvelope,
  RoomState,
  SessionState,
  TopStoryResult,
} from '../types'

type RealtimeStatus = 'offline' | 'connecting' | 'connected' | 'reconnecting'

interface UseRealtimeParams {
  session: SessionState | null
  onRoomState: (state: RoomState) => void
  onStoryProgress: (payload: ProgressPayload) => void
  onVoteProgress: (payload: ProgressPayload) => void
  onTopStory: (payload: TopStoryResult) => void
  onError: (message: string) => void
  onActivity: (message: string) => void
}

export function useRealtime({
  session,
  onRoomState,
  onStoryProgress,
  onVoteProgress,
  onTopStory,
  onError,
  onActivity,
}: UseRealtimeParams) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('offline')
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)

  const handleRealtimeEvent = useEffectEvent((event: RealtimeEnvelope) => {
    switch (event.type) {
      case 'room.state':
        onRoomState(event.data as RoomState)
        break
      case 'story.progress':
        onStoryProgress(event.data as ProgressPayload)
        break
      case 'vote.progress':
        onVoteProgress(event.data as ProgressPayload)
        break
      case 'round.revealed':
        onTopStory(event.data as TopStoryResult)
        onActivity('A historia vencedora foi revelada.')
        break
      case 'presence.joined': {
        const payload = event.data as { nickname?: string }
        onActivity(`${payload.nickname ?? 'Alguem'} entrou na sala.`)
        break
      }
      case 'presence.left': {
        const payload = event.data as { nickname?: string }
        onActivity(`${payload.nickname ?? 'Alguem'} saiu da sala.`)
        break
      }
      case 'connection.ready':
        onActivity('Canal realtime conectado.')
        break
      case 'room.expired':
        onActivity('A sala expirou.')
        onError('A sala expirou.')
        break
      case 'error': {
        const payload = event.data as { message?: string }
        onError(payload.message ?? 'Falha no canal realtime.')
        break
      }
      default:
        break
    }
  })

  useEffect(() => {
    if (!session) {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      reconnectAttemptRef.current = 0
      setRealtimeStatus('offline')
      return
    }

    let socket: WebSocket | null = null
    let disposed = false

    const connect = () => {
      const isReconnect = reconnectAttemptRef.current > 0
      setRealtimeStatus(isReconnect ? 'reconnecting' : 'connecting')

      socket = new WebSocket(getRealtimeUrl(session))

      socket.onopen = () => {
        reconnectAttemptRef.current = 0
        setRealtimeStatus('connected')

        if (isReconnect) {
          onActivity('Canal realtime reconectado.')
        }

        socket?.send(JSON.stringify({ type: 'room.sync' }))
        socket?.send(JSON.stringify({ type: 'story.progress.request' }))
        socket?.send(JSON.stringify({ type: 'vote.progress.request' }))
      }

      socket.onmessage = (message) => {
        try {
          handleRealtimeEvent(JSON.parse(message.data) as RealtimeEnvelope)
        } catch {
          onError('Falha ao processar evento realtime.')
        }
      }

      socket.onerror = () => {
        socket?.close()
      }

      socket.onclose = () => {
        if (disposed) {
          setRealtimeStatus('offline')
          return
        }

        reconnectAttemptRef.current += 1
        const attempt = reconnectAttemptRef.current
        const delay = Math.min(1000 * attempt, 5000)
        setRealtimeStatus('reconnecting')
        onActivity(`Realtime desconectado. Tentando reconectar em ${Math.ceil(delay / 1000)}s.`)

        reconnectTimerRef.current = window.setTimeout(() => {
          reconnectTimerRef.current = null
          connect()
        }, delay)
      }
    }

    connect()

    return () => {
      disposed = true
      reconnectAttemptRef.current = 0
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      socket?.close()
    }
  }, [session?.roomCode, session?.user_id, session?.session_token])

  return realtimeStatus
}
