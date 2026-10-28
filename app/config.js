// ShiftReady platform — public settings of the Supabase project.
//
// The publishable key (the old "anon public" key) is public by design: it only lets the browser
// talk to the API, and every rule is enforced inside the database (RLS + checked functions).
// NEVER put the secret / service_role key here: it skips every rule.
//
// Where to find it: Supabase → Project Settings → API Keys → "Publishable key"
// (or the "Legacy API Keys" tab → "anon public").

export const SUPABASE_URL = 'https://euusjtfndzlvxrpimwkq.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_wNS5phtxj2B0PaEh38MzSw_bzKRf3oo';   // publishable (public) key of shiftready-dev

// Shown in the strip at the top so nobody confuses the test project with the real one
export const ENV_LABEL = 'Entorno de desarrollo · shiftready-dev';

// Where companies write to ask for access (leave empty to hide the address)
export const CONTACT_EMAIL = '';
