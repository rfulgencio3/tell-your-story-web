import type { User } from '../types'

export function ParticipantsPanel({
  users,
  currentUserId,
}: {
  users: User[]
  currentUserId?: string
}) {
  return (
    <article className="panel players-panel">
      <div className="panel-header">
        <span>Participantes</span>
        <strong>{users.length} conectados</strong>
      </div>
      <div className="user-list">
        {users.map((user) => (
          <article key={user.id} className={`user-card${user.id === currentUserId ? ' current' : ''}`}>
            <div>
              <strong>{user.nickname}</strong>
              <p>{user.is_host ? 'Host' : 'Participante'}</p>
            </div>
            {user.id === currentUserId ? <span>Voce</span> : null}
          </article>
        ))}
      </div>
    </article>
  )
}
