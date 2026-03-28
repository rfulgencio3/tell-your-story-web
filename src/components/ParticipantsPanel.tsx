import type { User } from '../types'
import { normalizeAvatarUrl } from '../lib/avatar-options'

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

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

      <div className="players-orb-grid">
        {users.map((user) => (
          <article key={user.id} className={`player-orb-card${user.id === currentUserId ? ' current' : ''}`}>
            <div className={`player-orb${user.is_host ? ' host' : ''}`}>
              {user.avatar_url ? (
                <img src={normalizeAvatarUrl(user.avatar_url)} alt={user.nickname} />
              ) : (
                <span>{initialsFromName(user.nickname)}</span>
              )}
            </div>
            <div className="player-orb-copy">
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
