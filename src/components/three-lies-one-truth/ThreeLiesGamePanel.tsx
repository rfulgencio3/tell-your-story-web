import type { FormEvent } from 'react'
import type { RoomState } from '../../types'
import { ParticipantsPanel } from '../ParticipantsPanel'
import { ThreeLiesCommentaryPanel } from './ThreeLiesCommentaryPanel'
import { ThreeLiesCountdownPanel } from './ThreeLiesCountdownPanel'
import { ThreeLiesFinalRankingPanel } from './ThreeLiesFinalRankingPanel'
import { ThreeLiesRevealPanel } from './ThreeLiesRevealPanel'
import { ThreeLiesRulesPanel } from './ThreeLiesRulesPanel'
import { ThreeLiesVotingPanel } from './ThreeLiesVotingPanel'
import { ThreeLiesWritingPanel } from './ThreeLiesWritingPanel'

interface TruthSetFormState {
  statements: string[]
  trueStatementIndex: number | null
}

interface ThreeLiesGamePanelProps {
  roomState: RoomState
  currentUserId?: string
  isHost: boolean
  currentRoundLabel: string
  phaseEndsIn: string
  phaseSecondsLeft: number | null
  truthSetForm: TruthSetFormState
  busyAction: string | null
  hasSubmittedTruthSet: boolean
  selectedStatementIndex: number | null
  onStatementChange: (index: number, value: string) => void
  onTrueStatementChange: (index: number) => void
  onSubmitTruthSet: (event: FormEvent<HTMLFormElement>) => void
  onVote: (statementIndex: number) => void
  onAdvanceCommentary: () => void
}

export function ThreeLiesGamePanel({
  roomState,
  currentUserId,
  isHost,
  currentRoundLabel,
  phaseEndsIn,
  phaseSecondsLeft,
  truthSetForm,
  busyAction,
  hasSubmittedTruthSet,
  selectedStatementIndex,
  onStatementChange,
  onTrueStatementChange,
  onSubmitTruthSet,
  onVote,
  onAdvanceCommentary,
}: ThreeLiesGamePanelProps) {
  const currentRound = roomState.current_round ?? null
  const activeTruthSet = roomState.three_lies?.active_truth_set ?? null
  const writingProgress = roomState.three_lies?.writing_progress ?? null
  const reveal = roomState.three_lies?.reveal ?? null
  const finalRanking = roomState.three_lies?.final_ranking ?? null
  const votingProgress = roomState.three_lies?.voting_progress ?? null
  const authorUserId = activeTruthSet?.author_user_id ?? reveal?.truth_set.author_user_id ?? null
  const author = authorUserId ? roomState.users.find((user) => user.id === authorUserId) ?? null : null

  if (roomState.room.status === 'finished' && finalRanking && finalRanking.length > 0) {
    return <ThreeLiesFinalRankingPanel ranking={finalRanking} />
  }

  if (roomState.room.status === 'waiting' || !currentRound) {
    return (
      <div className="three-lies-stack">
        <ThreeLiesRulesPanel title="Three Lies, One Truth" heading="Regras da sala" />
        <ParticipantsPanel users={roomState.users} currentUserId={currentUserId} />
      </div>
    )
  }

  if (currentRound.status === 'countdown') {
    return <ThreeLiesCountdownPanel roundLabel={currentRoundLabel} secondsLeft={phaseEndsIn} />
  }

  if (currentRound.status === 'writing') {
    return (
      <ThreeLiesWritingPanel
        roundLabel={currentRoundLabel}
        phaseEndsIn={phaseEndsIn}
        phaseSecondsLeft={phaseSecondsLeft}
        truthSetForm={truthSetForm}
        busyAction={busyAction}
        hasSubmittedTruthSet={hasSubmittedTruthSet}
        submittedTruthSets={writingProgress?.submitted_truth_sets ?? 0}
        eligibleAuthors={writingProgress?.eligible_authors ?? roomState.users.length}
        onStatementChange={onStatementChange}
        onTrueStatementChange={onTrueStatementChange}
        onSubmit={onSubmitTruthSet}
      />
    )
  }

  if (currentRound.status === 'presentation_voting' && activeTruthSet) {
    return (
      <ThreeLiesVotingPanel
        roundLabel={currentRoundLabel}
        phaseEndsIn={phaseEndsIn}
        phaseSecondsLeft={phaseSecondsLeft}
        truthSet={activeTruthSet}
        author={author}
        currentUserId={currentUserId}
        selectedStatementIndex={selectedStatementIndex}
        submittedVotes={votingProgress?.submitted_votes ?? 0}
        eligibleVoters={votingProgress?.eligible_voters ?? Math.max(roomState.users.length - 1, 0)}
        busyAction={busyAction}
        onVote={onVote}
      />
    )
  }

  if (currentRound.status === 'reveal' && reveal) {
    return (
      <ThreeLiesRevealPanel
        roundLabel={currentRoundLabel}
        phaseEndsIn={phaseEndsIn}
        phaseSecondsLeft={phaseSecondsLeft}
        reveal={reveal}
        author={author}
        users={roomState.users}
      />
    )
  }

  if (currentRound.status === 'commentary' && reveal) {
    return (
      <ThreeLiesCommentaryPanel
        roundLabel={currentRoundLabel}
        phaseEndsIn={phaseEndsIn}
        phaseSecondsLeft={phaseSecondsLeft}
        reveal={reveal}
        author={author}
        isHost={isHost}
        busyAction={busyAction}
        onAdvance={onAdvanceCommentary}
      />
    )
  }

  return (
    <article className="panel three-lies-panel">
      <div className="panel-header">
        <span>Three Lies, One Truth</span>
        <strong>{currentRoundLabel}</strong>
      </div>

      <div className="empty-state">
        <strong>As proximas fases deste modo entram na sequencia da integracao.</strong>
        <p>O backend ja esta pronto para votacao, reveal, commentary e ranking final.</p>
      </div>
    </article>
  )
}
