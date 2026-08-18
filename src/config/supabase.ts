/**
 * Supabase (PostgreSQL) configuration.
 *
 * To go live:
 *   1. Create a project at https://supabase.com
 *   2. Copy the Project URL and anon key from Settings > API
 *   3. Either set them here, or better, set them as environment variables:
 *        EXPO_PUBLIC_SUPABASE_URL
 *        EXPO_PUBLIC_SUPABASE_ANON_KEY
 *      (create a `.env` file in the project root, using `.env.example` as a guide)
 *
 * The app remains fully offline-first: SQLite is the local source of truth,
 * and these values are only needed to push/pull data to the cloud when online.
 */

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = (): boolean =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;