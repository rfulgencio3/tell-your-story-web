import { useEffect, useState } from 'react'
import { clearSession, loadSession, saveSession } from '../storage'
import type { SessionState } from '../types'

export function usePersistentSession() {
  const [session, setSession] = useState<SessionState | null>(() => loadSession())

  useEffect(() => {
    if (session) {
      saveSession(session)
      return
    }

    clearSession()
  }, [session])

  return [session, setSession] as const
}
