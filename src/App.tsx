export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Tell Your Story</p>
        <h1>Frontend React pronto para integrar com a API.</h1>
        <p className="lead">
          O projeto base foi criado com React, Vite e TypeScript. O proximo passo e ligar
          create/join room, session_token e WebSocket.
        </p>

        <div className="actions">
          <button type="button">Criar sala</button>
          <button type="button" className="secondary">Entrar em sala</button>
        </div>
      </section>

      <section className="status-grid">
        <article>
          <span>Stack</span>
          <strong>React + Vite + TypeScript</strong>
        </article>
        <article>
          <span>Backend</span>
          <strong>Go API + WebSocket</strong>
        </article>
        <article>
          <span>Proximo passo</span>
          <strong>Integrar session_token</strong>
        </article>
      </section>
    </main>
  )
}
