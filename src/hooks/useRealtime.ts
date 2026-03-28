import { useEffect, useEffectEvent, useState } from 'react'
import { getRealtimeUrl } from '../api'
import type {
  ProgressPayload,
  RealtimeEnvelope,
  RoomState,
  SessionState,
  TopStoryResult,
} from '../types'

type RealtimeStatus = 'offline' | 'connecting' | 'connected'

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
      setRealtimeStatus('offline')
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
        onError('Falha ao processar evento realtime.')
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

  return realtimeStatus
}
