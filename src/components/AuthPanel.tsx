import type { FormEvent } from 'react'

export interface CreateFormState {
  hostNickname: string
  hostAvatarUrl: string
  maxRounds: number
  timePerRound: number
}

export interface JoinFormState {
  roomCode: string
  nickname: string
  avatarUrl: string
}

interface AuthPanelProps {
  createForm: CreateFormState
  joinForm: JoinFormState
  busyAction: string | null
  onCreateRoom: (event: FormEvent<HTMLFormElement>) => void
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void
  onCreateFormChange: (field: keyof CreateFormState, value: string | number) => void
  onJoinFormChange: (field: keyof JoinFormState, value: string) => void
}

export function AuthPanel({
  createForm,
  joinForm,
  busyAction,
  onCreateRoom,
  onJoinRoom,
  onCreateFormChange,
  onJoinFormChange,
}: AuthPanelProps) {
  return (
    <aside className="panel auth-panel">
      <div className="panel-header">
        <span>Entrada</span>
        <strong>Criar ou entrar em uma sala</strong>
      </div>

      <form className="stack-form" onSubmit={onCreateRoom}>
        <h2>Criar sala</h2>
        <label>
          <span>Seu nome</span>
          <input
            value={createForm.hostNickname}
            onChange={(event) => onCreateFormChange('hostNickname', event.target.value)}
            placeholder="Ricardo"
            required
          />
        </label>
        <label>
          <span>Avatar URL</span>
          <input
            value={createForm.hostAvatarUrl}
            onChange={(event) => onCreateFormChange('hostAvatarUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        <div className="inline-fields">
          <label>
            <span>Rodadas</span>
            <input
              type="number"
              min={1}
              max={5}
              value={createForm.maxRounds}
              onChange={(event) => onCreateFormChange('maxRounds', Number(event.target.value))}
            />
          </label>
          <label>
            <span>Tempo (s)</span>
            <input
              type="number"
              min={60}
              max={300}
              value={createForm.timePerRound}
              onChange={(event) => onCreateFormChange('timePerRound', Number(event.target.value))}
            />
          </label>
        </div>
        <button type="submit" disabled={busyAction === 'create-room'}>
          {busyAction === 'create-room' ? 'Criando...' : 'Criar sala'}
        </button>
      </form>

      <form className="stack-form muted-form" onSubmit={onJoinRoom}>
        <h2>Entrar em sala</h2>
        <label>
          <span>Codigo da sala</span>
          <input
            value={joinForm.roomCode}
            onChange={(event) => onJoinFormChange('roomCode', event.target.value.toUpperCase())}
            placeholder="ABCD12"
            required
          />
        </label>
        <label>
          <span>Seu nome</span>
          <input
            value={joinForm.nickname}
            onChange={(event) => onJoinFormChange('nickname', event.target.value)}
            placeholder="Ana"
            required
          />
        </label>
        <label>
          <span>Avatar URL</span>
          <input
            value={joinForm.avatarUrl}
            onChange={(event) => onJoinFormChange('avatarUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        <button type="submit" className="secondary" disabled={busyAction === 'join-room'}>
          {busyAction === 'join-room' ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </aside>
  )
}
