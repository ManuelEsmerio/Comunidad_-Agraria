import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && anonKey)

// Si faltan las variables se crea un cliente inerte; la app muestra un aviso de configuración.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key')
