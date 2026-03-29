interface ThreeLiesRulesPanelProps {
  title?: string
  heading?: string
  className?: string
}

export function ThreeLiesRulesPanel({
  title = 'Modo novo',
  heading = 'Como funciona',
  className = 'rules-panel',
}: ThreeLiesRulesPanelProps) {
  return (
    <section className={className}>
      <div className="panel-header">
        <span>{title}</span>
        <strong>{heading}</strong>
      </div>
      <div className="rules-list">
        <article className="rule-card">
          <span>01</span>
          <strong>Cada jogador escreve 4 afirmacoes.</strong>
          <p>Tres devem ser mentiras e apenas uma deve ser verdadeira.</p>
        </article>
        <article className="rule-card">
          <span>02</span>
          <strong>O autor aparece para todo mundo.</strong>
          <p>As afirmacoes nao sao anonimas e o autor nao vota na propria historia.</p>
        </article>
        <article className="rule-card">
          <span>03</span>
          <strong>Os outros jogadores tem 60 segundos para votar.</strong>
          <p>O voto pode mudar ate o ultimo segundo antes da revelacao.</p>
        </article>
        <article className="rule-card">
          <span>04</span>
          <strong>O jogo avanca sozinho entre fases e rodadas.</strong>
          <p>Depois da revelacao, a sala segue para comentario e continua ate o ranking final.</p>
        </article>
      </div>
    </section>
  )
}
