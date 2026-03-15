/// <reference types="vite/client" />
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://vxhwgwdalymcaqaogrdl.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
