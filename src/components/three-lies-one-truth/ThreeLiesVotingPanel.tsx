import type { TruthSet, User } from '../../types'

interface ThreeLiesVotingPanelProps {
  roundLabel: string
  phaseEndsIn: string
  truthSet: TruthSet
  author: User | null
  currentUserId?: string
  selectedStatementIndex: number | null
  submittedVotes: number
  eligibleVoters: number
  busyAction: string | null
  onVote: (statementIndex: number) => void
}

export function ThreeLiesVotingPanel({
  roundLabel,
  phaseEndsIn,
  truthSet,
  author,
  currentUserId,
  selectedStatementIndex,
  submittedVotes,
  eligibleVoters,
  busyAction,
  onVote,
}: ThreeLiesVotingPanelProps) {
  const isAuthor = currentUserId === truthSet.author_user_id
  const isSaving = busyAction?.startsWith('vote-truth-set-') ?? false

  return (
    <article className="panel three-lies-panel">
      <div className="panel-header">
        <span>Presentation Voting</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Quem esta dizendo a verdade?</p>
        <h2>{author ? `${author.nickname} esta no centro da rodada.` : 'Um jogador esta no centro da rodada.'}</h2>
        <p>
          Leia as 4 afirmacoes, escolha a unica verdade e ajuste seu voto quantas vezes quiser antes do tempo acabar.
        </p>
      </div>

      <div className="three-lies-voting-overview">
        <div className="three-lies-timer-card">
          <span>Tempo restante</span>
          <strong>{phaseEndsIn}</strong>
        </div>
        <div className="three-lies-progress-card">
          <span>Votos enviados</span>
          <strong>
            {submittedVotes}/{eligibleVoters}
          </strong>
        </div>
      </div>

      <div className={`three-lies-author-card${isAuthor ? ' current-author' : ''}`}>
        <span>Autor em destaque</span>
        <strong>{author?.nickname ?? 'Jogador da rodada'}</strong>
        <p>
          {isAuthor
            ? 'Voce e o autor dessa historia, aguarde a votacao dos outros jogadores.'
            : 'Seu voto fica oculto ate a sala entrar em reveal.'}
        </p>
      </div>

      <div className="three-lies-statement-grid voting">
        {truthSet.statements
          .slice()
          .sort((left, right) => left.statement_index - right.statement_index)
          .map((statement) => {
            const isSelected = selectedStatementIndex === statement.statement_index

            return (
              <article
                key={statement.id}
                className={`three-lies-vote-option${isSelected ? ' selected' : ''}${isAuthor ? ' locked' : ''}`}
              >
                <div className="three-lies-statement-topline">
                  <span>Opcao {statement.statement_index}</span>
                  <strong>{isSelected ? 'Seu voto atual' : 'Escolha disponivel'}</strong>
                </div>
                <p>{statement.content}</p>
                <button
                  type="button"
                  className={isSelected ? '' : 'secondary'}
                  disabled={isAuthor || isSaving}
                  onClick={() => onVote(statement.statement_index)}
                >
                  {isAuthor ? 'Bloqueado para o autor' : isSelected ? 'Opcao marcada' : 'Marcar como verdade'}
                </button>
              </article>
            )
          })}
      </div>
    </article>
  )
}
