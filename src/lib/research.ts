import type { Report } from '../types/report'
import { supabase } from './supabase'

const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Cached-report-first: a shared public report costs nothing to re-serve.
// On a miss (or stale), the research-car edge function runs the pipeline.
export async function getReport(vin: string): Promise<Report> {
  const { data: cached } = await supabase
    .from('reports')
    .select('body, refreshed_at')
    .eq('vin', vin)
    .maybeSingle()

  if (cached && Date.now() - new Date(cached.refreshed_at).getTime() < REPORT_TTL_MS) {
    return cached.body as Report
  }

  const { data, error } = await supabase.functions.invoke('research-car', {
    body: { vin },
  })

  if (error) {
    // The function returns a plain-English error body for 4xx cases
    // (unknown VIN, NHTSA down); surface it when we can read it.
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const body = await context.json()
        if (body?.error) throw new Error(body.error)
      } catch (e) {
        if (e instanceof Error && e.message && !e.message.startsWith('Unexpected')) throw e
      }
    }
    throw new Error('Research is unavailable right now. Give it a minute and try again.')
  }
  if (!data?.report) throw new Error('Research came back empty. Try again in a minute.')
  return data.report as Report
}
