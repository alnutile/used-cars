import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isValidVin, normalizeVin } from '../types/report'

export default function VinInput({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const vin = normalizeVin(value)
    if (!isValidVin(vin)) {
      setError('A VIN is 17 letters and numbers (it never uses I, O, or Q). Double-check and try again.')
      return
    }
    setError(null)
    navigate(`/report/${vin}`)
  }

  return (
    <form className={compact ? 'vin-form vin-form-compact' : 'vin-form'} onSubmit={handleSubmit} noValidate>
      <div className="vin-form-row">
        <input
          className="vin-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={17}
          placeholder="Paste the 17-character VIN"
          aria-label="Vehicle Identification Number"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
        />
        <button className="btn btn-primary" type="submit">
          Get the rundown
        </button>
      </div>
      {error ? (
        <p className="vin-error" role="alert">
          {error}
        </p>
      ) : (
        !compact && (
          <p className="vin-hint">
            Find the VIN on the listing, the driver&rsquo;s door jamb, or the bottom of the windshield.
          </p>
        )
      )}
    </form>
  )
}
