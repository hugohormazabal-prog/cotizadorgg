import { createClient } from '@supabase/supabase-js';

// ----------------------------------------------------------------------------
// Cliente de Supabase (lado navegador)
// ----------------------------------------------------------------------------
// TODO(Hugo): crea un proyecto en https://supabase.com, copia `.env.example`
// a `.env.local` y completa NEXT_PUBLIC_SUPABASE_URL y
// NEXT_PUBLIC_SUPABASE_ANON_KEY con los valores de Project Settings > API.
// El esquema de la base de datos está en supabase/migrations/0001_init.sql —
// aplícalo con `supabase db push` o pegándolo en el SQL editor del dashboard.
// ----------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Devuelve un cliente de Supabase, o `null` si las variables de entorno
 * todavía no están configuradas (para que el cotizador siga funcionando
 * en modo demo/desarrollo sin lanzar errores).
 */
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
