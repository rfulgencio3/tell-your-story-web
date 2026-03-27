export function ActivityPanel({ items }: { items: string[] }) {
  return (
    <article className="panel feed-panel">
      <div className="panel-header">
        <span>Atividade</span>
        <strong>Ultimos eventos</strong>
      </div>
      <ul className="activity-list">
        {items.length === 0 ? <li>Nenhum evento realtime recebido ainda.</li> : null}
        {items.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </article>
  )
}
