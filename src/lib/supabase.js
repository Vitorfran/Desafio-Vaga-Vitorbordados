// Cliente público do Supabase usado pelo frontend para autenticação.
// Nunca coloque a SUPABASE_SECRET_KEY neste arquivo ou em qualquer variável VITE_*. 
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && chavePublica ? createClient(url, chavePublica) : null
