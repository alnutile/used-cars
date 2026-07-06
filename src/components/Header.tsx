import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-row">
        <Link to="/" className="wordmark" aria-label="CarRundown home">
          <span className="wordmark-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13" />
              <path d="M4 13h16a1 1 0 0 1 1 1v3h-2.5" />
              <path d="M3 17v-3a1 1 0 0 1 1-1" />
              <circle cx="7.5" cy="17" r="1.8" />
              <circle cx="16.5" cy="17" r="1.8" />
            </svg>
          </span>
          <span className="wordmark-text">
            Car<em>Rundown</em>
          </span>
        </Link>
        <nav className="header-nav">
          <a href="/#how-it-works">How it works</a>
          <Link to="/" className="btn btn-small">
            Check a car
          </Link>
        </nav>
      </div>
    </header>
  )
}
