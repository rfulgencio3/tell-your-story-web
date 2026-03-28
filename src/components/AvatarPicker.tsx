import { avatarOptions } from '../lib/avatar-options'

interface AvatarPickerProps {
  selectedAvatarUrl: string
  title: string
  subtitle: string
  onSelect: (avatarUrl: string) => void
}

export function AvatarPicker({
  selectedAvatarUrl,
  title,
  subtitle,
  onSelect,
}: AvatarPickerProps) {
  return (
    <div className="avatar-picker">
      <div className="avatar-picker-header">
        <span>{title}</span>
        <strong>{subtitle}</strong>
      </div>

      <div className="avatar-picker-grid" role="list" aria-label={title}>
        {avatarOptions.map((avatar) => {
          const selected = avatar.imageUrl === selectedAvatarUrl

          return (
            <button
              key={avatar.id}
              type="button"
              className={`avatar-choice${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(avatar.imageUrl)}
            >
              <img src={avatar.imageUrl} alt={avatar.name} />
              <span>{avatar.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
