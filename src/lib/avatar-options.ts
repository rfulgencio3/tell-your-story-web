export interface AvatarOption {
  id: string
  name: string
  imageUrl: string
}

const jaguarAvatarPath = '/avatars/03-jaguar.png'
const jaguarAvatarVersion = 'v=2'

function withVersion(path: string, version: string) {
  return `${path}?${version}`
}

export const avatarOptions: AvatarOption[] = [
  { id: 'fox', name: 'Raposa', imageUrl: '/avatars/01-fox.png' },
  { id: 'chicken', name: 'Galinha', imageUrl: '/avatars/02-chicken.png' },
  { id: 'jaguar', name: 'Onca', imageUrl: withVersion(jaguarAvatarPath, jaguarAvatarVersion) },
  { id: 'capybara', name: 'Capivara', imageUrl: '/avatars/04-capybara.png' },
  { id: 'dog', name: 'Cachorro', imageUrl: '/avatars/05-dog.png' },
  { id: 'cat', name: 'Gato', imageUrl: '/avatars/06-cat.png' },
  { id: 'turtle', name: 'Tartaruga', imageUrl: '/avatars/07-turtle.png' },
  { id: 'parrot', name: 'Papagaio', imageUrl: '/avatars/08-parrot.png' },
  { id: 'toucan', name: 'Tucano', imageUrl: '/avatars/09-toucan.png' },
  { id: 'shark', name: 'Tubarao', imageUrl: '/avatars/10-shark.png' },
  { id: 'bee', name: 'Abelha', imageUrl: '/avatars/11-bee.png' },
  { id: 'frog', name: 'Sapo', imageUrl: '/avatars/12-frog.png' },
  { id: 'elephant', name: 'Elefante', imageUrl: '/avatars/13-elephant.png' },
  { id: 'owl', name: 'Coruja', imageUrl: '/avatars/14-own.png' },
  { id: 'panda', name: 'Panda', imageUrl: '/avatars/15-panda.png' },
  { id: 'sloth', name: 'Bicho-preguica', imageUrl: '/avatars/16-sloth.png' },
  { id: 'bear', name: 'Urso', imageUrl: '/avatars/17-bear.png' },
  { id: 'penguin', name: 'Pinguim', imageUrl: '/avatars/18-penguin.png' },
  { id: 'monkey', name: 'Macaco', imageUrl: '/avatars/19-monkey.png' },
  { id: 'crocodile', name: 'Crocodilo', imageUrl: '/avatars/20-crocodile.png' },
]

export const defaultAvatarUrl = avatarOptions[0]?.imageUrl ?? ''

export function normalizeAvatarUrl(avatarUrl: string) {
  const trimmed = avatarUrl.trim()
  if (trimmed === '' || !trimmed.startsWith(jaguarAvatarPath)) {
    return trimmed
  }

  return withVersion(jaguarAvatarPath, jaguarAvatarVersion)
}
