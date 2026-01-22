export default function HomePage() {
  return (
    <main className="shell">
      <section className="card">
        <p className="eyebrow">POC • modern AI</p>
        <h1>Welkom</h1>
        <p className="lede">
          Deze site is een proof-of-concept, in een paar uur gebouwd met moderne AI tooling
          (ChatGPT + Codex) om te laten zien wat mogelijk is.
        </p>
        <p className="lede">
          Voor de lol opgezet: KBO-data in een Next.js frontend met een NestJS API erachter,
          zoek- en detailpagina’s en Postgres imports inbegrepen.
        </p>

        <div className="steps">
          <h2>Wat werkt er?</h2>
          <ol>
            <li>Companies-pagina: zoek ondernemingsnummers/benamingen met paginatie.</li>
            <li>Detailpagina: labels voor status, rechtsvorm, NACE, contact, adres, activiteiten.</li>
            <li>Import: KBO CSV’s + NACEBEL 2025 via pnpm kbo:import.</li>
          </ol>
        </div>

        <div className="steps">
          <h2>Heb je feedback?</h2>
          <p className="muted">Laat het weten — dit is slechts een demo.</p>
        </div>
      </section>
    </main>
  );
}
