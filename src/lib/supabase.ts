// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      // Throttle events to a maximum of 5 per second
      eventsPerSecond: 5,
    },
    // Add timeout and heartbeat configurations
    timeout: 10000,
    heartbeatIntervalMs: 30000,
  },
  auth: {
    // Ensure auth state is properly synchronized with realtime
    persistSession: true,
    autoRefreshToken: true,
  },
})