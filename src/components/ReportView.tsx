import { useState } from 'react'
import type { Report, Recall, VerdictSignal } from '../types/report'
import AdSlot from './AdSlot'
import VerdictGauge from './VerdictGauge'
import VinPlate from './VinPlate'

const SIGNAL_LABEL: Record<VerdictSignal, string> = {
  go: 'Go see it',
  caution: 'Caution',
  flag: 'Pass on it',
}

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="muted">n/a</span>
  return (
    <span className="stars" aria-label={`${value} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(Math.round(value))}</span> {value}/5
    </span>
  )
}

function RecallRow({ recall }: { recall: Recall }) {
  return (
    <li className={`recall-row recall-${recall.status}`}>
      <div className="recall-head">
        <strong>{recall.component}</strong>
        <span className={`pill pill-${recall.status === 'open' ? 'flag' : 'go'}`}>
          {recall.status === 'open' ? 'Open — not repaired' : recall.status === 'repaired' ? 'Repaired' : 'Status unknown'}
        </span>
      </div>
      <p>{recall.summary}</p>
      <p className="muted small">NHTSA campaign {recall.campaign}</p>
    </li>
  )
}

function ShareButton({ vin }: { vin: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const url = `${window.location.origin}/report/${vin}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }
  return (
    <button className="btn btn-outline" type="button" onClick={copy}>
      {copied ? 'Link copied ✓' : 'Share this rundown'}
    </button>
  )
}

export default function ReportView({ report }: { report: Report }) {
  const { verdict, vehicle, seller, priceCheck } = report
  const generated = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <article className="report">
      {/* ---- Verdict dashboard ---- */}
      <section className={`verdict-panel verdict-${verdict.signal}`}>
        <div className="verdict-gauge-col">
          <VerdictGauge signal={verdict.signal} />
          <div className={`verdict-word verdict-word-${verdict.signal}`}>{SIGNAL_LABEL[verdict.signal]}</div>
        </div>
        <div className="verdict-copy">
          <p className="verdict-kicker">
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim} · {seller.name}
          </p>
          <h1>{verdict.headline}</h1>
          <p className="verdict-summary">{verdict.summary}</p>
          <div className="verdict-actions">
            <ShareButton vin={report.vin} />
            <span className="muted small">Checked {generated}</span>
          </div>
        </div>
      </section>

      <VinPlate vin={report.vin} />

      <div className="report-columns">
        <div className="report-main">
          {/* ---- The car ---- */}
          <section className="card">
            <h2>The car</h2>
            <dl className="spec-grid">
              <div><dt>Vehicle</dt><dd>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</dd></div>
              <div><dt>Body</dt><dd>{vehicle.bodyStyle}</dd></div>
              <div><dt>Engine</dt><dd>{vehicle.engine}</dd></div>
              <div><dt>Transmission</dt><dd>{vehicle.transmission}</dd></div>
              <div><dt>Drivetrain</dt><dd>{vehicle.drivetrain}</dd></div>
              <div><dt>Fuel</dt><dd>{vehicle.fuelType}</dd></div>
              <div><dt>Built in</dt><dd>{vehicle.builtIn}</dd></div>
            </dl>
            <div className="safety-row">
              <h3>Crash test ratings</h3>
              <ul className="safety-list">
                <li>Overall <Stars value={report.safety.overall} /></li>
                <li>Frontal <Stars value={report.safety.frontal} /></li>
                <li>Side <Stars value={report.safety.side} /></li>
                <li>Rollover <Stars value={report.safety.rollover} /></li>
              </ul>
              {report.safety.note && <p className="muted small">{report.safety.note}</p>}
            </div>
          </section>

          {/* ---- Title & history ---- */}
          <section className="card">
            <h2>Title &amp; history</h2>
            <ul className="fact-list">
              <li><span className="pill pill-go">{report.titleHistory.status}</span></li>
              <li>{report.titleHistory.owners}</li>
              <li>{report.titleHistory.odometer}</li>
            </ul>
            {report.titleHistory.notes.map((note) => (
              <p key={note} className="muted small">{note}</p>
            ))}
            <h3>Recalls</h3>
            {report.recalls.length === 0 ? (
              <p>No recalls on file for this vehicle. Nice.</p>
            ) : (
              <ul className="recall-list">
                {report.recalls.map((r) => (
                  <RecallRow key={r.campaign} recall={r} />
                ))}
              </ul>
            )}
          </section>

          {/* ---- Price check ---- */}
          <section className="card">
            <h2>Price check</h2>
            <div className="price-row">
              <div className="price-stat">
                <span className="price-label">Asking</span>
                <span className="price-value">{priceCheck.askingPrice != null ? money(priceCheck.askingPrice) : '—'}</span>
              </div>
              <div className="price-stat">
                <span className="price-label">Typical range</span>
                <span className="price-value price-range">
                  {money(priceCheck.estimatedLow)} – {money(priceCheck.estimatedHigh)}
                </span>
              </div>
            </div>
            <p>{priceCheck.read}</p>
            <p className="muted small">{priceCheck.method}</p>
          </section>

          {/* ---- The seller ---- */}
          <section className="card">
            <h2>The seller</h2>
            <p className="seller-name">
              <strong>{seller.name}</strong>
              <span className="muted"> · {seller.address}</span>
            </p>
            <ul className="rating-strip">
              <li>
                <span className="rating-source">BBB</span>
                <span className="rating-value">{seller.bbbGrade ?? 'n/a'}</span>
                <span className="muted small">{seller.bbbAccredited ? 'Accredited' : 'Not accredited'}</span>
              </li>
              <li>
                <span className="rating-source">Yelp</span>
                <span className="rating-value"><Stars value={seller.yelpRating} /></span>
                {seller.yelpReviewCount != null && <span className="muted small">{seller.yelpReviewCount} reviews</span>}
              </li>
              <li>
                <span className="rating-source">Google</span>
                <span className="rating-value"><Stars value={seller.googleRating} /></span>
                {seller.googleReviewCount != null && <span className="muted small">{seller.googleReviewCount} reviews</span>}
              </li>
            </ul>
            {seller.complaintPattern && (
              <div className="callout callout-caution">
                <strong>Pattern in the reviews:</strong> {seller.complaintPattern}
              </div>
            )}
            {seller.sharedAddressFlag && (
              <div className="callout callout-flag">
                <strong>Shared address:</strong> {seller.sharedAddressFlag}
              </div>
            )}
          </section>

          {/* ---- Red flags & standouts ---- */}
          <div className="flags-grid">
            <section className="card flags-card flags-red">
              <h2>🚩 Red flags</h2>
              <ul>
                {report.redFlags.map((f) => (
                  <li key={f.title}>
                    <strong>{f.title}</strong>
                    <p>{f.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card flags-card flags-green">
              <h2>✅ Standouts</h2>
              <ul>
                {report.standouts.map((f) => (
                  <li key={f.title}>
                    <strong>{f.title}</strong>
                    <p>{f.detail}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* ---- Before you go ---- */}
          <section className="card checklist-card">
            <h2>Before you go</h2>
            <p className="muted">Print this or keep it on your phone. Work down the list at the lot.</p>
            <ol className="checklist">
              {report.beforeYouGo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <AdSlot size="leaderboard" id="report-bottom" />
        </div>

        {/* Right rail: reserved ad inventory on wide screens */}
        <aside className="report-rail">
          <AdSlot size="rectangle" id="report-rail-1" />
        </aside>
      </div>
    </article>
  )
}
