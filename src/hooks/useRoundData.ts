import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { ApiError, getTopStory, getUserVote, listStories, listVotes } from '../api'
import type {
  GameType,
  ProgressPayload,
  Round,
  SessionState,
  StoryCard,
  TopStoryResult,
  UserVote,
  VoteSummary,
} from '../types'

interface UseRoundDataParams {
  gameType: GameType | null
  session: SessionState | null
  currentRound: Round | null
  onApiError: (error: unknown, fallbackMessage: string) => void
}

export function useRoundData({ gameType, session, currentRound, onApiError }: UseRoundDataParams) {
  const [storyCards, setStoryCards] = useState<StoryCard[]>([])
  const [voteSummaries, setVoteSummaries] = useState<VoteSummary[]>([])
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [topStory, setTopStory] = useState<TopStoryResult | null>(null)
  const [storyProgress, setStoryProgress] = useState<ProgressPayload | null>(null)
  const [voteProgress, setVoteProgress] = useState<ProgressPayload | null>(null)
  const [submittedStoryRounds, setSubmittedStoryRounds] = useState<string[]>([])
  const handleApiError = useEffectEvent(onApiError)

  function clearRoundData() {
    setStoryCards([])
    setVoteSummaries([])
    setUserVote(null)
    setTopStory(null)
    setStoryProgress(null)
    setVoteProgress(null)
  }

  function clearAllRoundState() {
    clearRoundData()
    setSubmittedStoryRounds([])
  }

  function markStorySubmitted(roundId: string) {
    setSubmittedStoryRounds((current) => (current.includes(roundId) ? current : [...current, roundId]))
  }

  useEffect(() => {
    if (!session) {
      clearAllRoundState()
      return
    }

    if (gameType !== 'tell-your-story') {
      clearRoundData()
      return
    }

    if (!currentRound) {
      clearRoundData()
      return
    }

    if (currentRound.status === 'writing') {
      clearRoundData()
      return
    }

    let cancelled = false

    void Promise.all([listStories(currentRound.id), listVotes(currentRound.id)])
      .then(([stories, votes]) => {
        if (!cancelled) {
          startTransition(() => {
            setStoryCards(stories)
            setVoteSummaries(votes)
          })
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          handleApiError(error, 'Nao foi possivel carregar historias e votos.')
        }
      })

    void getUserVote(currentRound.id, session)
      .then((vote) => {
        if (!cancelled) {
          setUserVote(vote)
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setUserVote(null)
          return
        }

        handleApiError(error, 'Nao foi possivel carregar seu voto.')
      })

    return () => {
      cancelled = true
    }
  }, [currentRound?.id, currentRound?.status, gameType, session?.user_id, session?.session_token])

  useEffect(() => {
    if (gameType !== 'tell-your-story' || !currentRound || currentRound.status !== 'revealed' || topStory) {
      return
    }

    let cancelled = false

    void getTopStory(currentRound.id)
      .then((winner) => {
        if (!cancelled) {
          setTopStory(winner)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          handleApiError(error, 'Nao foi possivel carregar a historia vencedora.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentRound?.id, currentRound?.status, gameType, topStory?.story.id])

  return {
    storyCards,
    voteSummaries,
    userVote,
    topStory,
    storyProgress,
    voteProgress,
    submittedStoryRounds,
    setUserVote,
    setTopStory,
    setStoryProgress,
    setVoteProgress,
    setVoteSummaries,
    clearRoundData,
    clearAllRoundState,
    markStorySubmitted,
  }
}
