import { Link } from 'react-router-dom'
import AdSlot from '../components/AdSlot'
import VinInput from '../components/VinInput'
import { SAMPLE_VIN } from '../data/sampleReport'

const STEPS = [
  {
    title: 'Paste the VIN',
    body: 'Every listing has one — check the description, the door jamb photo, or ask the seller. It takes ten seconds.',
  },
  {
    title: 'We pull the record',
    body: 'Factory specs, recalls, crash ratings, a price sanity-check — and the part nobody else does: the seller’s reputation across BBB, Yelp, and Google.',
  },
  {
    title: 'Get the verdict',
    body: 'One page, plain English: green, amber, or red. Red flags, standouts, and a checklist for the lot. Share the link with anyone.',
  },
]

const VERDICT_PREVIEW = [
  {
    signal: 'go',
    label: 'Go see it',
    body: 'The car and the seller both check out. Worth the drive.',
  },
  {
    signal: 'caution',
    label: 'Caution',
    body: 'Could be a fine deal — but verify the specific things we list first.',
  },
  {
    signal: 'flag',
    label: 'Pass on it',
    body: 'The record or the seller has problems. Save yourself the trip.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="hero-eyebrow">Free used-car gut check</p>
          <h1>
            Know the car <em>and</em> the seller before you drive out.
          </h1>
          <p className="hero-sub">
            History reports check the car. Review sites check the dealer. CarRundown checks both and
            gives you one plain-English answer: is this worth your Saturday?
          </p>
          <VinInput />
          <p className="hero-trust">
            Free · No sign-up · <Link to={`/report/${SAMPLE_VIN}`}>See a sample rundown</Link>
          </p>
        </div>
      </section>

      <section className="verdict-preview">
        <div className="container">
          <div className="verdict-preview-grid">
            {VERDICT_PREVIEW.map((v) => (
              <div key={v.signal} className={`verdict-chip verdict-chip-${v.signal}`}>
                <span className="verdict-chip-dot" aria-hidden="true" />
                <div>
                  <strong>{v.label}</strong>
                  <p>{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how" id="how-it-works">
        <div className="container">
          <h2>How it works</h2>
          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step-card">
                <span className="step-number">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="whats-inside">
        <div className="container">
          <h2>What&rsquo;s in a rundown</h2>
          <ul className="inside-grid">
            <li><strong>The verdict</strong> — go, caution, or pass, with the reasons why</li>
            <li><strong>The car</strong> — factory specs decoded straight from the VIN</li>
            <li><strong>Recalls &amp; safety</strong> — open recalls and official crash ratings</li>
            <li><strong>Price check</strong> — is the asking price actually fair?</li>
            <li><strong>The seller</strong> — BBB grade, Yelp &amp; Google patterns, name-change tricks</li>
            <li><strong>Before you go</strong> — a checklist to bring to the lot</li>
          </ul>
        </div>
      </section>

      <div className="container">
        <AdSlot size="leaderboard" id="home-bottom" />
      </div>
    </>
  )
}
