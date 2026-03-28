import type { FormEvent } from 'react'
import { AvatarPicker } from './AvatarPicker'

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
    <aside className="auth-panel">
      <div className="entry-card-header">
        <span className="eyebrow">Entrada</span>
        <strong>Pronto para a historia?</strong>
        <p>Crie uma sala para receber o grupo ou entre com um codigo existente.</p>
      </div>

      <div className="entry-forms-grid">
        <form className="stack-form entry-form-block" onSubmit={onCreateRoom}>
          <div className="entry-form-title">
            <h2>Criar sala</h2>
            <span>Host</span>
          </div>
          <label>
            <span>Seu nome</span>
            <input
              value={createForm.hostNickname}
              onChange={(event) => onCreateFormChange('hostNickname', event.target.value)}
              placeholder="Ricardo"
              required
            />
          </label>
          <AvatarPicker
            title="Avatar do host"
            subtitle="Escolha quem vai representar voce no jogo"
            selectedAvatarUrl={createForm.hostAvatarUrl}
            onSelect={(avatarUrl) => onCreateFormChange('hostAvatarUrl', avatarUrl)}
          />
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

        <form className="stack-form entry-form-block entry-form-muted" onSubmit={onJoinRoom}>
          <div className="entry-form-title">
            <h2>Entrar em sala</h2>
            <span>Participante</span>
          </div>
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
          <AvatarPicker
            title="Avatar do participante"
            subtitle="Escolha um avatar fixo da galeria"
            selectedAvatarUrl={joinForm.avatarUrl}
            onSelect={(avatarUrl) => onJoinFormChange('avatarUrl', avatarUrl)}
          />
          <button type="submit" className="secondary" disabled={busyAction === 'join-room'}>
            {busyAction === 'join-room' ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </aside>
  )
}
