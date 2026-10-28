import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const validateEmail = v => !v.trim() ? "Please enter a valid email" : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Please enter a valid email";
const validatePassword = v => {
  if (!v) return "Please enter a password";
  if (v.length < 8) return "Password must be at least 8 characters";
  if (/\s/.test(v)) return "Password cannot contain spaces";
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return "Use at least one letter and one number";
  return "";
};
const validateConfirm = (v, pwd) => {
  if (!v) return "Please confirm your password";
  if (v !== pwd) return "Passwords do not match";
  return "";
};

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });
  const [errors, setErrors] = useState({ name: "", email: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const touch = field => setTouched(prev => ({ ...prev, [field]: true }));

  const handleNameChange = v => {
    setName(v);
    if (touched.name) setErrors(prev => ({ ...prev, name: v.trim() ? "" : "Please enter your name" }));
  };
  const handleEmailChange = v => {
    setEmail(v);
    if (touched.email) setErrors(prev => ({ ...prev, email: validateEmail(v) }));
  };
  const handlePasswordChange = v => {
    setPassword(v);
    if (touched.password) setErrors(prev => ({ ...prev, password: validatePassword(v) }));
    if (touched.confirm) setErrors(prev => ({ ...prev, confirm: validateConfirm(confirm, v) }));
  };
  const handleConfirmChange = v => {
    setConfirm(v);
    if (touched.confirm) setErrors(prev => ({ ...prev, confirm: validateConfirm(v, password) }));
  };

  const blur = field => {
    touch(field);
    if (field === "name") setErrors(prev => ({ ...prev, name: name.trim() ? "" : "Please enter your name" }));
    if (field === "email") setErrors(prev => ({ ...prev, email: validateEmail(email) }));
    if (field === "password") setErrors(prev => ({ ...prev, password: validatePassword(password) }));
    if (field === "confirm") setErrors(prev => ({ ...prev, confirm: validateConfirm(confirm, password) }));
  };

  const submit = async e => {
    e.preventDefault();
    const newErrors = {
      name: name.trim() ? "" : "Please enter your name",
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirm(confirm, password)
    };
    setErrors(newErrors);
    setTouched({ name: true, email: true, password: true, confirm: true });
    const first = ["name", "email", "password", "confirm"].find(f => newErrors[f]);
    if (first) {
      const ref = { name: nameRef, email: emailRef, password: passwordRef, confirm: confirmRef }[first];
      ref?.current?.focus();
      return;
    }
    const nm = name.trim();
    const em = email.trim();
    const pwd = password.trim();
    const { error } = await supabase.auth.signUp({ email: em, password: pwd, options: { data: { name: nm } } });
    if (error) { setErr(error.message); return; }
    localStorage.setItem("sugarlog.user", JSON.stringify({ email: em, name: nm }));
    navigate("/dashboard");
  };

  const borderStyle = (field, value) => {
    if (errors[field]) return { borderColor: "var(--danger)" };
    if (touched[field] && value) return { borderColor: "#4cbf7a", borderWidth: 2 };
    return {};
  };

  const Eye = ({ show, toggle }) => (
    <button type="button" onClick={toggle} aria-label={show ? "Hide password" : "Show password"} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "var(--mute)", padding: 0 }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
      )}
    </button>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="Sugar Log" style={{ width: 36, height: 36, borderRadius: 12, objectFit: "cover" }} /><b style={{ fontSize: 18 }}>Sugar Log</b></div>
        <h1>Create account</h1>
        <p className="sub">Sign up to start tracking your sugar.</p>
        <form onSubmit={submit}>
          <div className="field"><label>Name</label><input ref={nameRef} required value={name} onChange={e => handleNameChange(e.target.value)} onBlur={() => blur("name")} placeholder="Your name" style={borderStyle("name", name)} />{errors.name && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{errors.name}</p>}</div>
          <div className="field"><label>Email</label><input ref={emailRef} type="email" required value={email} onChange={e => handleEmailChange(e.target.value)} onBlur={() => blur("email")} placeholder="you@example.com" style={borderStyle("email", email)} />{errors.email && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{errors.email}</p>}</div>
          <div className="field"><label>Password</label>
            <div style={{ position: "relative" }}>
              <input ref={passwordRef} type={showPwd ? "text" : "password"} required value={password} onChange={e => handlePasswordChange(e.target.value)} onBlur={() => blur("password")} placeholder="At least 8 characters" style={{ ...borderStyle("password", password), paddingRight: 36 }} />
              <Eye show={showPwd} toggle={() => setShowPwd(s => !s)} />
            </div>
            {errors.password && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{errors.password}</p>}
          </div>
          <div className="field"><label>Confirm password</label>
            <div style={{ position: "relative" }}>
              <input ref={confirmRef} type={showConfirm ? "text" : "password"} required value={confirm} onChange={e => handleConfirmChange(e.target.value)} onBlur={() => blur("confirm")} placeholder="Repeat password" style={{ ...borderStyle("confirm", confirm), paddingRight: 36 }} />
              <Eye show={showConfirm} toggle={() => setShowConfirm(s => !s)} />
            </div>
            {errors.confirm && <p style={{ color: "var(--danger)", fontSize: 12, margin: "4px 0 0" }}>{errors.confirm}</p>}
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn" type="submit">Sign up</button>
        </form>
        <div className="switch">Already have an account? <Link to="/login">Log in</Link></div>
      </div>
    </div>
  );
}