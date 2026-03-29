interface ThreeLiesCountdownPanelProps {
  roundLabel: string
  secondsLeft: string
}

export function ThreeLiesCountdownPanel({ roundLabel, secondsLeft }: ThreeLiesCountdownPanelProps) {
  return (
    <article className="panel three-lies-panel three-lies-countdown-panel">
      <div className="panel-header">
        <span>Preparando a partida</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Countdown</p>
        <h2>O jogo vai comecar.</h2>
        <p>Segure firme: a fase de escrita abre assim que a contagem terminar.</p>
      </div>

      <div className="three-lies-timer-card" aria-live="polite">
        <span>Tempo restante</span>
        <strong>{secondsLeft}</strong>
      </div>
    </article>
  )
}
