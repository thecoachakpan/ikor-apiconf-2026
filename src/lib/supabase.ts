import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://njjcvlmjhnjycdogxszl.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_-EeRA4ECq2CR3K6E052Z9Q_9-QBRPMk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
