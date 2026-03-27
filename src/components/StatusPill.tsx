export function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: 'neutral' | 'success' | 'warning'
}) {
  return <span className={`status-pill ${tone}`}>{label}</span>
}
