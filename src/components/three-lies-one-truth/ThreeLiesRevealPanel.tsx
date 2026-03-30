import type { ThreeLiesRevealState, User } from '../../types'

interface ThreeLiesRevealPanelProps {
  roundLabel: string
  phaseEndsIn: string
  reveal: ThreeLiesRevealState
  author: User | null
}

export function ThreeLiesRevealPanel({
  roundLabel,
  phaseEndsIn,
  reveal,
  author,
}: ThreeLiesRevealPanelProps) {
  return (
    <article className="panel three-lies-panel three-lies-reveal-panel">
      <div className="panel-header">
        <span>Reveal</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Resposta correta</p>
        <h2>{author ? `${author.nickname} contou uma verdade improvavel.` : 'A verdade foi revelada.'}</h2>
        <p>Agora o grupo ja consegue ver quem votou em cada opcao antes da janela de comentario comecar.</p>
      </div>

      <div className="three-lies-timer-card subtle">
        <span>Reveal termina em</span>
        <strong>{phaseEndsIn}</strong>
      </div>

      <section className="three-lies-reveal-highlight">
        <span>Verdade oficial</span>
        <strong>Opcao {reveal.true_statement_index}</strong>
        <p>
          {reveal.truth_set.statements.find((statement) => statement.statement_index === reveal.true_statement_index)?.content}
        </p>
      </section>

      <div className="three-lies-reveal-votes">
        {reveal.revealed_votes.map((vote) => (
          <article key={vote.user_id} className={`three-lies-reveal-vote${vote.is_correct ? ' correct' : ' wrong'}`}>
            <span>{vote.user_id}</span>
            <strong>Opcao {vote.selected_statement_index}</strong>
            <p>{vote.is_correct ? 'Acertou a verdade.' : 'Caiu em uma mentira.'}</p>
          </article>
        ))}
      </div>
    </article>
  )
}
