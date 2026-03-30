import type { ThreeLiesRevealState, User } from '../../types'

interface ThreeLiesCommentaryPanelProps {
  roundLabel: string
  phaseEndsIn: string
  phaseSecondsLeft: number | null
  reveal: ThreeLiesRevealState
  author: User | null
  isHost: boolean
  busyAction: string | null
  onAdvance: () => void
}

export function ThreeLiesCommentaryPanel({
  roundLabel,
  reveal,
  author,
  isHost,
  busyAction,
  onAdvance,
}: ThreeLiesCommentaryPanelProps) {
  const isAdvancing = busyAction === 'advance'
  const authorName = author?.nickname?.trim() ? author.nickname : null

  return (
    <article className="panel three-lies-panel three-lies-commentary-panel">
      <div className="panel-header">
        <span>Commentary</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Janela do autor</p>
        <h2>{authorName ? `${authorName} tem a palavra.` : 'O autor da rodada tem a palavra.'}</h2>
        <p>
          O comentario pode durar ate 1 minuto. O host pode avancar antes para a proxima historia quando o grupo estiver pronto.
        </p>
      </div>

      <section className="three-lies-commentary-callout">
        <span>Verdade da rodada</span>
        <strong>Opcao {reveal.true_statement_index}</strong>
        <p>
          {reveal.truth_set.statements.find((statement) => statement.statement_index === reveal.true_statement_index)?.content}
        </p>
      </section>

      {isHost ? (
        <div className="three-lies-commentary-actions">
          <button type="button" className="secondary flow-action" onClick={onAdvance} disabled={isAdvancing}>
            {isAdvancing ? 'Avancando...' : 'Ir para a proxima historia'}
          </button>
        </div>
      ) : null}
    </article>
  )
}
