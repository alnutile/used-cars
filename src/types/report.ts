// The shape of a composed rundown — mirrors what the `research-car` edge
// function will store in the `reports` cache table. The UI renders this type
// only, so swapping sample data for live Supabase data later is a data-layer
// change, not a redesign.

export type VerdictSignal = 'go' | 'caution' | 'flag'

export interface Verdict {
  signal: VerdictSignal
  headline: string
  summary: string
}

export interface Vehicle {
  vin: string
  year: number
  make: string
  model: string
  trim: string
  bodyStyle: string
  engine: string
  transmission: string
  drivetrain: string
  fuelType: string
  builtIn: string
}

export interface Recall {
  campaign: string
  component: string
  summary: string
  status: 'open' | 'repaired' | 'unknown'
}

export interface SafetyRatings {
  overall: number | null
  frontal: number | null
  side: number | null
  rollover: number | null
  note?: string
}

export interface TitleHistory {
  status: string
  owners: string
  odometer: string
  notes: string[]
}

export interface PriceCheck {
  askingPrice: number | null
  estimatedLow: number
  estimatedHigh: number
  read: string
  method: string
}

export interface SellerProfile {
  name: string
  address: string
  bbbGrade: string | null
  bbbAccredited: boolean
  yelpRating: number | null
  yelpReviewCount: number | null
  googleRating: number | null
  googleReviewCount: number | null
  complaintPattern: string | null
  sharedAddressFlag: string | null
}

export interface FlagItem {
  title: string
  detail: string
}

export interface Report {
  vin: string
  generatedAt: string
  verdict: Verdict
  vehicle: Vehicle
  recalls: Recall[]
  safety: SafetyRatings
  titleHistory: TitleHistory
  priceCheck: PriceCheck
  seller: SellerProfile
  redFlags: FlagItem[]
  standouts: FlagItem[]
  beforeYouGo: string[]
}

// 17 chars, letters I, O, Q are never used in a VIN.
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/

export function normalizeVin(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidVin(input: string): boolean {
  return VIN_PATTERN.test(normalizeVin(input))
}

// The hero accepts three things: a bare VIN, a listing URL (so we can also
// research the dealer), or the whole listing page pasted in. A VIN is often
// sitting inside the URL or the page text — pull it out when it's there.
const VIN_IN_TEXT = /(?<![A-Z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Z0-9])/g

export function extractVin(input: string): string | null {
  const whole = normalizeVin(input)
  if (VIN_PATTERN.test(whole)) return whole
  const matches = input.toUpperCase().match(VIN_IN_TEXT)
  return matches?.find((m) => VIN_PATTERN.test(m)) ?? null
}

export function looksLikeUrl(input: string): boolean {
  const s = input.trim()
  return /^https?:\/\//i.test(s) || /^www\.[^\s]+\.[^\s]+/i.test(s)
}

export type ParsedInput =
  | { kind: 'vin'; vin: string; source?: string }
  | { kind: 'listing'; source: string; sourceKind: 'url' | 'page' }
  | { kind: 'empty' }
  | { kind: 'invalid' }

// Turn whatever the user pasted into an actionable intent.
export function parseCarInput(raw: string): ParsedInput {
  const input = raw.trim()
  if (!input) return { kind: 'empty' }

  const vin = extractVin(input)
  const isUrl = looksLikeUrl(input)
  // A whole pasted page is long and multi-line; a stray VIN/URL is neither.
  const isPage = !isUrl && (input.length > 60 || /\n/.test(input))

  if (vin) {
    // If it came from a URL, keep the URL so seller research has a dealer to look up.
    return { kind: 'vin', vin, source: isUrl ? input : undefined }
  }
  if (isUrl) return { kind: 'listing', source: input, sourceKind: 'url' }
  if (isPage) return { kind: 'listing', source: input, sourceKind: 'page' }
  return { kind: 'invalid' }
}
