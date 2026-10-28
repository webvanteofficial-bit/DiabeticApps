import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rnxnytmmyzuhqznbjwll.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7f8SGFpor4yi9dvASD9YaA_UsAKxeDQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function table(name) {
  return {
    async toArray() {
      const { data, error } = await supabase.from(name).select("*");
      if (error) throw error;
      return data || [];
    },
    async add(row) {
      const { data, error } = await supabase.from(name).insert(row).select();
      if (error) throw error;
      return data && data[0];
    },
    where(field) {
      return {
        equals(value) {
          return {
            async first() {
              const { data, error } = await supabase.from(name).select("*").eq(field, value).limit(1).maybeSingle();
              if (error) throw error;
              return data;
            }
          };
        }
      };
    }
  };
}

export const db = {
  users: table("users"),
  loginRecords: table("login_records")
};

export async function migrateUsers() {
  try {
    const old = JSON.parse(localStorage.getItem("sugarlog.users") || "[]");
    if (!old.length) return;
    for (const u of old) {
      const exists = await db.users.where("email").equals(u.email).first();
      if (!exists) await db.users.add({ name: u.name, email: u.email, password: u.password });
    }
  } catch (e) { }
}