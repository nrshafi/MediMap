export function ComingSoon() {
  return (
    <div className="page">
      <header className="header">
        <span className="brand">MediMap</span>
        <span className="location">Dhaka, Bangladesh</span>
      </header>

      <main className="hero">
        <div className="location-mark" aria-hidden="true">
          <svg viewBox="0 0 80 96" fill="none">
            <path
              d="M40 88S10 61 10 37a30 30 0 0 1 60 0c0 24-30 51-30 51Z"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M40 25v24M28 37h24"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="eyebrow">A clearer path to diagnostic care</p>
        <h1>
          Coming soon<span className="heading-dot">.</span>
        </h1>
        <p className="description">
          A place to discover diagnostic services and compare prices across Dhaka. We&apos;re
          getting MediMap ready for you.
        </p>
        <span className="status">
          <span className="status-dot" aria-hidden="true" />
          In development
        </span>
      </main>

      <footer className="footer">
        <span>MediMap</span>
        <span>Diagnostic discovery, made clearer.</span>
      </footer>
    </div>
  );
}
