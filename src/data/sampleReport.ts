import type { Report } from '../types/report'

// Design-phase sample. Once the `research-car` edge function lands, the
// report page fetches this shape from Supabase instead.
export const SAMPLE_VIN = '2HKRW2H85KH601234'

export const sampleReport: Report = {
  vin: SAMPLE_VIN,
  generatedAt: '2026-07-03T14:20:00Z',
  verdict: {
    signal: 'caution',
    headline: 'Worth a look — but verify two things first',
    summary:
      'The car itself checks out: clean title, one owner, sensible miles, strong crash ratings. What earns the caution is an open fuel-pump recall with no repair proof, and a dealer with a pattern of surprise fees at signing. Neither is a deal-breaker — both are things you confirm before you hand over money.',
  },
  vehicle: {
    vin: SAMPLE_VIN,
    year: 2019,
    make: 'Honda',
    model: 'CR-V',
    trim: 'EX',
    bodyStyle: 'Sport Utility Vehicle',
    engine: '1.5L Turbo I4 (190 hp)',
    transmission: 'CVT Automatic',
    drivetrain: 'All-Wheel Drive',
    fuelType: 'Gasoline',
    builtIn: 'East Liberty, Ohio, USA',
  },
  recalls: [
    {
      campaign: '23V-682',
      component: 'Fuel pump impeller',
      summary:
        'The fuel pump inside the tank may fail, which can cause the engine to stall while driving. Free fix at any Honda dealer.',
      status: 'open',
    },
  ],
  safety: {
    overall: 5,
    frontal: 5,
    side: 5,
    rollover: 4,
    note: 'NHTSA crash test ratings for the 2019 CR-V AWD.',
  },
  titleHistory: {
    status: 'Clean title reported',
    owners: '1 previous owner',
    odometer: '61,400 miles — about right for the year (12k/yr avg)',
    notes: [
      'No salvage, flood, or lemon brands found in the data we can see.',
      'A paid history report (Carfax/AutoCheck) can still surface accidents — ask the dealer to show you theirs for free.',
    ],
  },
  priceCheck: {
    askingPrice: 21900,
    estimatedLow: 19800,
    estimatedHigh: 21200,
    read: 'Asking price is a little above the typical range for this year, trim, and mileage. There is room to negotiate — especially with the open recall as leverage.',
    method: 'Estimated from comparable listings. A precise valuation feed is coming later.',
  },
  seller: {
    name: 'Route 9 Auto Sales',
    address: '1480 Main St, Worcester, MA',
    bbbGrade: 'B-',
    bbbAccredited: false,
    yelpRating: 3.5,
    yelpReviewCount: 42,
    googleRating: 4.2,
    googleReviewCount: 318,
    complaintPattern:
      'Multiple recent reviews mention "doc fees" and add-ons appearing at signing that were not in the advertised price. Ask for the out-the-door price in writing before you visit.',
    sharedAddressFlag:
      'This address is also registered to "Miracle Motors LLC." Dealers sometimes reopen under new names after bad reviews — worth asking about directly.',
  },
  redFlags: [
    {
      title: 'Open recall, no repair proof',
      detail:
        'The fuel-pump recall (23V-682) shows as open. The fix is free, but stalling while driving is serious — ask for dealer paperwork showing it was done.',
    },
    {
      title: 'Fee complaints at this dealer',
      detail:
        'A repeating review pattern of extra fees appearing at signing. Get the out-the-door price in writing before driving out.',
    },
    {
      title: 'Priced above the typical range',
      detail: 'Asking $21,900 against an estimated $19,800–$21,200 range. Negotiable, but know that going in.',
    },
    {
      title: 'Shared business address',
      detail: 'Same lot is registered to a second dealer name. Not proof of anything — but ask why.',
    },
  ],
  standouts: [
    {
      title: 'Clean title, one owner',
      detail: 'No brands found and a single previous owner — the boring history you want.',
    },
    {
      title: 'Mileage matches the age',
      detail: '61k on a 2019 is right on the average line. No signs of odometer weirdness.',
    },
    {
      title: '5-star crash rating',
      detail: 'NHTSA gave this generation CR-V five stars overall. Good pick for a new driver.',
    },
    {
      title: 'Holds value well',
      detail: 'CR-Vs of this generation resell reliably, so you are unlikely to be underwater in two years.',
    },
  ],
  beforeYouGo: [
    'Ask the dealer to email you the out-the-door price — every fee included — before you visit.',
    'Ask for proof the fuel-pump recall (23V-682) repair was completed, or make them do it before sale.',
    'Ask them to show you their Carfax/AutoCheck — reputable dealers share it free.',
    'Budget ~$150 for an independent pre-purchase inspection. Any "no" to that is your answer.',
    'On the test drive: cold start, listen to the CVT under hard acceleration, and check the oil level and smell (early 1.5T engines had fuel-dilution issues).',
    'Verify the VIN on the door jamb matches the title and this report.',
  ],
}
