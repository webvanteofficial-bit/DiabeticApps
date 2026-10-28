import Dexie from "dexie";

export const db = new Dexie("sugarlog");
db.version(1).stores({
  users: "++id,&email,name,password",
  loginRecords: "++id,email,action,timestamp"
});

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