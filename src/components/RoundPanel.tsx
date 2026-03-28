import type { FormEvent } from 'react'
import type { ProgressPayload, RoomState, StoryCard, TopStoryResult, UserVote, VoteSummary } from '../types'

interface RoundPanelProps {
  roomState: RoomState | null
  currentRoundLabel: string
  isHost: boolean
  storyProgress: ProgressPayload | null
  voteProgress: ProgressPayload | null
  storyCards: StoryCard[]
  voteSummaries: VoteSummary[]
  userVote: UserVote | null
  topStory: TopStoryResult | null
  storyForm: { title: string; body: string }
  busyAction: string | null
  hasSubmittedStory: boolean
  hasVoted: boolean
  onStoryFormChange: (field: 'title' | 'body', value: string) => void
  onSubmitStory: (event: FormEvent<HTMLFormElement>) => void
  onVote: (storyId: string) => void
}

export function RoundPanel({
  roomState,
  currentRoundLabel,
  isHost,
  storyProgress,
  voteProgress,
  storyCards,
  voteSummaries,
  userVote,
  topStory,
  storyForm,
  busyAction,
  hasSubmittedStory,
  hasVoted,
  onStoryFormChange,
  onSubmitStory,
  onVote,
}: RoundPanelProps) {
  const currentRound = roomState?.current_round ?? null
  const storyVoteMap = Object.fromEntries(voteSummaries.map((vote) => [vote.story_id, vote.vote_count]))
  const roomStatus = roomState?.room.status ?? 'waiting'
  const phaseTone =
    roomStatus === 'paused' || roomStatus === 'expired'
      ? 'warning'
      : currentRound?.status === 'revealed'
        ? 'success'
        : 'neutral'
  const phaseTitle =
    roomStatus === 'waiting'
      ? 'Aguardando inicio da partida'
      : roomStatus === 'paused'
        ? 'Rodada pausada'
        : roomStatus === 'finished'
          ? 'Partida encerrada'
          : roomStatus === 'expired'
            ? 'Sala expirada'
            : currentRound?.status === 'writing'
              ? 'Fase de escrita'
              : currentRound?.status === 'voting'
                ? 'Fase de votacao'
                : currentRound?.status === 'revealed'
                  ? 'Resultado revelado'
                  : 'Sala sincronizada'
  const phaseDescription =
    roomStatus === 'waiting'
      ? isHost
        ? 'Assim que estiver tudo pronto, inicie o jogo para abrir a escrita.'
        : 'O host ainda nao iniciou a partida.'
      : roomStatus === 'paused'
        ? isHost
          ? 'Retome a rodada quando o grupo estiver pronto para continuar.'
          : 'A rodada foi pausada pelo host.'
        : roomStatus === 'finished'
          ? 'A partida terminou e nao ha mais rodadas a jogar nesta sala.'
          : roomStatus === 'expired'
            ? 'Esta sessao nao aceita mais acoes. Entre em outra sala para continuar.'
            : currentRound?.status === 'writing'
              ? hasSubmittedStory
                ? 'Sua historia ja foi enviada. Aguarde o restante do grupo ou a proxima fase.'
                : 'Envie sua historia antes do tempo acabar.'
              : currentRound?.status === 'voting'
                ? hasVoted
                  ? 'Seu voto ja foi registrado. Aguarde o reveal da rodada.'
                  : 'Vote em uma historia. O autor permanece oculto ate o reveal.'
                : currentRound?.status === 'revealed'
                  ? 'A rodada foi concluida. Confira o resultado antes da proxima fase.'
                  : 'A sala esta pronta para sincronizar a rodada.'

  return (
    <article className={`panel round-panel phase-${currentRound?.status ?? 'waiting'}`}>
      <div className="panel-header">
        <span>Rodada atual</span>
        <strong>{currentRoundLabel}</strong>
      </div>

      <div className={`phase-callout ${phaseTone}`}>
        <span>{phaseTitle}</span>
        <p>{phaseDescription}</p>
      </div>

      {currentRound ? (
        <>
          <div className="progress-grid">
            <article className="progress-card">
              <span>Historias enviadas</span>
              <strong>{`${storyProgress?.count ?? storyCards.length}/${roomState?.users.length ?? 0}`}</strong>
            </article>
            <article className="progress-card">
              <span>Votos registrados</span>
              <strong>
                {`${voteProgress?.count ?? voteSummaries.reduce((sum, vote) => sum + vote.vote_count, 0)}/${Math.max((roomState?.users.length ?? 1) - 1, 1)}`}
              </strong>
            </article>
          </div>

          {currentRound.status === 'writing' ? (
            <form className="stack-form" onSubmit={onSubmitStory}>
              <h2>Envie sua historia</h2>
              <label>
                <span>Titulo</span>
                <input
                  value={storyForm.title}
                  onChange={(event) => onStoryFormChange('title', event.target.value)}
                  placeholder="Aquele dia improvavel"
                  required
                />
              </label>
              <label>
                <span>Historia</span>
                <textarea
                  value={storyForm.body}
                  onChange={(event) => onStoryFormChange('body', event.target.value)}
                  placeholder="Conte uma historia curta e memoravel..."
                  rows={5}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busyAction === 'submit-story' || hasSubmittedStory || roomState?.room.status !== 'active'}
              >
                {hasSubmittedStory ? 'Historia ja enviada' : busyAction === 'submit-story' ? 'Enviando...' : 'Enviar historia'}
              </button>
            </form>
          ) : (
            <div className="story-list">
              {storyCards.length === 0 ? (
                <div className="empty-state compact">
                  <strong>As historias ainda nao chegaram aqui.</strong>
                  <p>Use Atualizar ou aguarde o realtime sincronizar o painel.</p>
                </div>
              ) : null}

              {storyCards.map((story) => {
                const isSelected = userVote?.story_id === story.id
                const voteCount = storyVoteMap[story.id] ?? story.vote_count

                return (
                  <article key={story.id} className={`story-card${isSelected ? ' selected' : ''}`}>
                    <div className="story-card-header">
                      <strong>{story.title}</strong>
                      <span>{voteCount} voto(s)</span>
                    </div>
                    <p>{story.body}</p>
                    {currentRound.status === 'voting' ? (
                      <button
                        type="button"
                        className="secondary"
                        disabled={hasVoted || busyAction === `vote-${story.id}`}
                        onClick={() => onVote(story.id)}
                      >
                        {isSelected ? 'Seu voto' : hasVoted ? 'Votacao encerrada para voce' : 'Votar nesta historia'}
                      </button>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}

          {topStory ? (
            <div className="winner-card">
              <span>Vencedora</span>
              <strong>{topStory.story.title}</strong>
              <p>{topStory.story.body}</p>
              <small>
                por {topStory.author.nickname} com {topStory.vote_count} voto(s)
              </small>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty-state compact">
          <strong>O host ainda nao iniciou a primeira rodada.</strong>
          <p>Quando a sala sair de waiting, a escrita abre automaticamente.</p>
        </div>
      )}
    </article>
  )
}
