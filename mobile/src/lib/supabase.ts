import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://meiupqbyvvrqbmqgnels.supabase.co'
const supabaseAnonKey = 'sb_publishable_vNW-La_lvSMSDSX-_ElZTQ_32il4a-J'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
