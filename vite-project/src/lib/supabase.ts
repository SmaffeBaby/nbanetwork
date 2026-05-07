import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:8010'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is not configured')
}

export const supabase = createClient(supabaseUrl, supabaseKey)