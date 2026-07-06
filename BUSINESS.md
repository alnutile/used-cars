# Used Car Research - Web App Build Brief

**For the AI doing the build.** This turns Alfred's existing `used-car-research`
skill into a public web app. Build it using Alfred's **build-with-confidence**
playbook (Vite + React + TS, Supabase, Railway, RLS-on, the whole thing). That
playbook governs stack, security, and deploy. This brief governs *what the
product is* and *how the research pipeline and caching work*, which is the part
the playbook does not cover.

The research logic already exists and is proven: the `used-car-research` skill
has a working VIN-lookup script, a vetted source list, a report design, and a
verdict system. Port those, don't reinvent them (see "Reuse from the skill").

---

## The business goal (read this first)

Give a normal person an instant, trustworthy gut-check on **both the car and the
person or dealer selling it**, in one clean, shareable page. Most tools do one or
the other: Carfax tells you about the car, Google reviews tell you about the
dealer, KBB tells you about the price. Nobody stitches it into a single "should I
even drive out to see this?" answer with plain-English red flags and standouts.

That combined verdict is the product. The car (VIN, title, recalls, value) **plus**
the seller (BBB grade, Yelp and Google reviews, complaint patterns, shared-address
gotchas) **plus** a one-glance verdict is what makes it worth visiting.

### Money (honest version)

- Alfred is **not** trying to make money on this now. Do not build paywalls,
  subscriptions, or checkout.
- The only eventual upside is **display ads** on the results and report pages.
  Design so ad slots can drop into the layout later without a rework. Do not
  integrate an ad network in the MVP.
- Because revenue is thin-to-none, **per-lookup cost control is a first-class
  requirement**, not an afterthought. See caching below.

### The share-and-cache flywheel (why this can work despite no revenue)

Every report gets a clean, public, indexable URL (`/report/<vin>` or a short id).
People share rundowns with a partner or a mechanic; those pages pick up organic
search traffic; a cached report costs almost nothing to re-serve; ad impressions
accumulate against near-zero marginal cost. Shareability is both the core UX
feature and the growth-plus-revenue engine. It is not optional polish.

---

## Core user flow

1. Person lands on the site and pastes a **listing URL** or a **VIN** (MVP can be
   VIN-first; see Open Questions).
2. App returns a **rundown**: the verdict up top, then the car, title and history,
   price check, seller reputation, red flags, standouts, and a "before you go"
   checklist. Same shape as the skill's report.
3. Person can **share** that report via its public URL.
4. If the same car or dealer is looked up again, it serves from cache instantly.

---

## Build routing (build-with-confidence gating questions, answered)

Alfred's playbook says answer two gating questions, then build, picking the safer
default and flagging anything beyond them. Here are the answers so the build AI
does not stop to ask:

1. **Static or database-driven? -> Database-driven.** The whole point is to store
   and re-serve research (the cache), serve shareable report pages, and later hold
   ad config and optional user saves.
2. **Anonymous or authenticated? -> Anonymous to start (Path B), accounts later
   (Path C).** No login friction means maximum reach, maximum shareability, and
   maximum ad impressions. Real accounts (saved cars, price-drop alerts) can layer
   on later without redoing the core. **Flag:** this is a business call, easy to
   revisit; confirm with Alfred if accounts are wanted sooner.

### One deliberate deviation to flag (per the playbook)

Alfred's default is "every user-data table has RLS gated on `user_id =
auth.uid()`." This app's **core data is a shared public cache, not per-user
private data**, so it works differently and that is intentional:

- **Cache tables (vehicles, dealers, listings, reports): RLS ON, public SELECT,
  no client writes.** Anyone can read a report; only the server (edge functions
  using the `service_role` key) may insert or update. This is a shared knowledge
  base by design.
- **Optional user tables (saved_cars, search_history), only if/when accounts land:
  RLS ON, gated on `user_id = auth.uid()`** exactly per the playbook.

Flagging this because it departs from "gate everything on user_id." The departure
is on purpose: the value here is a shared, reusable research corpus.

Everything else from the playbook applies unchanged: Supabase Auth (anon now),
`service_role` is server-only and never in a `VITE_` var, `.env` gitignored with a
`.env.example`, HTTPS via Railway, Node pinned, deploy-on-push from GitHub.

---

## Architecture

Standard playbook stack. The new part is a **research pipeline that runs entirely
server-side in Supabase Edge Functions (Deno)** so API keys stay off the client
and so results can be cached. **Never run research from the browser.**

### The orchestrator: one `research-car` edge function

Given a VIN (or a listing URL that resolves to a VIN + dealer), it:

1. **Normalize input.** URL -> extract VIN and dealer identity; or take the bare
   VIN. Normalize dealer identity to `name + street address` so the same lot maps
   to one record.
2. **Check cache first (the cost saver).** If a fresh `vehicle` record for this
   VIN and a fresh `dealer` record for this seller both exist, compose and return
   the report with **zero** paid API or LLM calls. This is Alfred's "reuse results
   for the same car and dealer."
3. **On a miss, run the sub-steps** (parallelize the independent ones), then store
   each result in its cache table.
4. **Synthesize** the gathered data into the verdict via one Claude API call, store
   the composed `report`, and return it. The report is then servable at its public
   URL forever (until intentionally refreshed).

### The pipeline steps, and an honest note on which are easy vs hard

| Step | Source | Reality |
|------|--------|---------|
| VIN decode, recalls, crash ratings | NHTSA vPIC + recalls + NCAP APIs | **Free and easy.** Already working in the skill's script. Port to Deno. Cache ~permanently. |
| Listing parse (price, mileage, options) | The listing page | **Hard.** CarGurus, Facebook, Craigslist block server fetches. Needs an unblocking/extraction service (Firecrawl, Browserless, ScrapingBee, or Zyte). Paid dependency. This is why MVP can be VIN-first and let users paste listing details. |
| Market value | KBB / Edmunds | **Hard, no free API.** Either pay a valuation/listings API (e.g. MarketCheck) or estimate from comparable listings via search + the LLM. Rougher if estimated. See Open Questions. |
| Dealer reviews and grade | Yelp Fusion API, Google Places API, BBB profile | **Mixed.** Yelp Fusion has a free tier (rating + reviews). Google Places gives rating + reviews (paid per call, small). **BBB has no API**, so scrape the profile for accreditation, letter grade, and complaint count/pattern. Include the shared-address detection the skill already does. |
| Synthesis (verdict, red flags, standouts, price read, prose) | Claude API | The AI core. Feed it the assembled JSON; the skill's report instructions become the system prompt; it returns structured JSON incl. the verdict color. |

Be upfront with Alfred: the free-and-reliable spine is NHTSA plus Yelp plus BBB
plus the LLM. Listing scraping and precise valuation are the parts that cost money
and can break, which is exactly why they are later phases and why caching matters.

### Data model (cache-centric)

- **`vehicles`** - keyed by `vin`. Decoded specs, recalls, NCAP. Long TTL (specs
  never change; refresh recalls occasionally).
- **`dealers`** - keyed by normalized `name + address`. Yelp/Google/BBB data,
  complaint notes, shared-address flags. ~30-day TTL (reputation moves slowly).
- **`listings`** - keyed by `listing_url` or `vin`. Price, mileage, options
  snapshot. **Short TTL** (price changes); re-fetch on view if stale.
- **`reports`** - keyed by `vin` (+ dealer). The composed rundown the shareable
  page renders. Regenerated only when its inputs go stale or on manual refresh.

Same car + same dealer looked up again = cache hits across the board = no paid
calls, no LLM spend. That is the whole cost model.

---

## Reuse from the `used-car-research` skill

Do not start from scratch. Pull these across:

- **`scripts/vin_lookup.py`** - the exact NHTSA endpoints and field handling, already
  verified. Port the logic to the `research-car` Deno function (or run it as a small
  Python service if that is faster; Deno keeps it in-platform).
- **The source list** - NHTSA, KBB/Edmunds, CarGurus/Cars.com/Autotrader, Carfax,
  BBB, Yelp. That is the pipeline's data-source map.
- **`assets/report-template.html`** - the finished report design (stamped VIN plate,
  dashboard-style verdict readout, green/amber/red signal system, red-flags and
  standouts columns, "before you go" checklist). **This becomes the React report
  component.** The design work is done; translate it, do not redesign it.
- **The verdict color system** - `go` (green, strong buy), `caution` (amber, worth a
  look but verify), `flag` (red, pass). This is the synthesis output enum and drives
  the report's signal color.
- **The report structure and tone** - becomes the LLM synthesis system prompt so the
  web output reads like the skill's output.

---

## Suggested build phases (start simple, layer in - per the playbook)

Each phase has an **exit test** — the thing that must be REAL (not sample data)
before the phase is called done. A deployed page rendering placeholder content
does not pass any exit test; if a phase stalls on missing keys or budget, say
so and ask, don't quietly stop at a demo (see the playbook's honesty rules).

- **Design shell (done):** the report design translated to React, deployed on
  Railway over HTTPS, sample data clearly labeled as preview. *Exit test: the
  deployed page renders the full report design at desktop and phone widths.*
  Note for next time: this shell is a fine first step, but it is not "Phase 0"
  and must not be presented as a working product — every report it serves is
  fake.
- **Phase 0 (MVP):** VIN in -> NHTSA decode/recalls/ratings + Claude synthesis
  -> shareable report page, cached by VIN. Anonymous access, Supabase, Railway,
  RLS on. No scraping, no paid valuation yet (LLM-estimate value and label the
  method), dealer section degrades honestly when the input is a bare VIN with
  no seller info. *Exit test: a VIN never seen before returns a report built
  from live NHTSA data, and the second lookup of the same VIN serves from
  cache with zero external calls.*
- **Phase 1:** Add listing-URL scraping (Firecrawl/Browserless) so users paste a
  URL instead of hunting for the VIN, and dealer research (Yelp + Google + BBB)
  keyed off the listing's seller. *Exit test: a pasted listing URL yields the
  car AND a researched seller section.*
- **Phase 2:** Add a real market-valuation API for accurate price reads.
  *Exit test: the price range comes from the API, not an estimate.*
- **Phase 3:** Add ad slots (AdSense/Ezoic) to results and report pages.
- **Phase 4:** Optional accounts (Path C) for saved cars and price-drop alerts.

**Keys needed per phase — collect at phase start:** Phase 0: Supabase project
(URL + publishable key for the client; edge functions get the service key
automatically) and `ANTHROPIC_API_KEY` as an edge-function secret. Phase 1:
Firecrawl/Browserless key, Yelp Fusion key, Google Places key. Phase 2:
valuation API key.

---

## Open questions for Alfred — DECIDED (kept for the record)

1. **MVP input:** ~~VIN-first or URL-first?~~ **Decided: VIN-first.** The input
   box still accepts a URL/pasted page and extracts a VIN when one is present;
   full listing scraping is Phase 1.
2. **Valuation:** ~~API or LLM estimate?~~ **Decided: LLM estimate first**,
   clearly labeled as an estimate in the report; real valuation API in Phase 2.
3. **Accounts:** ~~anonymous or accounts?~~ **Decided: anonymous now**, accounts
   in Phase 4.
4. **Per-lookup budget:** still Alfred's call before Phase 1/2 turn on paid
   services. Phase 0's marginal cost is one Claude call per uncached VIN
   (NHTSA is free), so no ceiling needed yet.

Lesson for the next brief: unanswered open questions plus missing keys are
where an AI build stalls. Either answer them in the brief, or mark ONE
recommended default per question as "proceed with this unless told otherwise."

---

*Source of truth for stack, security, and deploy: Alfred's build-with-confidence
skill. Source of truth for research logic, sources, report design, and verdict
system: the used-car-research skill. This brief connects the two.*