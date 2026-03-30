import type { FormEvent } from 'react'

interface TruthSetFormState {
  statements: string[]
  trueStatementIndex: number | null
}

interface ThreeLiesWritingPanelProps {
  roundLabel: string
  phaseEndsIn: string
  phaseSecondsLeft: number | null
  truthSetForm: TruthSetFormState
  busyAction: string | null
  hasSubmittedTruthSet: boolean
  submittedTruthSets: number
  eligibleAuthors: number
  onStatementChange: (index: number, value: string) => void
  onTrueStatementChange: (index: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ThreeLiesWritingPanel({
  roundLabel,
  phaseEndsIn,
  phaseSecondsLeft,
  truthSetForm,
  busyAction,
  hasSubmittedTruthSet,
  submittedTruthSets,
  eligibleAuthors,
  onStatementChange,
  onTrueStatementChange,
  onSubmit,
}: ThreeLiesWritingPanelProps) {
  const isSaving = busyAction === 'submit-truth-set'
  const isUrgent = phaseSecondsLeft !== null && phaseSecondsLeft > 0 && phaseSecondsLeft <= 10

  return (
    <article className="panel three-lies-panel three-lies-writing-panel">
      <div className="panel-header">
        <span>Writing</span>
        <strong>{roundLabel}</strong>
      </div>

      <div className="three-lies-phase-hero">
        <p className="eyebrow">Uma verdade escondida</p>
        <h2>Escreva 4 afirmacoes e marque qual delas e verdadeira.</h2>
        <p>O grupo vai ver seu nome junto com as afirmacoes e tentar acertar a unica verdade.</p>
      </div>

      <div className={`three-lies-timer-card subtle${isUrgent ? ' urgent' : ''}`}>
        <span>Tempo restante</span>
        <strong>{phaseEndsIn}</strong>
      </div>

      <div className="three-lies-progress-card three-lies-writing-progress-card">
        <span>Progresso da rodada</span>
        <strong>
          {submittedTruthSets}/{eligibleAuthors}
        </strong>
        <p>jogadores ja enviaram as afirmacoes desta rodada.</p>
      </div>

      <form className="three-lies-writing-form" onSubmit={onSubmit}>
        <div className="three-lies-statement-grid">
          {truthSetForm.statements.map((statement, index) => {
            const statementNumber = index + 1
            const isSelected = truthSetForm.trueStatementIndex === statementNumber

            return (
              <label
                key={statementNumber}
                className={`three-lies-statement-card${isSelected ? ' selected' : ''}${isSaving ? ' locked' : ''}`}
              >
                <div className="three-lies-statement-topline">
                  <span>Afirmacao {statementNumber}</span>
                  <strong>{isSelected ? 'Verdade' : 'Mentira ou verdade?'}</strong>
                </div>
                <input
                  value={statement}
                  onChange={(event) => onStatementChange(index, event.target.value)}
                  placeholder={`Escreva a afirmacao ${statementNumber}`}
                  disabled={isSaving}
                  required
                />
                <div className="three-lies-radio-row">
                  <input
                    id={`true-statement-${statementNumber}`}
                    type="radio"
                    name="true-statement"
                    checked={isSelected}
                    onChange={() => onTrueStatementChange(statementNumber)}
                    disabled={isSaving}
                    required={truthSetForm.trueStatementIndex === null}
                  />
                  <span>Esta e a afirmacao verdadeira</span>
                </div>
              </label>
            )
          })}
        </div>

        {hasSubmittedTruthSet ? (
          <div className="three-lies-save-note">
            <strong>Ultima versao salva.</strong>
            <p>Voce ainda pode ajustar as afirmacoes e salvar novamente ate o fim da fase.</p>
          </div>
        ) : null}

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Enviando...' : hasSubmittedTruthSet ? 'Salvar novamente' : 'Enviar afirmacoes'}
        </button>
      </form>
    </article>
  )
}
