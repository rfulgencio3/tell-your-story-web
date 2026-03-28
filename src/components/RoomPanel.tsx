import type { RoomState, SessionState, User } from '../types'

interface RoomPanelProps {
  session: SessionState | null
  roomState: RoomState | null
  currentUser: User | null
  currentRoundNumberLabel: string
  phaseEndsIn: string
  isHost: boolean
  busyAction: string | null
  onRefresh: () => void
  onStart: () => void
  onPause: () => void
  onAdvance: () => void
  onReveal: () => void
  onLeave: () => void
  onCopyCode: () => void
}

function formatRoomStatus(status: string) {
  switch (status) {
    case 'waiting':
      return 'Aguardando jogadores'
    case 'active':
      return 'Em andamento'
    case 'paused':
      return 'Pausada'
    case 'finished':
      return 'Encerrada'
    case 'expired':
      return 'Expirada'
    default:
      return status
  }
}

export function RoomPanel({
  session,
  roomState,
  currentUser,
  currentRoundNumberLabel,
  phaseEndsIn,
  isHost,
  busyAction,
  onRefresh,
  onStart,
  onPause,
  onAdvance,
  onReveal,
  onLeave,
  onCopyCode,
}: RoomPanelProps) {
  const roomStatus = roomState?.room.status ?? 'waiting'
  const roundStatus = roomState?.current_round?.status ?? null
  const actionLabel =
    roundStatus === 'writing'
      ? 'Avancar para votacao'
      : roundStatus === 'voting'
        ? 'Avancar para revelacao'
        : roundStatus === 'revealed'
          ? 'Avancar para proxima rodada'
          : 'Avancar fase'

  const guidanceTitle = isHost ? 'Painel do host' : 'Painel do participante'
  const guidanceText =
    roomStatus === 'waiting'
      ? isHost
        ? 'Compartilhe o codigo da sala e inicie o jogo quando o grupo estiver pronto.'
        : 'Aguarde o host iniciar a primeira rodada.'
      : roomStatus === 'paused'
        ? isHost
          ? 'A rodada esta pausada. Retome quando quiser continuar a dinamica.'
          : 'A rodada foi pausada pelo host. Aguarde a retomada.'
        : roomStatus === 'finished'
          ? 'A partida terminou. Voce pode criar uma nova sala para jogar de novo.'
          : roomStatus === 'expired'
            ? 'A sala expirou. Entre novamente com um codigo valido.'
            : roundStatus === 'writing'
              ? isHost
                ? 'Acompanhe o progresso das historias e avance para votacao quando fizer sentido.'
                : 'Escreva e envie sua historia antes do encerramento da fase.'
              : roundStatus === 'voting'
                ? isHost
                  ? 'Observe a contagem de votos e avance para revelacao quando o grupo terminar.'
                  : 'Escolha uma historia para votar antes do fim do tempo.'
                : roundStatus === 'revealed'
                  ? isHost
                    ? 'Confira a vencedora e avance para a proxima rodada quando quiser.'
                    : 'Confira a historia vencedora e aguarde a proxima rodada.'
                  : 'A sala esta sincronizada e pronta para continuar.'

  return (
    <article className="panel room-panel">
      <div className="panel-header">
        <span>Sala atual</span>
        <strong>{roomState ? roomState.room.code : 'Nenhuma sessao ativa'}</strong>
      </div>

      {session && roomState ? (
        <>
          <div className="room-overview">
            <div>
              <p className="metric-label">Jogador</p>
              <strong>{currentUser?.nickname ?? session.nickname}</strong>
            </div>
            <div>
              <p className="metric-label">Sala</p>
              <strong>{formatRoomStatus(roomState.room.status)}</strong>
            </div>
            <div>
              <p className="metric-label">Rodada</p>
              <strong>{currentRoundNumberLabel}</strong>
            </div>
            <div>
              <p className="metric-label">Fase encerra em</p>
              <strong>{phaseEndsIn}</strong>
            </div>
          </div>

          <div className="context-callout">
            <span>{guidanceTitle}</span>
            <strong>{isHost ? 'Voce controla o fluxo da rodada.' : 'Voce acompanha o fluxo definido pelo host.'}</strong>
            <p>{guidanceText}</p>
          </div>

          <div className="action-row">
            <button
              type="button"
              className="secondary utility-action"
              onClick={onRefresh}
              disabled={busyAction === 'refresh'}
            >
              Atualizar
            </button>
            <button type="button" className="secondary utility-action" onClick={onCopyCode}>
              Copiar codigo
            </button>
            {isHost && (roomState.room.status === 'waiting' || roomState.room.status === 'paused') ? (
              <button type="button" className="primary-action" onClick={onStart} disabled={busyAction === 'start'}>
                {roomState.room.status === 'paused' ? 'Retomar rodada' : 'Iniciar jogo'}
              </button>
            ) : null}
            {isHost && roomState.room.status === 'active' ? (
              <button type="button" className="primary-action" onClick={onPause} disabled={busyAction === 'pause'}>
                Pausar
              </button>
            ) : null}
            {isHost && roomState.current_round ? (
              <button
                type="button"
                className="secondary flow-action"
                onClick={onAdvance}
                disabled={busyAction === 'advance'}
              >
                {actionLabel}
              </button>
            ) : null}
            {isHost && roomState.current_round?.status === 'revealed' ? (
              <button
                type="button"
                className="secondary flow-action"
                onClick={onReveal}
                disabled={busyAction === 'reveal'}
              >
                Revelar vencedora
              </button>
            ) : null}
            <button type="button" className="ghost leave-action" onClick={onLeave} disabled={busyAction === 'leave'}>
              Sair da sala
            </button>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>Crie ou entre em uma sala para iniciar o jogo.</strong>
          <p>Assim que a sala estiver pronta, voce recebe o codigo para compartilhar com o grupo.</p>
        </div>
      )}
    </article>
  )
}
