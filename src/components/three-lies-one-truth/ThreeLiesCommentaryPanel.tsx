import type { ThreeLiesRevealState, User } from '../../types'

interface ThreeLiesCommentaryPanelProps {
  roundLabel: string
  phaseEndsIn: string
  reveal: ThreeLiesRevealState
  author: User | null
}

export function ThreeLiesCommentaryPanel({
  roundLabel,
  phaseEndsIn,
  reveal,
  author,
}: ThreeLiesCommentaryPanelProps) {
  return (
    <article className="panel three-lies-panel three-lies-commentary-panel">
      <div className="panel-header">
        <span>Commentary</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Janela do autor</p>
        <h2>{author ? `${author.nickname} tem a palavra.` : 'O autor da rodada tem a palavra.'}</h2>
        <p>
          Este bloco fica aberto por 15 segundos para o autor comentar a historia real antes da proxima apresentacao.
        </p>
      </div>

      <div className="three-lies-timer-card">
        <span>Comentario termina em</span>
        <strong>{phaseEndsIn}</strong>
      </div>

      <section className="three-lies-commentary-callout">
        <span>Verdade da rodada</span>
        <strong>Opcao {reveal.true_statement_index}</strong>
        <p>
          {reveal.truth_set.statements.find((statement) => statement.statement_index === reveal.true_statement_index)?.content}
        </p>
      </section>
    </article>
  )
}
