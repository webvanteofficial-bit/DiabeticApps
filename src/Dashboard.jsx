import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "./assets/Sugar_Log_Ribbon_Logo.png";
import { db } from "./db";

const LV = [
  [54, "Very low", "🔴", "#f0625a"], [70, "Low", "🟠", "#f59a3d"], [100, "Normal fasting", "🟢", "#4cbf7a"],
  [180, "High, depending on timing", "🟠", "#f59a3d"],
  [250, "High", "🔴", "#f0625a"], [300, "Very high", "🔴", "#d8433b"], [400, "Extremely high", "🚨", "#b3261e"],
  [Infinity, "Dangerously high; urgent medical assessment", "🚨", "#8e1b15"]
];
const lvl = v => LV.find(l => v < l[0]);
const TAGS = ["Fasting", "Before breakfast", "After breakfast", "Before lunch", "After lunch", "Before dinner", "After dinner", "Bedtime"];
const guess = h => h < 7 ? "Fasting" : h < 10 ? "After breakfast" : h < 12 ? "Before lunch" : h < 15 ? "After lunch" : h < 19 ? "Before dinner" : h < 22 ? "After dinner" : "Bedtime";
const pad = n => String(n).padStart(2, "0");
const loc = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = t => new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const day0 = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const KEY = "sugarlog.v1";
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch (e) { return [] } }
function save(x) { try { localStorage.setItem(KEY, JSON.stringify(x)) } catch (e) { } }
const avg = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length);

function Chart({ data, range }) {
  const W = 640, H = 270, L = 34, B = 24, T = 10, now = Date.now(), span = { "24h": 1, "7d": 7, "30d": 30 }[range] * 864e5;
  let bars;
  if (range === "24h") bars = data.filter(r => r.t >= now - span).sort((a, b) => a.t - b.t).map(r => ({ v: r.v, x: (r.t - (now - span)) / span }));
  else {
    const days = range === "7d" ? 7 : 30, m = {};
    data.filter(r => r.t >= now - span).forEach(r => { const k = day0(r.t); (m[k] = m[k] || []).push(r.v); });
    bars = Object.entries(m).map(([k, a]) => ({ v: avg(a), x: Math.min(.98, Math.max(0, (+k - (now - span)) / span + .5 / days)) }));
  }
  if (!bars.length) return <div className="empty"><b>No readings in this period</b>Tap “Add reading” to log one.</div>;
  const max = Math.max(300, ...bars.map(b => b.v)) + 20, Y = v => T + (H - T - B) * (1 - v / max);
  const bw = range === "24h" ? 12 : range === "7d" ? 34 : 11;
  const grid = [0, 100, 200, 300].filter(g => g < max);
  const ticks = range === "24h" ? ["24h ago", "12h ago", "Now"] : range === "7d" ? ["7 days ago", "3 days ago", "Today"] : ["30 days ago", "15 days ago", "Today"];
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Blood sugar bar chart" style={{ display: "block" }}>
    {grid.map(g => <g key={g}><line x1={L} x2={W} y1={Y(g)} y2={Y(g)} stroke="currentColor" opacity=".18" strokeDasharray="3 5" /><text x={0} y={Y(g) + 4} fontSize="11" fill="currentColor" opacity=".55">{g}</text></g>)}
    {[70, 180].map(g => <line key={g} x1={L} x2={W} y1={Y(g)} y2={Y(g)} stroke="#5b4bc4" opacity=".45" strokeDasharray="6 4" />)}
    {bars.map((b, i) => <rect key={i} x={L + (W - L - bw) * b.x} y={Y(b.v)} width={bw} height={Math.max(2, H - B - Y(b.v))} rx="4" fill={lvl(b.v)[3]} />)}
    {ticks.map((t, i) => <text key={i} x={L + (W - L) * i / 2} y={H - 6} fontSize="11" fill="currentColor" opacity=".55" textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}>{t}</text>)}
  </svg>;
}

function Urgent({ v }) {
  if (v < 54) return <div className="alert">🔴 Very low sugar. Treat it now with fast sugar and get help if you do not recover.</div>;
  if (v >= 400) return <div className="alert">🚨 Dangerously high. Urgent medical assessment is needed. Contact a doctor or go to emergency care.</div>;
  if (v >= 300) return <div className="alert">🚨 Extremely high. Contact your doctor today.</div>;
  return null;
}

function Add({ onSave, onClose }) {
  const [v, setV] = useState(""); const [dt, setDt] = useState(loc(new Date()));
  const [tag, setTag] = useState(guess(new Date().getHours())); const [n, setN] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const [recentCustom, setRecentCustom] = useState(() => { try { return JSON.parse(localStorage.getItem("sugarlog.customEvents") || "[]"); } catch (e) { return []; } });
  const num = parseInt(v, 10), ok = num >= 20 && num <= 800;
  const canSave = ok && !(customMode && !customText.trim());
  const chg = e => { setDt(e.target.value); const d = new Date(e.target.value); if (!isNaN(d)) setTag(guess(d.getHours())); };
  const saveCustomEvent = (text) => {
    const next = [text, ...recentCustom.filter(x => x !== text)].slice(0, 5);
    setRecentCustom(next);
    try { localStorage.setItem("sugarlog.customEvents", JSON.stringify(next)); } catch (e) { }
  };
  return <div className="sheet" onClick={onClose}><div onClick={e => e.stopPropagation()}>
    <h2 style={{ fontSize: 20, marginBottom: 12 }}>Add reading</h2>
    <input className="num" inputMode="numeric" autoFocus placeholder="mg/dL" value={v} onChange={e => setV(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-label="Blood sugar in mg/dL" />
    <label>Date and time (filled in automatically)</label>
    <input type="datetime-local" value={dt} onChange={chg} />
    <label>When was it?</label>
    <div className="chips">
      {TAGS.map(t => <button key={t} className={"chip" + (!customMode && tag === t ? " on" : "")} onClick={() => { setCustomMode(false); setTag(t); }}>{t}</button>)}
      <button className={"chip" + (customMode ? " on" : "")} style={{ borderStyle: "dashed" }} onClick={() => { setCustomMode(true); if (customText) setTag(customText); }}>+ Custom</button>
      {recentCustom.map(c => <button key={c} className={"chip" + (!customMode && tag === c ? " on" : "")} onClick={() => { setCustomMode(false); setTag(c); }}>{c}</button>)}
    </div>
    {customMode && <input style={{ marginTop: 8 }} placeholder="Type your own event, e.g. After walking" value={customText} maxLength={30} onChange={e => { setCustomText(e.target.value); setTag(e.target.value); }} />}
    {customMode && !customText.trim() && <p style={{ color: "var(--danger)", fontSize: 13, margin: "6px 0 0" }}>Please type your event</p>}
    <label>Note (optional)</label>
    <input placeholder="Meal, exercise, illness…" value={n} onChange={e => setN(e.target.value)} />
    <button className="btn" disabled={!canSave} style={{ opacity: canSave ? 1 : .5 }} onClick={() => {
      let finalTag = tag;
      if (customMode) {
        const ct = customText.trim();
        if (!ct) return;
        finalTag = ct;
        saveCustomEvent(ct);
      }
      onSave({ id: Date.now(), v: num, t: new Date(dt).getTime() || Date.now(), tag: finalTag, n });
      onClose();
    }}>Save reading</button>
    <button className="btn alt" onClick={onClose}>Cancel</button>
  </div></div>;
}

function Row({ r, del }) {
  const l = lvl(r.v); return <div className="row">
    <div><b style={{ fontWeight: 600 }}>{l[2]} {l[1]}</b><small>{r.tag} · {fmt(r.t)}{r.n ? " · " + r.n : ""}</small></div>
    <div style={{ textAlign: "right" }}><div className="v" style={{ color: l[3] }}>{r.v}</div>{del && <button type="button" className="chip noprint" style={{ padding: "1px 9px", fontSize: 12, marginTop: 4 }} onClick={(e) => { e.stopPropagation(); del(r.id); }}>Delete</button>}</div></div>;
}

function Stats({ list, label }) {
  const vs = list.map(r => r.v), has = vs.length;
  const c = [["Average", has ? avg(vs) : "–", "mg/dL, " + label], ["In range", has ? Math.round(vs.filter(v => v >= 70 && v <= 180).length / vs.length * 100) + "%" : "–", "Between 70 and 180"], ["Highest", has ? Math.max(...vs) : "–", "mg/dL"], ["Lowest", has ? Math.min(...vs) : "–", "mg/dL"]];
  return <div className="card stats">{c.map(x => <div className="stat" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]}</small></div>)}</div>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(load); const [tab, setTab] = useState("home"); const [range, setRange] = useState("7d"); const [adding, setAdding] = useState(false);
  const [dbUsers, setDbUsers] = useState([]); const [dbRecords, setDbRecords] = useState([]);
  useEffect(() => save(data), [data]);
  useEffect(() => {
    if (tab !== "admin") return;
    (async () => {
      const u = await db.users.toArray();
      const r = await db.loginRecords.toArray();
      setDbUsers(u);
      setDbRecords(r.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
    })();
  }, [tab]);
  const sorted = useMemo(() => [...data].sort((a, b) => b.t - a.t), [data]);
  const span = { "24h": 1, "7d": 7, "30d": 30 }[range] * 864e5, lab = { "24h": "last 24h", "7d": "last 7 days", "30d": "last 30 days" }[range];
  const inR = sorted.filter(r => r.t >= Date.now() - span), last = sorted[0];
  const byTag = TAGS.map(t => { const a = inR.filter(r => r.tag === t).map(r => r.v); return { t, n: a.length, a: a.length ? avg(a) : 0 }; }).filter(x => x.n);
  const sample = () => { const o = [], tg = [[7, "Fasting"], [10, "After breakfast"], [13, "After lunch"], [20, "After dinner"]]; for (let d = 0; d < 30; d++) tg.forEach(([h, t], i) => { const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(h, 15, 0, 0); if (dt.getTime() > Date.now()) return; o.push({ id: dt.getTime() + i, t: dt.getTime(), tag: t, v: Math.round((i ? 150 : 105) + Math.random() * 70 - 20), n: "" }); }); setData(o); };
  const Tabs = () => [["home", "Overview"], ["history", "History"], ["report", "Report"], ["admin", "Database"]].map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>);
  const l30 = sorted.filter(r => r.t >= Date.now() - 30 * 864e5);
  const downloadPdf = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let logoHeight = 0;
    let logoLoaded = false;
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = logoUrl; });
      const w = 35;
      const h = (img.naturalHeight / img.naturalWidth) * w;
      doc.addImage(img, "PNG", 14, 10, w, h);
      logoHeight = h;
      logoLoaded = true;
    } catch (e) { logoLoaded = false; }
    const titleX = logoLoaded ? 54 : 14;
    const titleY = logoLoaded ? 18 : 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Blood sugar report", titleX, titleY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, titleX, titleY + 6);
    const body = l30.map(r => [fmt(r.t), r.tag, r.n || "-", String(r.v)]);
    const startY = logoLoaded ? 14 + logoHeight + 6 : 30;
    autoTable(doc, {
      startY,
      head: [["Date", "When", "Note", "mg/dL"]],
      body,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 10, cellPadding: 3, lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: { 3: { fontStyle: "bold", halign: "center" } },
      margin: { left: 14, right: 14 }
    });
    doc.save(`blood-sugar-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  const user = JSON.parse(localStorage.getItem("sugarlog.user") || "{}");
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
  const logout = () => { localStorage.removeItem("sugarlog.user"); navigate("/login"); };
  return <div className="app">
    <div className="top">
      <div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src="/logo.png" alt="Sugar Log" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }} /><h1 style={{ margin: 0 }}>{tab === "home" ? "Overview" : tab === "history" ? "History" : "Report"}</h1></div>
        <p className="sub">{tab === "home" ? "How your sugar looked over the " + lab + "." : tab === "history" ? "All readings, newest first." : "Last 30 days " + new Date().toLocaleDateString()}</p></div>
      <div className="tools noprint">
        {tab === "home" && <div className="seg">{["24h", "7d", "30d"].map(r => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}</div>}
        <div className="seg dnav"><Tabs /></div>
        <div className="userchip"><div className="avatar">{initial}</div><span>{user.name || user.email}</span></div>
        <button className="pbtn main addtop" onClick={() => setAdding(true)}>+ Add reading</button>
        <button className="pbtn" onClick={logout}>Log out</button>
      </div>
    </div>

    {tab === "home" && <>
      <Stats list={inR} label={lab} />
      <div className="card" style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ecebfa", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5b4bc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" /></svg>
        </div>
        <div>
          <b style={{ display: "block", marginBottom: 4 }}>Quick tip</b>
          <p style={{ margin: 0, color: "var(--mute)", fontSize: 14 }}>Type your reading in the box whenever you check your sugar. You don’t need to write anything else.</p>
          <p style={{ margin: "4px 0 0", color: "var(--mute)", fontSize: 14 }}>After 30 days, download the report and show it to your doctor.</p>
        </div>
      </div>
      <div className="main2">
        <div className="card"><div className="head"><div><h2>Readings</h2><p className="sub">{inR.length} in this period{range !== "24h" ? " · daily average" : ""}</p></div></div><Chart data={data} range={range} /></div>
        <div className="card"><h2>Latest reading</h2><p className="sub" style={{ marginBottom: 16 }}>{last ? last.tag + " · " + fmt(last.t) : "Nothing logged yet"}</p>
          {last ? <><Urgent v={last.v} /><div className="big" style={{ color: lvl(last.v)[3] }}>{last.v}</div><p style={{ margin: "10px 0 0" }}><span className="pill" style={{ background: lvl(last.v)[3] }}>{lvl(last.v)[2]} {lvl(last.v)[1]}</span></p></>
            : <div className="empty"><b>No readings yet</b>Add one, or try sample data.<br /><br /><button className="pbtn" onClick={sample}>Load sample data</button></div>}</div>
      </div>
      <div className="two">
        <div className="card"><div className="head"><h2>Average by time of day</h2></div>
          {byTag.length ? byTag.map(x => <div className="tg" key={x.t}><div><span>{x.t}</span><small>{x.n} {x.n === 1 ? "reading" : "readings"} · {x.a} mg/dL</small></div><div className="bar"><i style={{ width: Math.min(100, x.a / 3) + "%", background: lvl(x.a)[3] }} /></div></div>) : <div className="empty">No readings in this period.</div>}</div>
        <div className="card"><div className="head"><h2>Latest readings</h2><button className="link" onClick={() => setTab("history")}>View all</button></div>
          {sorted.slice(0, 4).map(r => <Row key={r.id} r={r} />)}{!sorted.length && <div className="empty">No readings yet.</div>}</div>
      </div></>}

    {tab === "history" && <div className="card">{sorted.length ? sorted.map(r => <Row key={r.id} r={r} />) : <div className="empty">No readings yet.</div>}</div>}

    {tab === "report" && <>
      <div className="card scroll" style={{ marginBottom: 18 }}><h2 style={{ marginBottom: 8 }}>All readings ({l30.length})</h2>
        <table><thead><tr><th>Date</th><th>When</th><th>Note</th><th>mg/dL</th><th>Level</th></tr></thead><tbody>
          {l30.map(r => <tr key={r.id}><td>{fmt(r.t)}</td><td>{r.tag}</td><td>{r.n || "-"}</td><td><b>{r.v}</b></td><td>{lvl(r.v)[2]} {lvl(r.v)[1]}</td></tr>)}</tbody></table></div>
      <div className="report-actions noprint">
        <button className="btn" onClick={downloadPdf}>Download PDF</button>
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div></>}

    {tab === "admin" && <>
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginBottom: 8 }}>Database overview</h2>
        <p className="sub" style={{ marginBottom: 12 }}>Total users: {dbUsers.length} · Total login records: {dbRecords.length}</p>
        <h3 style={{ fontSize: 14, margin: "12px 0 6px" }}>Users</h3>
        <div className="scroll"><table><thead><tr><th>Name</th><th>Email</th></tr></thead><tbody>
          {dbUsers.map(u => <tr key={u.id || u.email}><td>{u.name}</td><td>{u.email}</td></tr>)}
        </tbody></table></div>
        <h3 style={{ fontSize: 14, margin: "12px 0 6px" }}>Login records</h3>
        <div className="scroll"><table><thead><tr><th>Email</th><th>Action</th><th>When</th></tr></thead><tbody>
          {dbRecords.map(r => <tr key={r.id}><td>{r.email}</td><td>{r.action}</td><td>{new Date(r.timestamp).toLocaleString()}</td></tr>)}
        </tbody></table></div>
      </div></>}

    <button className="fab noprint" onClick={() => setAdding(true)}>+ Add reading</button>
    {adding && <Add onSave={r => setData(d => [...d, r])} onClose={() => setAdding(false)} />}
    <div className="bnav noprint"><Tabs /></div>
  </div>;
}
