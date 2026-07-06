import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import ReportView from '../components/ReportView'
import VinInput from '../components/VinInput'
import { getReport } from '../lib/research'
import { SAMPLE_VIN, sampleReport } from '../data/sampleReport'
import type { Report } from '../types/report'
import { isValidVin, normalizeVin } from '../types/report'

export default function ReportPage() {
  const { vin: rawVin } = useParams()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const vin = normalizeVin(rawVin ?? '')
  const isSample = vin === SAMPLE_VIN

  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A listing URL/page can arrive without a VIN — carried via query (?src) or
  // navigation state. Reading the listing itself is Phase 1.
  const listingSource =
    (location.state as { source?: string } | null)?.source ?? searchParams.get('src') ?? null

  const validVin = isValidVin(vin)

  useEffect(() => {
    if (!validVin || isSample) return
    let cancelled = false
    setReport(null)
    setError(null)
    getReport(vin)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Something went wrong.')
      })
    return () => {
      cancelled = true
    }
  }, [vin, validVin, isSample])

  if (!validVin) {
    return (
      <div className="container report-error">
        <div className="card">
          {listingSource ? (
            <>
              <h1>We need the VIN for this one</h1>
              <p>
                Reading a whole listing lands in the next phase. For now, find the VIN on the
                listing (it&rsquo;s usually under &ldquo;vehicle details&rdquo;) and paste it here
                — the research runs on the real federal data.
              </p>
            </>
          ) : (
            <>
              <h1>That doesn&rsquo;t look like a VIN</h1>
              <p>
                A VIN is exactly 17 letters and numbers, and never uses the letters I, O, or Q.
              </p>
            </>
          )}
          <VinInput compact />
          <p className="muted small">
            Or <Link to={`/report/${SAMPLE_VIN}`}>look at a sample rundown</Link> to see what you
            get.
          </p>
        </div>
      </div>
    )
  }

  if (isSample) {
    return (
      <div className="container report-container">
        <div className="demo-banner" role="status">
          <strong>Sample rundown:</strong> this is example data showing what a report looks like.
          Paste a real VIN on the <Link to="/">home page</Link> to research an actual car.
        </div>
        <ReportView report={sampleReport} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container report-error">
        <div className="card">
          <h1>Couldn&rsquo;t research this car</h1>
          <p>{error}</p>
          <VinInput compact />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container report-container">
        <div className="card research-loading" role="status">
          <h1>Researching {vin}&hellip;</h1>
          <p>
            Decoding the VIN, pulling recall campaigns and crash-test ratings from NHTSA, and
            writing up the rundown. First lookup of a car takes a little while — after that
            it&rsquo;s cached and instant.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container report-container">
      <ReportView report={report} />
    </div>
  )
}
