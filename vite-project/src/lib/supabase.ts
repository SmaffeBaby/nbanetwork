import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wjuzkmlpzvqdznqsbwfk.supabase.co'
const supabaseKey = 'sb_publishable_jwy1YwdgXtUFPOiv901Hng_e_n7Vzau'

export const supabase = createClient(supabaseUrl, supabaseKey)