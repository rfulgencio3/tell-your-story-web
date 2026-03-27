export function formatTimeRemaining(targetDate: string, now: number) {
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
