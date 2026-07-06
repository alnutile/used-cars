// research-car — the Phase 0 pipeline (BUSINESS.md "The orchestrator").
//
// VIN in → check the report cache → on a miss, pull free NHTSA data
// (decode, recalls, crash ratings) → synthesize the rundown with Claude →
// store in the cache tables → return the composed Report JSON that the
// frontend renders (src/types/report.ts).
//
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by the
// platform. ANTHROPIC_API_KEY must be set as a function secret — without it
// the function still returns a real NHTSA-based report with a rule-based
// verdict, clearly labeled that the AI read is pending.
//
// verify_jwt is disabled deliberately: the frontend authenticates with the
// new publishable API key (not a JWT), the function validates its one input
// strictly (17-char VIN), and all it can do is research a car and write to
// the shared public cache with its own service key.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/
const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000 // reports: ~30 days
const VEHICLE_TTL_MS = 180 * 24 * 60 * 60 * 1000 // decoded specs: ~180 days

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} responded ${res.status}`)
  return res.json()
}

// ---------- NHTSA (free, no key) ----------

interface NhtsaFacts {
  vehicle: Record<string, unknown>
  recalls: Array<Record<string, unknown>>
  safety: Record<string, unknown>
}

function cleanField(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return s && s !== 'Not Applicable' && s !== '0' ? s : null
}

async function decodeVin(vin: string) {
  const data = await fetchJson(
    `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
  )
  const r = data?.Results?.[0] ?? {}
  const year = Number.parseInt(r.ModelYear, 10) || null
  const enginePieces = [
    cleanField(r.DisplacementL) ? `${Number(r.DisplacementL).toFixed(1)}L` : null,
    cleanField(r.EngineCylinders) ? `${r.EngineCylinders}-cyl` : null,
    cleanField(r.EngineHP) ? `(${Math.round(Number(r.EngineHP))} hp)` : null,
  ].filter(Boolean)
  const builtIn = [cleanField(r.PlantCity), cleanField(r.PlantState), cleanField(r.PlantCountry)]
    .filter(Boolean)
    .join(', ')
  return {
    vin,
    year,
    make: cleanField(r.Make) ?? 'Unknown',
    model: cleanField(r.Model) ?? 'Unknown',
    trim: cleanField(r.Trim) ?? cleanField(r.Series) ?? '',
    bodyStyle: cleanField(r.BodyClass) ?? 'Unknown',
    engine: enginePieces.join(' ') || 'Not reported by NHTSA',
    transmission:
      [cleanField(r.TransmissionStyle), cleanField(r.TransmissionSpeeds) ? `${r.TransmissionSpeeds}-speed` : null]
        .filter(Boolean)
        .join(' ') || 'Not reported by NHTSA',
    drivetrain: cleanField(r.DriveType) ?? 'Not reported by NHTSA',
    fuelType: cleanField(r.FuelTypePrimary) ?? 'Not reported by NHTSA',
    builtIn: builtIn || 'Not reported by NHTSA',
  }
}

async function fetchRecalls(make: string, model: string, year: number | null) {
  if (!year) return []
  try {
    const data = await fetchJson(
      `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`,
    )
    return (data?.results ?? []).map((r: any) => ({
      campaign: String(r.NHTSACampaignNumber ?? 'unknown'),
      component: String(r.Component ?? 'Unknown component'),
      summary: String(r.Summary ?? '').slice(0, 400),
      // NHTSA lists campaigns by make/model/year — whether THIS car was
      // repaired is unknowable from the API. Never claim otherwise.
      status: 'unknown',
    }))
  } catch {
    return []
  }
}

function parseRating(v: unknown): number | null {
  const n = Number.parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null
}

async function fetchSafety(make: string, model: string, year: number | null) {
  const empty = { overall: null, frontal: null, side: null, rollover: null, note: 'No NHTSA crash test ratings found for this vehicle.' }
  if (!year) return empty
  try {
    const list = await fetchJson(
      `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`,
    )
    const vehicleId = list?.Results?.[0]?.VehicleId
    if (!vehicleId) return empty
    const detail = await fetchJson(`https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`)
    const r = detail?.Results?.[0] ?? {}
    return {
      overall: parseRating(r.OverallRating),
      frontal: parseRating(r.OverallFrontCrashRating),
      side: parseRating(r.OverallSideCrashRating),
      rollover: parseRating(r.RolloverRating),
      note: `NHTSA crash test ratings for the ${year} ${make} ${model}${list.Results.length > 1 ? ' (closest matching configuration)' : ''}.`,
    }
  } catch {
    return empty
  }
}

// ---------- Synthesis ----------

// Mirrors the Report shape in src/types/report.ts. The pieces Claude may not
// invent (vin, generatedAt, recall facts) are overwritten server-side after.
const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'titleHistory', 'priceCheck', 'redFlags', 'standouts', 'beforeYouGo'],
  properties: {
    verdict: {
      type: 'object',
      additionalProperties: false,
      required: ['signal', 'headline', 'summary'],
      properties: {
        signal: { type: 'string', enum: ['go', 'caution', 'flag'] },
        headline: { type: 'string' },
        summary: { type: 'string' },
      },
    },
    titleHistory: {
      type: 'object',
      additionalProperties: false,
      required: ['status', 'owners', 'odometer', 'notes'],
      properties: {
        status: { type: 'string' },
        owners: { type: 'string' },
        odometer: { type: 'string' },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
    priceCheck: {
      type: 'object',
      additionalProperties: false,
      required: ['estimatedLow', 'estimatedHigh', 'read', 'method'],
      properties: {
        estimatedLow: { type: ['integer', 'null'] },
        estimatedHigh: { type: ['integer', 'null'] },
        read: { type: 'string' },
        method: { type: 'string' },
      },
    },
    redFlags: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
      },
    },
    standouts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail'],
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
      },
    },
    beforeYouGo: { type: 'array', items: { type: 'string' } },
  },
} as const

const SYNTHESIS_SYSTEM = `You are CarRundown, a plain-English used-car gut check. You are given verified NHTSA data (VIN decode, recall campaigns, crash test ratings) for one vehicle. Compose the rundown a normal person reads before deciding whether a listing is worth their Saturday.

Rules:
- Ground every claim in the provided data or clearly label it as general knowledge about this model (e.g. known engine issues, resale reputation). Never invent listing-specific facts: you do NOT know this car's mileage, price, title status, ownership count, or seller.
- titleHistory must say plainly that title and ownership were NOT checked and how the buyer can check them (dealer's Carfax/AutoCheck, state title lookup).
- priceCheck: estimate a typical private-party/dealer price range for this model year in average condition from general market knowledge, as whole dollars. Set both numbers null if you genuinely cannot estimate. The method string must say it is an AI estimate to verify against local listings.
- Recall campaigns listed by NHTSA apply to the make/model/year — whether THIS car was repaired is unknown. Frame them as "verify the fix was done", and put any serious open campaign in redFlags.
- The verdict weighs only what is known: the car's design, ratings, recall load, and model reputation. Because the specific car and seller were not inspected, "go" should read as "the model checks out — now verify the car", not "buy it".
- beforeYouGo: 5-7 concrete steps tailored to this model (known weak points to test-drive for, recall paperwork to ask for, the usual out-the-door-price and independent-inspection advice).
- Write like a sharp friend, not a brochure. No hedging filler.`

async function synthesizeWithClaude(facts: NhtsaFacts): Promise<any> {
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    system: SYNTHESIS_SYSTEM,
    output_config: { format: { type: 'json_schema', schema: REPORT_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `NHTSA data for this vehicle:\n${JSON.stringify(facts, null, 2)}\n\nCompose the rundown JSON.`,
      },
    ],
  })
  if (response.stop_reason === 'refusal') throw new Error('synthesis refused')
  const text = response.content.find((b: any) => b.type === 'text')?.text
  if (!text) throw new Error('synthesis returned no text')
  return JSON.parse(text)
}

// Honest rule-based fallback so the pipeline works end-to-end before the
// ANTHROPIC_API_KEY secret is configured. Clearly labeled in the output.
function synthesizeFallback(facts: NhtsaFacts): any {
  const recalls = facts.recalls
  const safety = facts.safety as any
  const v = facts.vehicle as any
  const name = `${v.year ?? ''} ${v.make} ${v.model}`.trim()
  return {
    verdict: {
      signal: 'caution',
      headline: `${name}: the records check out — verify the rest in person`,
      summary:
        `We decoded this VIN and pulled the federal safety record: ${recalls.length} recall campaign${recalls.length === 1 ? '' : 's'} on file for this model year` +
        (safety.overall ? ` and a ${safety.overall}-star overall NHTSA crash rating` : '') +
        `. The AI verdict layer isn't configured yet, so treat this as the facts plus a checklist — the caution signal reflects what we could not check (title, mileage, seller), not a problem we found.`,
    },
    titleHistory: {
      status: 'Title & history not checked',
      owners: 'Unknown — ask the seller how many owners',
      odometer: 'Unknown — compare the listing mileage to ~12,000 miles/year',
      notes: [
        'This rundown checked federal vehicle data only. Ask the dealer to show their Carfax/AutoCheck — reputable sellers share it free.',
      ],
    },
    priceCheck: {
      estimatedLow: null,
      estimatedHigh: null,
      read: 'No price estimate in this build — compare the asking price against 3-4 similar listings in your area before you go.',
      method: 'Price estimation runs in the AI verdict layer, which is not configured yet.',
    },
    redFlags: recalls.slice(0, 4).map((r: any) => ({
      title: `Recall: ${r.component}`,
      detail: `${String(r.summary).slice(0, 180)} Ask for proof the fix was completed (campaign ${r.campaign}).`,
    })),
    standouts: safety.overall && safety.overall >= 4
      ? [{ title: `${safety.overall}-star NHTSA crash rating`, detail: 'This generation scored well in federal crash testing.' }]
      : [],
    beforeYouGo: [
      'Ask the seller to email the out-the-door price — every fee included — before you visit.',
      recalls.length > 0
        ? 'Ask for dealer paperwork showing the recall repairs above were completed.'
        : 'Verify there are no open recalls at nhtsa.gov/recalls using this VIN.',
      'Ask them to show you their Carfax/AutoCheck.',
      'Budget ~$150 for an independent pre-purchase inspection. Any "no" to that is your answer.',
      'Verify the VIN on the door jamb matches the title and this report.',
    ],
  }
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return respond({ error: 'POST a JSON body: {"vin": "..."}' }, 405)

  let vin: string
  try {
    const body = await req.json()
    vin = String(body?.vin ?? '').trim().toUpperCase()
  } catch {
    return respond({ error: 'Invalid JSON body' }, 400)
  }
  if (!VIN_PATTERN.test(vin)) return respond({ error: 'Not a valid 17-character VIN' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Cache: a fresh composed report costs zero external calls.
  const { data: cached } = await supabase
    .from('reports')
    .select('body, refreshed_at')
    .eq('vin', vin)
    .maybeSingle()
  if (cached && Date.now() - new Date(cached.refreshed_at).getTime() < REPORT_TTL_MS) {
    return respond({ report: cached.body, cached: true })
  }

  // 2. Vehicle facts: cached decode or fresh NHTSA pulls.
  let vehicle: any
  let recalls: any[]
  let safety: any
  const { data: cachedVehicle } = await supabase
    .from('vehicles')
    .select('specs, recalls, safety, fetched_at')
    .eq('vin', vin)
    .maybeSingle()
  if (cachedVehicle && Date.now() - new Date(cachedVehicle.fetched_at).getTime() < VEHICLE_TTL_MS) {
    vehicle = cachedVehicle.specs
    recalls = cachedVehicle.recalls
    safety = cachedVehicle.safety
  } else {
    try {
      vehicle = await decodeVin(vin)
    } catch (e) {
      return respond({ error: `Could not decode this VIN right now (${e instanceof Error ? e.message : 'NHTSA unavailable'}). Try again in a minute.` }, 502)
    }
    if (vehicle.make === 'Unknown' && vehicle.model === 'Unknown') {
      return respond({ error: 'NHTSA has no record for this VIN. Double-check it — a VIN never contains the letters I, O, or Q.' }, 404)
    }
    ;[recalls, safety] = await Promise.all([
      fetchRecalls(vehicle.make, vehicle.model, vehicle.year),
      fetchSafety(vehicle.make, vehicle.model, vehicle.year),
    ])
    await supabase.from('vehicles').upsert({
      vin,
      specs: vehicle,
      recalls,
      safety,
      fetched_at: new Date().toISOString(),
    })
  }

  // 3. Synthesis: Claude when the key is configured, honest fallback otherwise.
  const facts: NhtsaFacts = { vehicle, recalls, safety }
  let synthesized: any
  let usedClaude = false
  if (Deno.env.get('ANTHROPIC_API_KEY')) {
    try {
      synthesized = await synthesizeWithClaude(facts)
      usedClaude = true
    } catch (e) {
      console.error('Claude synthesis failed, using fallback:', e)
      synthesized = synthesizeFallback(facts)
    }
  } else {
    synthesized = synthesizeFallback(facts)
  }

  // 4. Compose the exact Report shape the frontend renders. Facts the model
  // must not own (vin, vehicle specs, recall list, ratings) come from NHTSA.
  const report = {
    vin,
    generatedAt: new Date().toISOString(),
    verdict: synthesized.verdict,
    vehicle,
    recalls,
    safety,
    titleHistory: synthesized.titleHistory,
    priceCheck: { askingPrice: null, ...synthesized.priceCheck },
    seller: {
      name: 'Seller not researched',
      address: 'VIN-only lookup — seller research lands with listing support (Phase 1)',
      bbbGrade: null,
      bbbAccredited: false,
      yelpRating: null,
      yelpReviewCount: null,
      googleRating: null,
      googleReviewCount: null,
      complaintPattern: null,
      sharedAddressFlag: null,
    },
    redFlags: synthesized.redFlags,
    standouts: synthesized.standouts,
    beforeYouGo: synthesized.beforeYouGo,
  }

  await supabase.from('reports').upsert({
    vin,
    verdict: report.verdict.signal,
    body: report,
    generated_at: report.generatedAt,
    refreshed_at: report.generatedAt,
  })

  return respond({ report, cached: false, ai: usedClaude })
})
