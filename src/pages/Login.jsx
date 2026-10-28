import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, migrateUsers } from "../db";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async e => {
    e.preventDefault();
    await migrateUsers();
    const em = email.trim();
    const pw = password.trim();
    const u = await db.users.where("email").equals(em).first();
    if (!u || u.password !== pw) { setErr("Invalid email or password."); return; }
    await db.loginRecords.add({ email: u.email, action: "login", timestamp: Date.now() });
    localStorage.setItem("sugarlog.user", JSON.stringify({ email: u.email, name: u.name }));
    navigate("/dashboard");
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="Sugar Log" style={{ width: 36, height: 36, borderRadius: 12, objectFit: "cover" }} /><b style={{ fontSize: 18 }}>Sugar Log</b></div>
        <h1>Welcome back</h1>
        <p className="sub">Log in to view your readings.</p>
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></div>
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit">Log in</button>
        </form>
        <div className="switch">Don't have an account? <Link to="/signup">Sign up</Link></div>
      </div>
    </div>
  );
}
