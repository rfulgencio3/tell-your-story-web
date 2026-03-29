import type { FormEvent } from 'react'
import type { RoomState } from '../../types'
import { ParticipantsPanel } from '../ParticipantsPanel'
import { ThreeLiesCountdownPanel } from './ThreeLiesCountdownPanel'
import { ThreeLiesRulesPanel } from './ThreeLiesRulesPanel'
import { ThreeLiesWritingPanel } from './ThreeLiesWritingPanel'

interface TruthSetFormState {
  statements: string[]
  trueStatementIndex: number | null
}

interface ThreeLiesGamePanelProps {
  roomState: RoomState
  currentUserId?: string
  currentRoundLabel: string
  phaseEndsIn: string
  truthSetForm: TruthSetFormState
  busyAction: string | null
  hasSubmittedTruthSet: boolean
  onStatementChange: (index: number, value: string) => void
  onTrueStatementChange: (index: number) => void
  onSubmitTruthSet: (event: FormEvent<HTMLFormElement>) => void
}

export function ThreeLiesGamePanel({
  roomState,
  currentUserId,
  currentRoundLabel,
  phaseEndsIn,
  truthSetForm,
  busyAction,
  hasSubmittedTruthSet,
  onStatementChange,
  onTrueStatementChange,
  onSubmitTruthSet,
}: ThreeLiesGamePanelProps) {
  const currentRound = roomState.current_round ?? null

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
        truthSetForm={truthSetForm}
        busyAction={busyAction}
        hasSubmittedTruthSet={hasSubmittedTruthSet}
        onStatementChange={onStatementChange}
        onTrueStatementChange={onTrueStatementChange}
        onSubmit={onSubmitTruthSet}
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
