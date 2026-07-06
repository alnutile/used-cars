import { createClient } from '@supabase/supabase-js'

// Both values are public by design (the publishable key is safe client-side;
// RLS gates all writes). Env vars win so another deployment can override,
// but the fallbacks keep Railway working without extra configuration.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://szywiqaymwfunpstjjje.supabase.co'
const publishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_L36yb2bw5tOFlRADUjfSyQ_30HKgKpl'

export const supabase = createClient(url, publishableKey)
