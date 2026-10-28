import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rnxnytmmyzuhqznbjwll.supabase.co";
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_7f8SGFpor4yi9dvASD9YaA_UsAKxeDQ";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);