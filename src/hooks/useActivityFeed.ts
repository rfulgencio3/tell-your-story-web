import { startTransition, useEffectEvent, useState } from 'react'

export function useActivityFeed() {
  const [activityFeed, setActivityFeed] = useState<string[]>([])

  const pushActivity = useEffectEvent((message: string) => {
    const stamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    startTransition(() => {
      setActivityFeed((current) => [`${stamp} - ${message}`, ...current].slice(0, 8))
    })
  })

  return {
    activityFeed,
    pushActivity,
  }
}
