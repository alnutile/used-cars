import { Link, useParams } from 'react-router-dom'
import ReportView from '../components/ReportView'
import VinInput from '../components/VinInput'
import { SAMPLE_VIN, sampleReport } from '../data/sampleReport'
import { isValidVin, normalizeVin } from '../types/report'

// Design phase: every valid VIN renders the sample rundown so the full report
// design is reviewable. The research pipeline (Supabase edge function + cache)
// replaces this lookup in the next phase.
export default function ReportPage() {
  const { vin: rawVin } = useParams()
  const vin = normalizeVin(rawVin ?? '')

  if (!isValidVin(vin)) {
    return (
      <div className="container report-error">
        <div className="card">
          <h1>That doesn&rsquo;t look like a VIN</h1>
          <p>
            A VIN is exactly 17 letters and numbers, and never uses the letters I, O, or Q. Check
            the listing again and retry.
          </p>
          <VinInput compact />
          <p className="muted small">
            Or <Link to={`/report/${SAMPLE_VIN}`}>look at a sample rundown</Link> to see what you get.
          </p>
        </div>
      </div>
    )
  }

  const isSample = vin === SAMPLE_VIN
  const report = { ...sampleReport, vin }

  return (
    <div className="container report-container">
      {!isSample && (
        <div className="demo-banner" role="status">
          <strong>Preview mode:</strong> live research isn&rsquo;t wired up yet, so this shows the
          sample rundown with your VIN. The real pipeline lands in the next build phase.
        </div>
      )}
      <ReportView report={report} />
    </div>
  )
}
