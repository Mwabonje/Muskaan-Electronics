import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vxhwgwdalymcaqaogrdl.supabase.co';
const supabaseKey = 'sb_publishable_ijr2um28xwtwXU1F7jyyqQ_NRYpvBRK';

export const supabase = createClient(supabaseUrl, supabaseKey);
