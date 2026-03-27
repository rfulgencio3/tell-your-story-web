import type { SessionState } from './types'

const storageKey = 'tell-your-story-session'

export function loadSession(): SessionState | null {
  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as SessionState
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

export function saveSession(session: SessionState) {
  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(storageKey)
}
