import { normalizeAvatarUrl } from '../../lib/avatar-options'
import type { ThreeLiesRankingEntry } from '../../types'

interface ThreeLiesFinalRankingPanelProps {
  ranking: ThreeLiesRankingEntry[]
}

export function ThreeLiesFinalRankingPanel({ ranking }: ThreeLiesFinalRankingPanelProps) {
  return (
    <article className="panel three-lies-panel three-lies-ranking-panel">
      <div className="panel-header">
        <span>Match End</span>
        <strong>Ranking final</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Pontuacao encerrada</p>
        <h2>A rodada final acabou e a classificacao ficou assim.</h2>
        <p>Jogadores empatados compartilham a mesma posicao.</p>
      </div>

      <div className="three-lies-ranking-list">
        {ranking.map((entry) => (
          <article key={entry.user_id} className="three-lies-ranking-entry">
            <div className="three-lies-ranking-position">{entry.position}º</div>
            <div className="three-lies-ranking-user">
              {entry.avatar_url ? (
                <img src={normalizeAvatarUrl(entry.avatar_url)} alt={entry.nickname} />
              ) : (
                <span>{entry.nickname.slice(0, 2).toUpperCase()}</span>
              )}
              <strong>{entry.nickname}</strong>
            </div>
            <div className="three-lies-ranking-score">{entry.score} pts</div>
          </article>
        ))}
      </div>
    </article>
  )
}
