export interface AvatarOption {
  id: string
  name: string
  imageUrl: string
}

export const avatarOptions: AvatarOption[] = [
  { id: 'fox', name: 'Raposa', imageUrl: '/avatars/01-fox.png' },
  { id: 'chicken', name: 'Galinha', imageUrl: '/avatars/02-chicken.png' },
  { id: 'jaguar', name: 'Onca', imageUrl: '/avatars/03-jaguar.png' },
  { id: 'capybara', name: 'Capivara', imageUrl: '/avatars/04-capybara.png' },
  { id: 'dog', name: 'Cachorro', imageUrl: '/avatars/05-dog.png' },
  { id: 'cat', name: 'Gato', imageUrl: '/avatars/06-cat.png' },
  { id: 'turtle', name: 'Tartaruga', imageUrl: '/avatars/07-turtle.png' },
  { id: 'parrot', name: 'Papagaio', imageUrl: '/avatars/08-parrot.png' },
  { id: 'toucan', name: 'Tucano', imageUrl: '/avatars/09-toucan.png' },
  { id: 'shark', name: 'Tubarao', imageUrl: '/avatars/10-shark.png' },
  { id: 'bee', name: 'Abelha', imageUrl: '/avatars/11-bee.png' },
  { id: 'frog', name: 'Sapo', imageUrl: '/avatars/12-frog.png' },
  { id: 'owl', name: 'Coruja', imageUrl: '/avatars/14-own.png' },
]

export const defaultAvatarUrl = avatarOptions[0]?.imageUrl ?? ''
