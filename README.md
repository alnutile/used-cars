# CarRundown (used-cars)

Paste a VIN, get the rundown: the car **and** the seller, with a plain-English
go / caution / flag verdict — before you drive out to see it.

- **What the product is:** see [BUSINESS.md](./BUSINESS.md)
- **How this gets built:** see [BUILD.md](./BUILD.md) (Alfred's build-with-confidence playbook)

## Status

**Phase: project setup + design.** The frontend is scaffolded and the full
visual design is in place, rendered from a typed `Report` shape with sample
data. The research pipeline (Supabase edge function, NHTSA/Yelp/BBB lookups,
Claude synthesis, cache tables) is the next phase — the UI already renders the
exact shape that pipeline will produce, so wiring it up is a data-layer swap,
not a redesign.

## Stack

Vite + React + TypeScript. Supabase (data/auth, next phase). Railway (hosting,
deploys on push). Node 22 (pinned via `.nvmrc` + `engines`).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm start        # serve the built app on $PORT (what Railway runs)
```

## Design notes

- **Audience:** normal people — teenagers buying a first car and their parents.
  Friendly, plain-English, zero jargon.
- **Verdict system:** `go` (green) / `caution` (amber) / `flag` (red), shown as
  a dashboard-style gauge on the report page.
- **Ad slots:** every ad position renders through `src/components/AdSlot.tsx`
  (leaderboard on home + report bottom, 300×250 sticky rail on wide report
  pages). They reserve real layout space now so an ad network can drop in later
  (Phase 3) without moving the design around. No ad network is integrated.
- **Shareability:** every report lives at `/report/<VIN>` — a clean public URL.

## Env vars

Copy `.env.example` to `.env`. Only `VITE_`-prefixed values reach the browser
(treat them as public). The Supabase `service_role` key and research API keys
are server-only and never go in client code or a `VITE_` var.
