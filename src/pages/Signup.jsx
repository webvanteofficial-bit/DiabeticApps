import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { db, migrateUsers } from "../db";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const submit = async e => {
    e.preventDefault();
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { setErr("Password must include at least one special character."); return; }
    if (password !== confirm) { setErr("Passwords do not match."); return; }
    await migrateUsers();
    const existing = await db.users.where("email").equals(email).first();
    if (existing) { setErr("An account with this email already exists."); return; }
    await db.users.add({ name, email, password });
    await db.loginRecords.add({ email, action: "signup", timestamp: Date.now() });
    const users = JSON.parse(localStorage.getItem("sugarlog.users") || "[]");
    users.push({ name, email, password });
    localStorage.setItem("sugarlog.users", JSON.stringify(users));
    localStorage.setItem("sugarlog.user", JSON.stringify({ email, name }));
    navigate("/dashboard");
  };
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="Sugar Log" style={{ width: 36, height: 36, borderRadius: 12, objectFit: "cover" }} /><b style={{ fontSize: 18 }}>Sugar Log</b></div>
        <h1>Create account</h1>
        <p className="sub">Sign up to start tracking your sugar.</p>
        <form onSubmit={submit}>
          <div className="field"><label>Name</label><input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></div>
          <div className="field"><label>Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div className="field"><label>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters and one special character" /></div>
          <div className="field"><label>Confirm password</label><input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" /></div>
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit">Sign up</button>
        </form>
        <div className="switch">Already have an account? <Link to="/login">Log in</Link></div>
      </div>
    </div>
  );
}
