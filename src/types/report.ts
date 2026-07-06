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
