import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Supabase URL is not defined. Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file.");
}

if (!supabaseAnonKey) {
  throw new Error("Supabase Anon Key is not defined. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
}

// Ensure that the client is only created once.
let supabase: SupabaseClient | null = null;

if (!supabase) {
 supabase = createClient(supabaseUrl, supabaseAnonKey);
}


export { supabase }; // Export the supabase client directly
