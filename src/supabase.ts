/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Note: To set the JWT expiration to 7 days, you must configure this in your Supabase Dashboard:
// 1. Go to Authentication -> Policies / Settings
// 2. Find "JWT expiry"
// 3. Change the value from 3600 (1 hour) to 604800 (7 days)
