import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // It's okay if they are missing locally initially, but will warn
    console.warn("Supabase keys missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
}

// Safe initialization
const url = supabaseUrl || "https://placeholder.supabase.co";
const key = supabaseAnonKey || "placeholder";

export const supabase = createClient(url, key);
