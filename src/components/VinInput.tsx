import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseCarInput } from '../types/report'

export default function VinInput({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [multiline, setMultiline] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  // Grow the field as a pasted page fills it, but stay a single-line pill otherwise.
  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
    setMultiline(el.scrollHeight > 56)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsed = parseCarInput(value)

    if (parsed.kind === 'vin') {
      setError(null)
      const qs = parsed.source ? `?src=${encodeURIComponent(parsed.source)}` : ''
      navigate(`/report/${parsed.vin}${qs}`)
      return
    }

    if (parsed.kind === 'listing') {
      setError(null)
      navigate('/report/listing', {
        state: { source: parsed.source, sourceKind: parsed.sourceKind },
      })
      return
    }

    setError(
      'Paste a 17-character VIN, a listing URL (starts with http), or the whole listing page. ' +
        'A VIN is letters and numbers only — never I, O, or Q.',
    )
  }

  return (
    <form className={compact ? 'vin-form vin-form-compact' : 'vin-form'} onSubmit={handleSubmit} noValidate>
      <div className={multiline ? 'vin-form-row is-multiline' : 'vin-form-row'}>
        <textarea
          ref={textareaRef}
          className="vin-input"
          rows={1}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a VIN, the listing URL, or the whole listing page"
          aria-label="VIN, listing URL, or pasted listing page"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            autoGrow()
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            // Enter submits; Shift+Enter adds a newline (for pasted pages).
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
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
            Have the VIN? It&rsquo;s on the listing, the driver&rsquo;s door jamb, or the bottom of the
            windshield. No VIN handy? Drop the listing link and we&rsquo;ll pull the car and the dealer.
          </p>
        )
      )}
    </form>
  )
}
