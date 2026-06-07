import { useState, useEffect, useCallback, useRef } from "react";
import { storage } from "./storage.js";

// ── USER PROFIL (hier anpassen!) ─────────────────────────────────────────────
const USER = {
  name: "Student",
  geburtsdatum: "2004-01-11",
  groesse: 178,
  gewichtStart: 78,
  uni: "HAW Kiel",
  studiengang: "Maschinenbau",
  stadt: "Kiel",
};

function getAlter() {
  const b = new Date(USER.geburtsdatum);
  const h = new Date();
  let age = h.getFullYear() - b.getFullYear();
  if (h < new Date(h.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}
function getBMI(kg) { return (kg / ((USER.groesse / 100) ** 2)).toFixed(1); }
function getBMILabel(bmi) {
  if (bmi < 18.5) return { label: "Untergewicht", color: "#38bdf8" };
  if (bmi < 25)   return { label: "Normalgewicht ✓", color: "#6ee7b7" };
  if (bmi < 30)   return { label: "Übergewicht", color: "#fbbf24" };
  return { label: "Adipositas", color: "#ef4444" };
}
function getTDEE(kg, aktiv = 1.55) {
  const bmr = 10 * kg + 6.25 * USER.groesse - 5 * getAlter() + 5;
  return Math.round(bmr * aktiv);
}

const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const WORKOUT_TEMPLATES = {
  Push: [
    { name: "Bankdrücken", muskel: "Brust" },
    { name: "Schrägbankdrücken", muskel: "Brust" },
    { name: "Schulterdrücken (OHP)", muskel: "Schultern" },
    { name: "Seitheben", muskel: "Schultern" },
    { name: "Trizeps Pushdown", muskel: "Trizeps" },
    { name: "Dips", muskel: "Trizeps" },
  ],
  Pull: [
    { name: "Klimmzüge", muskel: "Rücken" },
    { name: "Latzug", muskel: "Rücken" },
    { name: "Kabelrudern", muskel: "Rücken" },
    { name: "Langhantelrudern", muskel: "Rücken" },
    { name: "Bizeps Curls", muskel: "Bizeps" },
    { name: "Hammer Curls", muskel: "Bizeps" },
  ],
  Legs: [
    { name: "Kniebeugen", muskel: "Quadrizeps" },
    { name: "Beinpresse", muskel: "Quadrizeps" },
    { name: "Romanian Deadlift", muskel: "Hamstrings" },
    { name: "Beinbeuger", muskel: "Hamstrings" },
    { name: "Hip Thrust", muskel: "Gesäß" },
    { name: "Wadenheben", muskel: "Waden" },
  ],
  Upper: [
    { name: "Bankdrücken", muskel: "Brust" },
    { name: "Klimmzüge", muskel: "Rücken" },
    { name: "Schulterdrücken", muskel: "Schultern" },
    { name: "Bizeps Curls", muskel: "Bizeps" },
    { name: "Trizeps Pushdown", muskel: "Trizeps" },
  ],
  Cardio: [
    { name: "Laufen", muskel: "Ausdauer" },
    { name: "Radfahren", muskel: "Ausdauer" },
    { name: "Rudern (Ergometer)", muskel: "Ausdauer" },
    { name: "Sprints", muskel: "Ausdauer" },
  ],
};

function getTodayKey() { return new Date().toISOString().split("T")[0]; }
function getDayIndex() { return (new Date().getDay() + 6) % 7; }
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function getInitialTageslog() {
  return {
    ziele: [], hausaufgaben: [], lernplan: [],
    ernaehrung: { fruehstueck: "", mittagessen: "", abendessen: "", snacks: "", wasser: 0, protein: "", kalorien: "" },
    gym: { trainiert: false, art: "", dauer: "", intensitaet: 3, uebungen: [], notiz: "" },
    schlaf: { einschlafen: "", aufwachen: "", stunden: "", qualitaet: 50 },
    mood: 0, energie: 0, stress: 0, fokus: 0, produktivitaet: 0, ernaehrungBewertung: 0,
    notiz: "", supplements: [], gewicht: "", koerperfett: "",
  };
}
const INITIAL_DATA = {
  stundenplan: { Mo: [], Di: [], Mi: [], Do: [], Fr: [], Sa: [], So: [] },
  klausuren: [], tageslog: {},
};

// ── SHARED STYLES ─────────────────────────────────────────────────────────────
const iS = (done) => ({
  background: "#111827", border: "1px solid #1e2535", borderRadius: 7,
  color: done ? "#4a5580" : "#dde3f0", padding: "5px 8px", fontSize: 13,
  outline: "none", width: "100%", textDecoration: done ? "line-through" : "none",
  boxSizing: "border-box",
});
const rB = { background: "none", border: "none", color: "#4a5580", cursor: "pointer", fontSize: 18, padding: "0 3px", lineHeight: 1, flexShrink: 0 };
const aB = (c) => ({ background: "none", border: `1px dashed ${c}`, borderRadius: 7, color: c, padding: "5px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 4 });
const smallBtn = { background: "#1e2535", border: "1px solid #2a3550", color: "#dde3f0", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" };

function Card({ title, icon, children, color = "#6ee7b7", fullWidth = false }) {
  return (
    <div style={{ background: "#0d1120", border: "1px solid #1e2535", borderRadius: 14, padding: 16, borderLeft: `3px solid ${color}`, ...(fullWidth ? { gridColumn: "1/-1" } : {}) }}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 12, color, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        <span style={{ fontSize: 16 }}>{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState("heute");
  const [loaded, setLoaded] = useState(false);
  const todayKey = getTodayKey();
  const todayIdx = getDayIndex();

  useEffect(() => {
    async function load() {
      try {
        const res = await storage.get("dashboard_v3");
        if (res?.value) setData({ ...INITIAL_DATA, ...JSON.parse(res.value) });
      } catch (e) {}
      setLoaded(true);
    }
    load();
  }, []);

  const save = useCallback(async (d) => {
    try { await storage.set("dashboard_v3", JSON.stringify(d)); } catch (e) {}
  }, []);

  function updateData(nd) { setData(nd); save(nd); }
  function getTodayLog() { return data.tageslog[todayKey] || getInitialTageslog(); }
  function updateTodayLog(log) { updateData({ ...data, tageslog: { ...data.tageslog, [todayKey]: log } }); }

  // ── DATA SYNC (Export/Import für geräteübergreifende Nutzung) ───────────────
  function exportData() {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `dashboard-backup-${getTodayKey()}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        updateData({ ...INITIAL_DATA, ...parsed });
        alert("✅ Daten erfolgreich importiert!");
      } catch { alert("❌ Fehler beim Importieren. Ist es eine gültige Dashboard-Datei?"); }
    };
    reader.readAsText(file);
  }

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#080b14", color: "#6ee7b7", fontFamily: "monospace" }}>
      ⚙️ Lade Dashboard…
    </div>
  );

  const tabs = [
    { id: "heute", label: "🏠 Heute" },
    { id: "stundenplan", label: "📅 Plan" },
    { id: "klausuren", label: "✍️ Klausuren" },
    { id: "gym", label: "💪 Gym" },
    { id: "health", label: "❤️ Health" },
    { id: "pomodoro", label: "🍅 Fokus" },
    { id: "profil", label: "👤 Profil" },
    { id: "sync", label: "🔄 Sync" },
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#080b14", minHeight: "100vh", color: "#dde3f0" }}>
      <Header log={getTodayLog()} />
      <div style={{ display: "flex", background: "#0d1120", borderBottom: "1px solid #1e2535", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "11px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
            whiteSpace: "nowrap", background: "none",
            borderBottom: activeTab === t.id ? "2px solid #6ee7b7" : "2px solid transparent",
            color: activeTab === t.id ? "#6ee7b7" : "#6677aa", transition: "all .2s"
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: "20px", maxWidth: 1150, margin: "0 auto" }}>
        {activeTab === "heute" && <HeuteTab log={getTodayLog()} update={updateTodayLog} />}
        {activeTab === "stundenplan" && <StundenplanTab data={data} updateData={updateData} todayIdx={todayIdx} />}
        {activeTab === "klausuren" && <KlausurenTab data={data} updateData={updateData} />}
        {activeTab === "gym" && <GymTab log={getTodayLog()} update={updateTodayLog} allLogs={data.tageslog} />}
        {activeTab === "health" && <HealthTab log={getTodayLog()} update={updateTodayLog} allLogs={data.tageslog} />}
        {activeTab === "pomodoro" && <PomodoroTab />}
        {activeTab === "profil" && <ProfilTab log={getTodayLog()} allLogs={data.tageslog} />}
        {activeTab === "sync" && <SyncTab exportData={exportData} importData={importData} />}
      </div>
    </div>
  );
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function Header({ log }) {
  const done = (log.ziele || []).filter(z => z.done).length;
  const total = (log.ziele || []).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ background: "linear-gradient(135deg,#0d1120,#111827)", borderBottom: "1px solid #1e2535", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, background: "linear-gradient(90deg,#6ee7b7,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ⚙️ MachBau Dashboard
        </div>
        <div style={{ fontSize: 11, color: "#4a5580", marginTop: 2 }}>
          {USER.studiengang} · {USER.uni} · {getAlter()} J. · {USER.groesse}cm · {USER.stadt}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ background: "#111827", border: "1px solid #1e2535", borderRadius: 10, padding: "8px 14px" }}>
          <div style={{ fontSize: 11, color: "#4a5580", marginBottom: 4 }}>Ziele {done}/{total}</div>
          <div style={{ background: "#1e2535", borderRadius: 99, height: 6, width: 100 }}>
            <div style={{ background: "linear-gradient(90deg,#6ee7b7,#3b82f6)", borderRadius: 99, height: 6, width: `${pct}%`, transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 10, color: "#6ee7b7", marginTop: 3, fontWeight: 700 }}>{pct}%</div>
        </div>
        {[
          { icon: "😴", val: log.schlaf?.stunden ? `${log.schlaf.stunden}h` : "–", label: "Schlaf", c: "#a78bfa" },
          { icon: "💧", val: `${log.ernaehrung?.wasser || 0}/8`, label: "Wasser", c: "#38bdf8" },
          { icon: "😊", val: log.mood ? ["","😤","😕","😐","🙂","😄"][log.mood] : "–", label: "Mood", c: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", background: "#111827", border: "1px solid #1e2535", borderRadius: 10, padding: "6px 10px" }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: s.c }}>{s.val}</div>
            <div style={{ fontSize: 10, color: "#4a5580" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HEUTE TAB ─────────────────────────────────────────────────────────────────
function HeuteTab({ log, update }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
      <ZieleCard log={log} update={update} />
      <HausaufgabenCard log={log} update={update} />
      <LernplanCard log={log} update={update} />
      <ErnaehrungCard log={log} update={update} />
      <BewertungCard log={log} update={update} />
      <NotizCard log={log} update={update} />
    </div>
  );
}

function ZieleCard({ log, update }) {
  const z = log.ziele || [];
  const prios = ["🔴 Wichtig", "🟡 Normal", "🟢 Optional"];
  return (
    <Card title="Tagesziele" icon="🎯" color="#6ee7b7">
      {z.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}>
          <input type="checkbox" checked={item.done} onChange={() => { const a=[...z]; a[i]={...a[i],done:!a[i].done}; update({...log,ziele:a}); }} style={{ accentColor: "#6ee7b7", width: 16, height: 16, flexShrink: 0 }} />
          <select value={item.prio||1} onChange={e=>{const a=[...z];a[i]={...a[i],prio:Number(e.target.value)};update({...log,ziele:a});}} style={{ background:"#111827",border:"1px solid #1e2535",color:"#dde3f0",borderRadius:6,fontSize:11,padding:"3px 4px" }}>
            {prios.map((p,pi)=><option key={pi} value={pi}>{p}</option>)}
          </select>
          <input value={item.text} onChange={e=>{const a=[...z];a[i].text=e.target.value;update({...log,ziele:a});}} placeholder="Ziel…" style={iS(item.done)} />
          <button onClick={()=>update({...log,ziele:z.filter((_,j)=>j!==i)})} style={rB}>×</button>
        </div>
      ))}
      <button onClick={()=>update({...log,ziele:[...z,{text:"",done:false,prio:1}]})} style={aB("#6ee7b7")}>+ Ziel</button>
    </Card>
  );
}

function HausaufgabenCard({ log, update }) {
  const h = log.hausaufgaben || [];
  return (
    <Card title="Hausaufgaben & Abgaben" icon="📝" color="#f59e0b">
      {h.map((item, i) => (
        <div key={i} style={{ background:"#111827",borderRadius:8,padding:"8px",marginBottom:6 }}>
          <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:4 }}>
            <input type="checkbox" checked={item.done} onChange={()=>{const a=[...h];a[i].done=!a[i].done;update({...log,hausaufgaben:a});}} style={{ accentColor:"#f59e0b",width:16,height:16 }} />
            <input value={item.fach} onChange={e=>{const a=[...h];a[i].fach=e.target.value;update({...log,hausaufgaben:a});}} placeholder="Fach" style={{...iS(false),width:90}} />
            <input value={item.text} onChange={e=>{const a=[...h];a[i].text=e.target.value;update({...log,hausaufgaben:a});}} placeholder="Aufgabe…" style={iS(item.done)} />
            <button onClick={()=>update({...log,hausaufgaben:h.filter((_,j)=>j!==i)})} style={rB}>×</button>
          </div>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            <span style={{ fontSize:10,color:"#4a5580" }}>Deadline:</span>
            <input type="date" value={item.deadline||""} onChange={e=>{const a=[...h];a[i].deadline=e.target.value;update({...log,hausaufgaben:a});}} style={{...iS(false),fontSize:11}} />
          </div>
        </div>
      ))}
      <button onClick={()=>update({...log,hausaufgaben:[...h,{text:"",done:false,fach:"",deadline:""}]})} style={aB("#f59e0b")}>+ Aufgabe</button>
    </Card>
  );
}

function LernplanCard({ log, update }) {
  const lp = log.lernplan || [];
  const total = lp.reduce((s,l)=>s+Number(l.dauer||0),0);
  const methoden = ["","Karteikarten","Zusammenfassung","Übungsaufgaben","Video","Lerngruppe","Altklausuren"];
  return (
    <Card title="Lernplan" icon="📖" color="#a78bfa">
      {lp.map((l, i) => (
        <div key={i} style={{ background:"#111827",borderRadius:8,padding:8,marginBottom:6 }}>
          <div style={{ display:"flex",gap:6,alignItems:"center",marginBottom:4 }}>
            <input type="checkbox" checked={l.done} onChange={()=>{const a=[...lp];a[i].done=!a[i].done;update({...log,lernplan:a});}} style={{ accentColor:"#a78bfa",width:16,height:16 }} />
            <input value={l.fach} onChange={e=>{const a=[...lp];a[i].fach=e.target.value;update({...log,lernplan:a});}} placeholder="Fach / Thema" style={{...iS(l.done),flex:2}} />
            <input type="number" value={l.dauer} onChange={e=>{const a=[...lp];a[i].dauer=e.target.value;update({...log,lernplan:a});}} style={{...iS(false),width:50}} />
            <span style={{ fontSize:11,color:"#4a5580" }}>min</span>
          </div>
          <select value={l.methode||""} onChange={e=>{const a=[...lp];a[i].methode=e.target.value;update({...log,lernplan:a});}} style={{ background:"#0d1120",border:"1px solid #1e2535",color:"#6677aa",borderRadius:6,fontSize:11,padding:"3px 6px",width:"100%" }}>
            {methoden.map(m=><option key={m} value={m}>{m||"Lernmethode wählen…"}</option>)}
          </select>
        </div>
      ))}
      {lp.length>0 && <div style={{ color:"#a78bfa",fontSize:12,margin:"4px 0",fontWeight:600 }}>∑ {total} min = {Math.floor(total/60)}h {total%60}min</div>}
      <button onClick={()=>update({...log,lernplan:[...lp,{fach:"",dauer:60,done:false,methode:""}]})} style={aB("#a78bfa")}>+ Lernblock</button>
    </Card>
  );
}

function ErnaehrungCard({ log, update }) {
  const e = log.ernaehrung || {};
  const kg = log.gewicht || USER.gewichtStart;
  const tdee = getTDEE(kg);
  const set = (f,v) => update({...log,ernaehrung:{...e,[f]:v}});
  const kal = Number(e.kalorien||0);
  const diff = kal - tdee;
  return (
    <Card title="Ernährung" icon="🥗" color="#34d399">
      <div style={{ background:"#111827",borderRadius:8,padding:"8px 10px",marginBottom:10,display:"flex",justifyContent:"space-between" }}>
        <span style={{ fontSize:11,color:"#4a5580" }}>TDEE-Ziel</span>
        <span style={{ fontWeight:700,color:"#34d399" }}>{tdee} kcal</span>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10 }}>
        {[["fruehstueck","🌅 Frühstück"],["mittagessen","☀️ Mittagessen"],["abendessen","🌙 Abendessen"],["snacks","🍎 Snacks"]].map(([f,l])=>(
          <div key={f}>
            <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>{l}</div>
            <input value={e[f]||""} onChange={ev=>set(f,ev.target.value)} placeholder="Was gegessen?" style={{...iS(false),width:"100%"}} />
          </div>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10 }}>
        <div>
          <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>🔥 Kalorien</div>
          <input type="number" value={e.kalorien||""} onChange={ev=>set("kalorien",ev.target.value)} placeholder={`Ziel: ${tdee}`} style={iS(false)} />
          {kal>0 && <div style={{ fontSize:10,marginTop:3,color:diff>200?"#fbbf24":diff<-300?"#38bdf8":"#6ee7b7",fontWeight:600 }}>{diff>0?`+${diff} Überschuss`:`${diff} Defizit`} kcal</div>}
        </div>
        <div>
          <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>💪 Protein — Ziel: {Math.round(kg*2)}g</div>
          <input type="number" value={e.protein||""} onChange={ev=>set("protein",ev.target.value)} placeholder={`${Math.round(kg*2)}g`} style={iS(false)} />
          {e.protein>0 && <div style={{ fontSize:10,marginTop:3,color:e.protein>=kg*1.8?"#6ee7b7":"#f59e0b" }}>{e.protein>=kg*1.8?"✓ Gut":`Noch ${Math.round(kg*2-e.protein)}g fehlen`}</div>}
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <span style={{ color:"#38bdf8",fontWeight:700,fontSize:13 }}>💧</span>
        <button onClick={()=>set("wasser",Math.max(0,(e.wasser||0)-1))} style={{...smallBtn,color:"#38bdf8"}}>−</button>
        <div style={{ display:"flex",gap:3 }}>
          {Array.from({length:8},(_,i)=>(
            <div key={i} onClick={()=>set("wasser",i+1)} style={{ width:13,height:20,borderRadius:3,background:i<(e.wasser||0)?"#38bdf8":"#1e2535",cursor:"pointer",transition:"background .15s" }} />
          ))}
        </div>
        <button onClick={()=>set("wasser",Math.min(8,(e.wasser||0)+1))} style={{...smallBtn,color:"#38bdf8"}}>+</button>
        <span style={{ color:"#38bdf8",fontWeight:700,fontSize:13 }}>{e.wasser||0}/8</span>
      </div>
    </Card>
  );
}

function BewertungCard({ log, update }) {
  const items = [
    { key:"mood", label:"Stimmung", options:["😤","😕","😐","🙂","😄"], labels:["Schlecht","Mäßig","Okay","Gut","Super"] },
    { key:"energie", label:"Energie", options:["🪫","😴","⚡","🔥","🚀"], labels:["Leer","Niedrig","Mittel","Hoch","Max"] },
    { key:"stress", label:"Stress", options:["😌","😐","😤","😰","🤯"], labels:["Kein","Wenig","Mäßig","Viel","Extrem"] },
    { key:"fokus", label:"Fokus", options:["😵","🌀","🙂","🎯","⚡"], labels:["Keine","Wenig","Okay","Gut","Top"] },
    { key:"ernaehrungBewertung", label:"Ernährung", options:["🍕","🍔","😐","🥗","🌿"], labels:["Sehr schlecht","Schlecht","Okay","Gut","Super"] },
    { key:"produktivitaet", label:"Produktivität", options:["😴","🐌","👍","🔥","⭐"], labels:["Null","Wenig","Okay","Gut","Top"] },
  ];
  return (
    <Card title="Tagesbewertung" icon="⭐" color="#fbbf24">
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        {items.map(({key,label,options,labels})=>(
          <div key={key}>
            <div style={{ fontSize:11,color:"#4a5580",marginBottom:5 }}>{label}</div>
            <div style={{ display:"flex",gap:4 }}>
              {options.map((opt,i)=>(
                <div key={i} onClick={()=>update({...log,[key]:i+1})} title={labels[i]} style={{ flex:1,height:30,borderRadius:6,background:log[key]===i+1?"#1f1a00":"#111827",border:`1px solid ${log[key]===i+1?"#fbbf24":"#1e2535"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all .15s" }}>
                  {opt}
                </div>
              ))}
            </div>
            {log[key]>0 && <div style={{ fontSize:10,color:"#fbbf24",marginTop:2 }}>{labels[log[key]-1]}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotizCard({ log, update }) {
  return (
    <Card title="Tagesnotiz & Reflexion" icon="💭" color="#ec4899">
      <textarea value={log.notiz||""} onChange={e=>update({...log,notiz:e.target.value})} placeholder="Wie war dein Tag? Was lief gut, was nicht? Erkenntnisse für morgen…" style={{ width:"100%",minHeight:90,background:"#111827",border:"1px solid #1e2535",borderRadius:8,color:"#dde3f0",padding:"8px 10px",fontSize:13,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit" }} />
    </Card>
  );
}

// ── STUNDENPLAN ───────────────────────────────────────────────────────────────
function StundenplanTab({ data, updateData, todayIdx }) {
  const [editMode,setEditMode] = useState(false);
  const sp = data.stundenplan;
  const artFarben = { VL:"#3b82f6",UE:"#f59e0b",PR:"#6ee7b7",LA:"#a78bfa",TU:"#f97316" };
  function addSlot(d) { updateData({...data,stundenplan:{...sp,[d]:[...(sp[d]||[]),{fach:"",zeit:"",raum:"",art:"VL"}]}}); }
  function removeSlot(d,i) { updateData({...data,stundenplan:{...sp,[d]:sp[d].filter((_,j)=>j!==i)}}); }
  function updateSlot(d,i,f,v) { updateData({...data,stundenplan:{...sp,[d]:sp[d].map((s,j)=>j===i?{...s,[f]:v}:s)}}); }
  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div>
          <h2 style={{ margin:0,color:"#6ee7b7",fontSize:17 }}>📅 {USER.studiengang} – {USER.uni}</h2>
          <div style={{ fontSize:11,color:"#4a5580",marginTop:3 }}>
            {Object.entries(artFarben).map(([k,c])=><span key={k} style={{ marginRight:10,color:c }}>■ {k}</span>)}
          </div>
        </div>
        <button onClick={()=>setEditMode(!editMode)} style={{ background:editMode?"#6ee7b7":"#111827",color:editMode?"#0d1120":"#6ee7b7",border:"1px solid #6ee7b7",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontWeight:700,fontSize:13 }}>
          {editMode?"✓ Fertig":"✏️ Bearbeiten"}
        </button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8 }}>
        {DAYS.map((day,idx)=>(
          <div key={day} style={{ background:idx===todayIdx?"#0d1f15":"#0d1120",border:`1px solid ${idx===todayIdx?"#6ee7b7":"#1e2535"}`,borderRadius:12,padding:10,minHeight:80 }}>
            <div style={{ fontWeight:700,fontSize:11,color:idx===todayIdx?"#6ee7b7":"#4a5580",marginBottom:8,textAlign:"center",textTransform:"uppercase" }}>
              {day}{idx===todayIdx&&<div style={{ fontSize:8,background:"#6ee7b7",color:"#0d1120",borderRadius:3,padding:"1px 3px",marginTop:2,textAlign:"center" }}>HEUTE</div>}
            </div>
            {(sp[day]||[]).map((slot,i)=>(
              <div key={i} style={{ background:"#111827",borderRadius:8,padding:"6px 8px",marginBottom:5,borderLeft:`3px solid ${artFarben[slot.art]||"#3b82f6"}` }}>
                {editMode?(
                  <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                    <input value={slot.fach} onChange={e=>updateSlot(day,i,"fach",e.target.value)} placeholder="Fach" style={{...iS(false),fontSize:11}} />
                    <input value={slot.zeit} onChange={e=>updateSlot(day,i,"zeit",e.target.value)} placeholder="08:00–09:30" style={{...iS(false),fontSize:11}} />
                    <input value={slot.raum} onChange={e=>updateSlot(day,i,"raum",e.target.value)} placeholder="Raum / Gebäude" style={{...iS(false),fontSize:11}} />
                    <select value={slot.art||"VL"} onChange={e=>updateSlot(day,i,"art",e.target.value)} style={{ background:"#0d1120",border:"1px solid #1e2535",color:artFarben[slot.art]||"#3b82f6",borderRadius:5,fontSize:11,padding:"2px 4px" }}>
                      {Object.keys(artFarben).map(k=><option key={k} value={k}>{k}</option>)}
                    </select>
                    <button onClick={()=>removeSlot(day,i)} style={{ background:"#2a1010",border:"1px solid #4a1010",color:"#ef4444",borderRadius:4,fontSize:10,padding:"2px 6px",cursor:"pointer" }}>Entfernen</button>
                  </div>
                ):(
                  <>
                    <div style={{ fontWeight:700,color:"#c4d0e8",fontSize:11 }}>{slot.fach}</div>
                    <div style={{ color:artFarben[slot.art]||"#3b82f6",fontSize:10,marginTop:2 }}>{slot.zeit}</div>
                    {slot.raum&&<div style={{ color:"#4a5580",fontSize:10 }}>📍 {slot.raum}</div>}
                  </>
                )}
              </div>
            ))}
            {editMode&&<button onClick={()=>addSlot(day)} style={{...aB("#6ee7b7"),fontSize:10,padding:"3px 6px",width:"100%"}}>+ Fach</button>}
            {(sp[day]||[]).length===0&&!editMode&&<div style={{ color:"#2a3550",fontSize:10,textAlign:"center",marginTop:10 }}>frei</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── KLAUSUREN ─────────────────────────────────────────────────────────────────
function KlausurenTab({ data, updateData }) {
  const k = data.klausuren||[];
  function add() { updateData({...data,klausuren:[...k,{fach:"",datum:"",uhrzeit:"",raum:"",note:"",themen:"",lernstunden:""}]}); }
  function remove(i) { updateData({...data,klausuren:k.filter((_,j)=>j!==i)}); }
  function change(i,f,v) { updateData({...data,klausuren:k.map((item,j)=>j===i?{...item,[f]:v}:item)}); }
  const sorted = [...k].map((kl,i)=>({...kl,_i:i})).sort((a,b)=>new Date(a.datum)-new Date(b.datum));
  return (
    <div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <h2 style={{ margin:0,color:"#f59e0b",fontSize:17 }}>✍️ Klausurenplan</h2>
        <button onClick={add} style={aB("#f59e0b")}>+ Klausur</button>
      </div>
      {k.length===0&&<div style={{ color:"#4a5580",textAlign:"center",padding:40,background:"#0d1120",borderRadius:14,border:"1px dashed #1e2535" }}>Noch keine Klausuren eingetragen.</div>}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12 }}>
        {sorted.map((kl)=>{
          const days=daysUntil(kl.datum);
          const urgent=days!==null&&days<=14&&days>=0;
          const very=days!==null&&days<=3&&days>=0;
          const past=days!==null&&days<0;
          return (
            <div key={kl._i} style={{ background:"#0d1120",border:`1px solid ${very?"#ef4444":urgent?"#f59e0b":"#1e2535"}`,borderRadius:14,padding:16,borderTop:`3px solid ${past?"#2a3550":very?"#ef4444":urgent?"#f59e0b":"#3b82f6"}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                <input value={kl.fach} onChange={e=>change(kl._i,"fach",e.target.value)} placeholder="Fachname" style={{...iS(false),fontWeight:700,fontSize:14}} />
                <button onClick={()=>remove(kl._i)} style={rB}>×</button>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:8 }}>
                <div><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>📅 Datum</div><input type="date" value={kl.datum} onChange={e=>change(kl._i,"datum",e.target.value)} style={{...iS(false),fontSize:12}} /></div>
                <div><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>🕐 Uhrzeit</div><input type="time" value={kl.uhrzeit||""} onChange={e=>change(kl._i,"uhrzeit",e.target.value)} style={{...iS(false),fontSize:12}} /></div>
                <div><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>📍 Raum</div><input value={kl.raum||""} onChange={e=>change(kl._i,"raum",e.target.value)} placeholder="H1" style={{...iS(false),fontSize:12}} /></div>
                <div><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>🏆 Note</div><input value={kl.note} onChange={e=>change(kl._i,"note",e.target.value)} placeholder="1,3" style={{...iS(false),fontSize:12}} /></div>
              </div>
              <div style={{ marginBottom:7 }}><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>📚 Stoff</div><input value={kl.themen||""} onChange={e=>change(kl._i,"themen",e.target.value)} placeholder="Kap. 1–5…" style={{...iS(false),width:"100%"}} /></div>
              <div style={{ marginBottom:10 }}><div style={{ color:"#4a5580",fontSize:10,marginBottom:2 }}>⏱ Lernstunden geplant</div><input type="number" value={kl.lernstunden||""} onChange={e=>change(kl._i,"lernstunden",e.target.value)} placeholder="20" style={{...iS(false),width:"100%"}} /></div>
              {days!==null&&(
                <div style={{ padding:"7px 10px",borderRadius:8,background:past?"#1a1010":very?"#2a0808":urgent?"#1f1800":"#0f1a10",color:past?"#6677aa":very?"#ef4444":urgent?"#f59e0b":"#6ee7b7",fontWeight:700,fontSize:13,textAlign:"center" }}>
                  {past?`✓ Vor ${Math.abs(days)} Tagen`:days===0?"🔥 HEUTE!":days===1?"⚠️ Morgen!":very?`🚨 In ${days} Tagen!`:`⏳ In ${days} Tagen`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── GYM TAB ───────────────────────────────────────────────────────────────────
function GymTab({ log, update, allLogs }) {
  const g = log.gym||{trainiert:false,art:"",dauer:"",intensitaet:3,uebungen:[],notiz:""};
  const [showTemplates,setShowTemplates] = useState(false);
  function setG(f,v) { update({...log,gym:{...g,[f]:v}}); }
  function addUebung(name="",muskel="") { setG("uebungen",[...(g.uebungen||[]),{name,muskel,saetze:[{kg:"",wdh:"",notiz:""}],done:false,notiz:""}]); }
  function removeUebung(i) { setG("uebungen",(g.uebungen||[]).filter((_,j)=>j!==i)); }
  function addSatz(ui) { const u=[...(g.uebungen||[])]; const last=u[ui].saetze[u[ui].saetze.length-1]||{kg:"",wdh:""}; u[ui].saetze=[...u[ui].saetze,{kg:last.kg,wdh:last.wdh,notiz:""}]; setG("uebungen",u); }
  function removeSatz(ui,si) { const u=[...(g.uebungen||[])]; u[ui].saetze=u[ui].saetze.filter((_,j)=>j!==si); setG("uebungen",u); }
  function updateSatz(ui,si,f,v) { const u=[...(g.uebungen||[])]; u[ui].saetze[si]={...u[ui].saetze[si],[f]:v}; setG("uebungen",u); }
  function loadTemplate(art) { setG("uebungen",(WORKOUT_TEMPLATES[art]||[]).map(t=>({name:t.name,muskel:t.muskel,saetze:[{kg:"",wdh:""},{kg:"",wdh:""},{kg:"",wdh:""}],done:false,notiz:""}))); setG("art",art); setShowTemplates(false); }
  const volumen=(g.uebungen||[]).reduce((sum,u)=>sum+u.saetze.reduce((s2,satz)=>s2+(Number(satz.kg)||0)*(Number(satz.wdh)||0),0),0);
  const streak=(() => { let c=0; const t=new Date(); for(let i=1;i<=90;i++){const d=new Date(t);d.setDate(d.getDate()-i);if(allLogs[d.toISOString().split("T")[0]]?.gym?.trainiert)c++;else break;} return c; })();
  const intensitaetLabels=["","😴 Sehr leicht","🙂 Leicht","💪 Moderat","🔥 Intensiv","💀 Maximal"];
  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:14 }}>
      <div>
        <Card title="Workout Log" icon="💪" color="#f97316">
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"10px 12px",background:"#111827",borderRadius:10 }}>
            <input type="checkbox" checked={g.trainiert||false} onChange={e=>setG("trainiert",e.target.checked)} style={{ accentColor:"#f97316",width:22,height:22 }} />
            <div>
              <div style={{ fontWeight:700,fontSize:15,color:g.trainiert?"#f97316":"#6677aa" }}>Heute trainiert</div>
              <div style={{ fontSize:11,color:"#4a5580" }}>Hake ab sobald du anfängst</div>
            </div>
          </div>
          {g.trainiert&&(
            <>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:8,marginBottom:14 }}>
                <div>
                  <div style={{ color:"#4a5580",fontSize:10,marginBottom:4 }}>SPLIT</div>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {["Push","Pull","Legs","Upper","Lower","Full Body","Cardio","Mobility"].map(art=>(
                      <button key={art} onClick={()=>setG("art",art)} style={{ background:g.art===art?"#f97316":"#1e2535",color:g.art===art?"#fff":"#6677aa",border:`1px solid ${g.art===art?"#f97316":"#2a3050"}`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontWeight:600 }}>{art}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ color:"#4a5580",fontSize:10,marginBottom:4 }}>DAUER</div>
                  <input value={g.dauer||""} onChange={e=>setG("dauer",e.target.value)} placeholder="75 min" style={{...iS(false),fontSize:13}} />
                </div>
                <div>
                  <div style={{ color:"#4a5580",fontSize:10,marginBottom:4 }}>INTENSITÄT</div>
                  <input type="range" min="1" max="5" value={g.intensitaet||3} onChange={e=>setG("intensitaet",Number(e.target.value))} style={{ width:"100%",accentColor:"#f97316" }} />
                  <div style={{ fontSize:10,color:"#f97316",marginTop:2 }}>{intensitaetLabels[g.intensitaet||3]}</div>
                </div>
              </div>
              <button onClick={()=>setShowTemplates(!showTemplates)} style={{...aB("#f97316"),width:"100%",textAlign:"center",marginBottom:10}}>⚡ Vorlage laden ({g.art||"Split wählen"})</button>
              {showTemplates&&(
                <div style={{ background:"#111827",borderRadius:10,padding:12,marginBottom:10 }}>
                  <div style={{ fontSize:11,color:"#4a5580",marginBottom:8 }}>VORLAGE:</div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    {Object.keys(WORKOUT_TEMPLATES).map(t=>(
                      <button key={t} onClick={()=>loadTemplate(t)} style={{ background:"#1e2535",color:"#f97316",border:"1px solid #f97316",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:12 }}>{t}</button>
                    ))}
                  </div>
                </div>
              )}
              {(g.uebungen||[]).map((u,ui)=>{
                return (
                  <div key={ui} style={{ background:"#111827",borderRadius:12,padding:12,marginBottom:10,opacity:u.done?0.6:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                      <input type="checkbox" checked={u.done||false} onChange={()=>{const ub=[...(g.uebungen||[])];ub[ui].done=!ub[ui].done;setG("uebungen",ub);}} style={{ accentColor:"#6ee7b7",width:18,height:18 }} />
                      <input value={u.name} onChange={e=>{const ub=[...(g.uebungen||[])];ub[ui].name=e.target.value;setG("uebungen",ub);}} placeholder="Übungsname" style={{...iS(false),fontWeight:700,fontSize:14,flex:2}} />
                      <select value={u.muskel||""} onChange={e=>{const ub=[...(g.uebungen||[])];ub[ui].muskel=e.target.value;setG("uebungen",ub);}} style={{ background:"#0d1120",border:"1px solid #1e2535",color:"#6677aa",borderRadius:6,fontSize:11,padding:"4px 6px" }}>
                        {["","Brust","Rücken","Schultern","Bizeps","Trizeps","Quadrizeps","Hamstrings","Gesäß","Waden","Bauch","Ausdauer"].map(m=><option key={m} value={m}>{m||"Muskel…"}</option>)}
                      </select>
                      <button onClick={()=>removeUebung(ui)} style={{...rB,color:"#ef4444"}}>×</button>
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 55px auto",gap:5,marginBottom:5 }}>
                      {["#","kg","Wdh","1RM","Notiz",""].map((h,i)=><div key={i} style={{ color:"#4a5580",fontSize:10,textAlign:"center" }}>{h}</div>)}
                    </div>
                    {u.saetze.map((satz,si)=>{
                      const e1rm=satz.kg&&satz.wdh?Math.round(Number(satz.kg)*(1+Number(satz.wdh)/30)):null;
                      return (
                        <div key={si} style={{ display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 55px auto",gap:5,marginBottom:4,alignItems:"center" }}>
                          <div style={{ color:"#4a5580",fontSize:12,textAlign:"center" }}>{si+1}</div>
                          <input type="number" value={satz.kg} onChange={e=>updateSatz(ui,si,"kg",e.target.value)} placeholder="0" style={{...iS(false),textAlign:"center",fontSize:13,fontWeight:600}} />
                          <input type="number" value={satz.wdh} onChange={e=>updateSatz(ui,si,"wdh",e.target.value)} placeholder="0" style={{...iS(false),textAlign:"center",fontSize:13}} />
                          <div style={{ textAlign:"center",color:"#f97316",fontSize:12,fontWeight:700 }}>{e1rm?`${e1rm}kg`:"–"}</div>
                          <input value={satz.notiz||""} onChange={e=>updateSatz(ui,si,"notiz",e.target.value)} placeholder="…" style={{...iS(false),fontSize:11}} />
                          <button onClick={()=>removeSatz(ui,si)} style={{...rB,fontSize:14}}>×</button>
                        </div>
                      );
                    })}
                    <button onClick={()=>addSatz(ui)} style={{...aB("#6ee7b7"),fontSize:11,padding:"3px 10px",marginTop:4}}>+ Satz</button>
                    {u.saetze.some(s=>s.kg&&s.wdh)&&(
                      <div style={{ marginTop:8,padding:"5px 8px",background:"#1e2535",borderRadius:6,fontSize:11,color:"#6ee7b7" }}>
                        Vol: {u.saetze.reduce((s,satz)=>s+(Number(satz.kg)||0)*(Number(satz.wdh)||0),0)} kg · Max: {Math.max(...u.saetze.map(s=>Number(s.kg)||0))} kg
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>addUebung()} style={{...aB("#f97316"),flex:1}}>+ Übung manuell</button>
              <div style={{ marginTop:12 }}>
                <div style={{ color:"#4a5580",fontSize:10,marginBottom:4 }}>TRAINING-NOTIZ</div>
                <textarea value={g.notiz||""} onChange={e=>setG("notiz",e.target.value)} placeholder="Wie hat sich das Training angefühlt? PRs?" style={{ width:"100%",minHeight:60,background:"#111827",border:"1px solid #1e2535",borderRadius:8,color:"#dde3f0",padding:"8px",fontSize:12,resize:"vertical",boxSizing:"border-box",outline:"none",fontFamily:"inherit" }} />
              </div>
              {volumen>0&&<div style={{ marginTop:12,padding:"10px 14px",background:"linear-gradient(135deg,#1a0f00,#2a1500)",border:"1px solid #f97316",borderRadius:10,textAlign:"center" }}><div style={{ color:"#4a5580",fontSize:11 }}>GESAMTVOLUMEN</div><div style={{ color:"#f97316",fontWeight:800,fontSize:22 }}>{volumen.toLocaleString("de-DE")} kg</div></div>}
            </>
          )}
        </Card>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        <Card title={`Streak: ${streak} Tage`} icon="🔥" color="#f97316">
          <div style={{ display:"flex",gap:4,marginBottom:10 }}>
            {Array.from({length:7},(_,i)=>{
              const d=new Date(); d.setDate(d.getDate()-(6-i));
              const trained=allLogs[d.toISOString().split("T")[0]]?.gym?.trainiert;
              return (
                <div key={i} style={{ flex:1,textAlign:"center" }}>
                  <div style={{ fontSize:9,color:"#4a5580",marginBottom:3 }}>{DAYS[(d.getDay()+6)%7]}</div>
                  <div style={{ height:32,borderRadius:6,background:trained?"#f97316":"#111827",border:i===6?"2px solid #f97316":"1px solid #1e2535",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>{trained?"💪":"·"}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Körperwerte" icon="⚖️" color="#6ee7b7">
          {[{f:"gewicht",label:"Gewicht (kg)",placeholder:"78.5",step:"0.1"},{f:"koerperfett",label:"Körperfett (%)",placeholder:"15",step:"0.5"}].map(({f,label,placeholder,step})=>{
            const val=log[f]||"";
            return (
              <div key={f} style={{ marginBottom:10 }}>
                <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>{label}</div>
                <input type="number" step={step} value={val} onChange={e=>update({...log,[f]:e.target.value})} placeholder={placeholder} style={{...iS(false),fontSize:18,fontWeight:700,textAlign:"center"}} />
                {f==="gewicht"&&val>0&&(
                  <div style={{ marginTop:4 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:11 }}>
                      <span style={{ color:"#4a5580" }}>BMI</span>
                      <span style={{ color:getBMILabel(getBMI(val)).color,fontWeight:700 }}>{getBMI(val)} – {getBMILabel(getBMI(val)).label}</span>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,marginTop:2 }}>
                      <span style={{ color:"#4a5580" }}>TDEE</span>
                      <span style={{ color:"#6ee7b7",fontWeight:700 }}>{getTDEE(val)} kcal</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
        <Card title="Supplements" icon="💊" color="#38bdf8">
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
            {["Kreatin 5g","Whey Protein","Vit D3","Omega-3","Magnesium","Zink","Koffein","BCAA"].map(s=>{
              const active=(log.supplements||[]).includes(s);
              return <button key={s} onClick={()=>{const arr=log.supplements||[];update({...log,supplements:active?arr.filter(x=>x!==s):[...arr,s]});}} style={{ background:active?"#0d2535":"#111827",color:active?"#38bdf8":"#4a5580",border:`1px solid ${active?"#38bdf8":"#1e2535"}`,borderRadius:20,padding:"3px 9px",cursor:"pointer",fontSize:11,fontWeight:600 }}>{s}</button>;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── HEALTH TAB ────────────────────────────────────────────────────────────────
function HealthTab({ log, update, allLogs }) {
  const s = log.schlaf||{stunden:"",qualitaet:50,einschlafen:"",aufwachen:""};
  function setS(f,v) { update({...log,schlaf:{...s,[f]:v}}); }
  function berechnStunden(ein,auf) {
    if(!ein||!auf) return "";
    const [eh,em]=ein.split(":").map(Number);
    let [ah,am]=auf.split(":").map(Number);
    if(ah<eh) ah+=24;
    return ((ah*60+am-eh*60-em)/60).toFixed(1);
  }
  const sleepData=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); const k=d.toISOString().split("T")[0]; return {day:DAYS[(d.getDay()+6)%7],hours:Number(allLogs[k]?.schlaf?.stunden||0)}; });
  const qColor=q=>q>=70?"#6ee7b7":q>=40?"#fbbf24":"#ef4444";
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>
      <Card title="Schlaf-Tracker" icon="😴" color="#a78bfa">
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
          <div>
            <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>EINSCHLAFEN</div>
            <input type="time" value={s.einschlafen||""} onChange={e=>{const neu=e.target.value;const h=berechnStunden(neu,s.aufwachen);const ns={...s,einschlafen:neu};if(h)ns.stunden=h;update({...log,schlaf:ns});}} style={{...iS(false),fontSize:14}} />
          </div>
          <div>
            <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>AUFWACHEN</div>
            <input type="time" value={s.aufwachen||""} onChange={e=>{const neu=e.target.value;const h=berechnStunden(s.einschlafen,neu);const ns={...s,aufwachen:neu};if(h)ns.stunden=h;update({...log,schlaf:ns});}} style={{...iS(false),fontSize:14}} />
          </div>
        </div>
        <div style={{ background:"linear-gradient(135deg,#1a0d30,#0d1a30)",borderRadius:10,padding:"12px",marginBottom:14,textAlign:"center" }}>
          <div style={{ color:"#4a5580",fontSize:11,marginBottom:4 }}>SCHLAFZEIT</div>
          <div style={{ fontSize:28,fontWeight:800,color:Number(s.stunden)>=7?"#a78bfa":Number(s.stunden)>=5?"#fbbf24":"#ef4444" }}>{s.stunden||"–"}h</div>
          <div style={{ fontSize:11,color:"#4a5580" }}>Empfehlung für dich: 7–9h</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:10,color:"#4a5580" }}>
            <span>SCHLAFQUALITÄT</span><span style={{ color:qColor(s.qualitaet||0),fontWeight:700 }}>{s.qualitaet||0}%</span>
          </div>
          <input type="range" min="0" max="100" step="5" value={s.qualitaet||0} onChange={e=>setS("qualitaet",Number(e.target.value))} style={{ width:"100%",accentColor:"#a78bfa" }} />
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,marginTop:3,color:"#4a5580" }}>
            <span>😫 Schlecht</span><span>🌟 Perfekt</span>
          </div>
        </div>
        <div style={{ color:"#4a5580",fontSize:10,marginBottom:6 }}>7-TAGE-VERLAUF</div>
        <div style={{ display:"flex",gap:4,alignItems:"flex-end",height:60 }}>
          {sleepData.map((d,i)=>(
            <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
              <div style={{ width:"100%",background:d.hours>=7?"#a78bfa":d.hours>=5?"#fbbf24":d.hours>0?"#ef4444":"#1e2535",borderRadius:"3px 3px 0 0",height:`${(d.hours/10)*50}px`,minHeight:d.hours>0?3:1 }} />
              <div style={{ fontSize:9,color:"#4a5580" }}>{d.day}</div>
              <div style={{ fontSize:9,color:"#a78bfa" }}>{d.hours>0?`${d.hours}h`:""}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Wochenstats" icon="📊" color="#ec4899">
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:4,marginBottom:6 }}>
          {["","🏋️","😊","😴","Pkt"].map((h,i)=><div key={i} style={{ color:"#4a5580",fontSize:10,textAlign:i>0?"center":"left" }}>{h}</div>)}
        </div>
        {Array.from({length:7},(_,i)=>{
          const d=new Date(); d.setDate(d.getDate()-(6-i));
          const k=d.toISOString().split("T")[0]; const l=allLogs[k]||{};
          const schlaf=Number(l.schlaf?.stunden||0);
          const pkt=(l.gym?.trainiert?20:0)+(l.mood||0)*4+(schlaf>=7?20:schlaf>=5?10:0)+(l.produktivitaet||0)*4;
          return (
            <div key={i} style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:4,padding:"5px 0",borderTop:"1px solid #111827",alignItems:"center" }}>
              <div style={{ color:"#6677aa",fontSize:12 }}>{DAYS[(d.getDay()+6)%7]} <span style={{ fontSize:10,color:"#2a3550" }}>{k.slice(5)}</span></div>
              <div style={{ textAlign:"center",fontSize:14 }}>{l.gym?.trainiert?"💪":"–"}</div>
              <div style={{ textAlign:"center",fontSize:14 }}>{l.mood?["","😤","😕","😐","🙂","😄"][l.mood]:"–"}</div>
              <div style={{ textAlign:"center",fontSize:11,color:schlaf>=7?"#a78bfa":schlaf>0?"#fbbf24":"#4a5580" }}>{schlaf>0?`${schlaf}h`:"–"}</div>
              <div style={{ textAlign:"center",fontSize:11,color:pkt>=60?"#6ee7b7":pkt>=30?"#fbbf24":"#4a5580",fontWeight:700 }}>{pkt>0?pkt:"–"}</div>
            </div>
          );
        })}
      </Card>
      <Card title="Gewichtsverlauf (14 Tage)" icon="⚖️" color="#f97316">
        <div style={{ display:"flex",gap:4,alignItems:"flex-end",height:70,marginBottom:6 }}>
          {Array.from({length:14},(_,i)=>{
            const d=new Date(); d.setDate(d.getDate()-(13-i));
            const k=d.toISOString().split("T")[0];
            const kg=Number(allLogs[k]?.gewicht||0);
            const allKg=Object.values(allLogs).map(l=>Number(l?.gewicht||0)).filter(x=>x>0);
            const min=allKg.length?Math.min(...allKg)-1:70;
            const max=allKg.length?Math.max(...allKg)+1:90;
            const h=kg>0?Math.max(4,((kg-min)/(max-min))*60):0;
            return (
              <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                <div style={{ width:"100%",background:kg>0?"#f97316":"#1e2535",borderRadius:"3px 3px 0 0",height:h||2 }} title={kg>0?`${kg} kg`:""} />
                {i%3===0&&<div style={{ fontSize:8,color:"#4a5580" }}>{DAYS[(d.getDay()+6)%7]}</div>}
              </div>
            );
          })}
        </div>
        <div style={{ color:"#4a5580",fontSize:11 }}>Trag dein Gewicht täglich im Gym-Tab ein</div>
      </Card>
      <Card title="Wasser & Supplements" icon="💧" color="#38bdf8">
        <div style={{ fontSize:11,color:"#4a5580",marginBottom:8 }}>GLÄSER HEUTE ({log.ernaehrung?.wasser||0}/8)</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14 }}>
          {Array.from({length:8},(_,i)=>(
            <div key={i} style={{ height:40,borderRadius:8,background:i<(log.ernaehrung?.wasser||0)?"#0d2535":"#111827",border:`1px solid ${i<(log.ernaehrung?.wasser||0)?"#38bdf8":"#1e2535"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
              {i<(log.ernaehrung?.wasser||0)?"💧":"·"}
            </div>
          ))}
        </div>
        <div style={{ fontSize:11,color:"#4a5580",marginBottom:6 }}>SUPPLEMENTS HEUTE</div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
          {["Kreatin 5g","Whey Protein","Vit D3","Omega-3","Magnesium","Zink","Koffein","BCAA"].map(s=>{
            const active=(log.supplements||[]).includes(s);
            return <div key={s} style={{ background:active?"#0d2535":"#111827",color:active?"#38bdf8":"#4a5580",border:`1px solid ${active?"#38bdf8":"#1e2535"}`,borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:600 }}>{active?"✓ ":""}{s}</div>;
          })}
        </div>
      </Card>
    </div>
  );
}

// ── POMODORO ──────────────────────────────────────────────────────────────────
function PomodoroTab() {
  const MODES = { work:{label:"Fokus",color:"#ef4444"}, short:{label:"Kurze Pause",color:"#6ee7b7"}, long:{label:"Lange Pause",color:"#38bdf8"} };
  const [mode,setMode]=useState("work");
  const [timeLeft,setTimeLeft]=useState(25*60);
  const [running,setRunning]=useState(false);
  const [sessions,setSessions]=useState(0);
  const [dur,setDur]=useState({work:25,short:5,long:15});
  const [task,setTask]=useState("");
  const [sessionLog,setSessionLog]=useState([]);
  const ref=useRef(null);
  useEffect(()=>{setTimeLeft(dur[mode]*60);setRunning(false);},[mode,dur]);
  useEffect(()=>{
    if(running){ref.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){clearInterval(ref.current);setRunning(false);if(mode==="work"){setSessions(s=>s+1);setSessionLog(l=>[...l,{task,time:new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),dur:dur.work}]);}return 0;}return t-1;}),1000);}
    else clearInterval(ref.current);
    return()=>clearInterval(ref.current);
  },[running,mode,task,dur]);
  const m=String(Math.floor(timeLeft/60)).padStart(2,"0");
  const s=String(timeLeft%60).padStart(2,"0");
  const total=dur[mode]*60;
  const pct=((total-timeLeft)/total)*100;
  const col=MODES[mode].color;
  const r=85; const circ=2*Math.PI*r;
  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,maxWidth:700,margin:"0 auto" }}>
      <Card title="Pomodoro Timer" icon="🍅" color="#ef4444">
        <div style={{ display:"flex",gap:5,marginBottom:16,justifyContent:"center" }}>
          {Object.entries(MODES).map(([k,v])=>(
            <button key={k} onClick={()=>setMode(k)} style={{ background:mode===k?v.color:"#111827",color:mode===k?"#fff":"#6677aa",border:`1px solid ${mode===k?v.color:"#1e2535"}`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontWeight:700,fontSize:12 }}>{v.label}</button>
          ))}
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:"#4a5580",fontSize:10,marginBottom:4 }}>AKTUELLE AUFGABE</div>
          <input value={task} onChange={e=>setTask(e.target.value)} placeholder="Woran arbeitest du?" style={{...iS(false),width:"100%"}} />
        </div>
        <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
          <svg width="210" height="210" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="105" cy="105" r={r} fill="none" stroke="#1e2535" strokeWidth="10" />
            <circle cx="105" cy="105" r={r} fill="none" stroke={col} strokeWidth="10" strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }} />
            <text x="105" y="98" textAnchor="middle" dominantBaseline="middle" style={{ transform:"rotate(90deg) translate(0,-210px)",fontSize:40,fontWeight:800,fill:col,fontFamily:"monospace" }}>{m}:{s}</text>
            <text x="105" y="128" textAnchor="middle" dominantBaseline="middle" style={{ transform:"rotate(90deg) translate(0,-210px)",fontSize:12,fill:"#4a5580",fontFamily:"inherit" }}>{MODES[mode].label}</text>
          </svg>
        </div>
        <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:14 }}>
          <button onClick={()=>setRunning(r=>!r)} style={{ background:running?"#2a0808":"#0a1f10",color:running?"#ef4444":"#6ee7b7",border:`2px solid ${running?"#ef4444":"#6ee7b7"}`,borderRadius:12,padding:"10px 28px",cursor:"pointer",fontWeight:800,fontSize:16 }}>{running?"⏸ Pause":"▶ Start"}</button>
          <button onClick={()=>{setRunning(false);setTimeLeft(dur[mode]*60);}} style={{ background:"#111827",color:"#6677aa",border:"1px solid #1e2535",borderRadius:12,padding:"10px 16px",cursor:"pointer",fontSize:16 }}>↺</button>
        </div>
        <div style={{ display:"flex",gap:5,justifyContent:"center",marginBottom:14 }}>
          {Array.from({length:4},(_,i)=>(
            <div key={i} style={{ width:34,height:34,borderRadius:8,background:i<sessions%4?"#ef4444":"#111827",border:`1px solid ${i<sessions%4?"#ef4444":"#1e2535"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{i<sessions%4?"🍅":"·"}</div>
          ))}
          <div style={{ color:"#4a5580",fontSize:12,alignSelf:"center",marginLeft:8 }}>Session {sessions+1}</div>
        </div>
        <div style={{ background:"#111827",borderRadius:10,padding:10 }}>
          <div style={{ fontSize:10,color:"#4a5580",marginBottom:6 }}>ZEITEN (min)</div>
          <div style={{ display:"flex",gap:8 }}>
            {[["work","Fokus"],["short","Kurze P."],["long","Lange P."]].map(([k,l])=>(
              <div key={k} style={{ flex:1 }}>
                <div style={{ fontSize:10,color:"#4a5580",marginBottom:3 }}>{l}</div>
                <input type="number" min="1" max="90" value={dur[k]} onChange={e=>setDur(c=>({...c,[k]:Number(e.target.value)}))} style={{...iS(false),textAlign:"center",fontWeight:700}} />
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card title="Session-Log" icon="📋" color="#a78bfa">
        <div style={{ marginBottom:10 }}>
          <div style={{ color:"#a78bfa",fontSize:24,fontWeight:800 }}>{sessions}</div>
          <div style={{ color:"#4a5580",fontSize:12 }}>Sessions · ≈ {sessions*dur.work} min Fokuszeit</div>
        </div>
        <div style={{ maxHeight:250,overflowY:"auto" }}>
          {sessionLog.length===0?<div style={{ color:"#4a5580",fontSize:12,textAlign:"center",padding:20 }}>Noch keine Sessions. Los geht's!</div>:
          [...sessionLog].reverse().map((e,i)=>(
            <div key={i} style={{ display:"flex",gap:8,alignItems:"center",padding:"6px 8px",background:"#111827",borderRadius:8,marginBottom:4 }}>
              <div style={{ fontSize:16 }}>🍅</div>
              <div style={{ flex:1 }}>
                <div style={{ color:"#dde3f0",fontSize:12,fontWeight:600 }}>{e.task||"Fokus-Session"}</div>
                <div style={{ color:"#4a5580",fontSize:10 }}>{e.time} · {e.dur} min</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── PROFIL TAB ────────────────────────────────────────────────────────────────
function ProfilTab({ log, allLogs }) {
  const alter=getAlter();
  const kg=log.gewicht||USER.gewichtStart;
  const bmi=getBMI(kg);
  const bmiInfo=getBMILabel(bmi);
  const tdee=getTDEE(kg);
  const trainingstage=Object.values(allLogs).filter(l=>l?.gym?.trainiert).length;
  const avgSchlaf=(()=>{const logs=Object.values(allLogs).map(l=>Number(l?.schlaf?.stunden||0)).filter(x=>x>0);return logs.length?(logs.reduce((a,b)=>a+b,0)/logs.length).toFixed(1):"–";})();
  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14 }}>
      <Card title="Dein Profil" icon="👤" color="#6ee7b7" fullWidth>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10 }}>
          {[
            {label:"Studiengang",val:USER.studiengang},{label:"Universität",val:USER.uni},{label:"Stadt",val:USER.stadt},
            {label:"Alter",val:`${alter} Jahre`},{label:"Größe",val:`${USER.groesse} cm`},{label:"Gewicht",val:`${kg} kg`},
            {label:"BMI",val:bmi,note:bmiInfo.label,nc:bmiInfo.color},
            {label:"TDEE",val:`${tdee} kcal`,note:"mäßige Aktivität"},
            {label:"Proteinziel",val:`${Math.round(kg*2)}g/Tag`,note:"2g × Körpergewicht"},
          ].map(item=>(
            <div key={item.label} style={{ background:"#111827",borderRadius:10,padding:"10px 12px" }}>
              <div style={{ color:"#4a5580",fontSize:10,marginBottom:3 }}>{item.label.toUpperCase()}</div>
              <div style={{ color:"#dde3f0",fontWeight:700,fontSize:14 }}>{item.val}</div>
              {item.note&&<div style={{ color:item.nc||"#4a5580",fontSize:10,marginTop:2 }}>{item.note}</div>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Statistiken" icon="🏆" color="#f59e0b">
        {[{label:"Trainingstage gesamt",val:trainingstage,icon:"💪"},{label:"Ø Schlaf",val:`${avgSchlaf}h`,icon:"😴"},{label:"Eingetragene Tage",val:Object.keys(allLogs).length,icon:"📅"}].map(s=>(
          <div key={s.label} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1e2535" }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div><div style={{ color:"#f59e0b",fontWeight:800,fontSize:20 }}>{s.val}</div><div style={{ color:"#4a5580",fontSize:12 }}>{s.label}</div></div>
          </div>
        ))}
      </Card>
      <Card title="Kalorienrechner" icon="🔢" color="#34d399">
        <div style={{ fontSize:12,color:"#4a5580",marginBottom:10 }}>Mifflin-St-Jeor, basierend auf deinen Daten:</div>
        {[{label:"Wenig Aktivität",f:1.2},{label:"Leicht aktiv (1–3×/Wo)",f:1.375},{label:"Mäßig aktiv (3–5×/Wo) ✓",f:1.55},{label:"Sehr aktiv (6–7×/Wo)",f:1.725}].map(row=>(
          <div key={row.label} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #1e2535",fontSize:12 }}>
            <span style={{ color:row.label.includes("✓")?"#34d399":"#6677aa" }}>{row.label}</span>
            <span style={{ fontWeight:700,color:row.label.includes("✓")?"#34d399":"#dde3f0" }}>{getTDEE(kg,row.f)} kcal</span>
          </div>
        ))}
        <div style={{ marginTop:10,padding:"8px 10px",background:"#111827",borderRadius:8,fontSize:11,color:"#4a5580" }}>
          <strong style={{ color:"#34d399" }}>Muskelaufbau:</strong> {getTDEE(kg,1.55)+250}–{getTDEE(kg,1.55)+400} kcal<br/>
          <strong style={{ color:"#38bdf8" }}>Abnehmen:</strong> {getTDEE(kg,1.55)-400}–{getTDEE(kg,1.55)-250} kcal
        </div>
      </Card>
    </div>
  );
}

// ── SYNC TAB ──────────────────────────────────────────────────────────────────
function SyncTab({ exportData, importData }) {
  return (
    <div style={{ maxWidth:600,margin:"0 auto" }}>
      <Card title="Daten Sync" icon="🔄" color="#6ee7b7">
        <div style={{ marginBottom:20,padding:"14px",background:"#111827",borderRadius:10 }}>
          <div style={{ color:"#6ee7b7",fontWeight:700,fontSize:14,marginBottom:6 }}>ℹ️ Wie funktioniert der Sync?</div>
          <div style={{ color:"#6677aa",fontSize:13,lineHeight:1.6 }}>
            Deine Daten werden lokal in deinem Browser gespeichert. Um sie zwischen Handy und Laptop zu synchronisieren, exportiere die Daten auf einem Gerät und importiere sie auf dem anderen.<br/><br/>
            <strong style={{ color:"#dde3f0" }}>Tipp:</strong> Mach einmal pro Woche ein Backup!
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <div style={{ background:"#111827",borderRadius:12,padding:16,textAlign:"center" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>📤</div>
            <div style={{ color:"#6ee7b7",fontWeight:700,fontSize:14,marginBottom:6 }}>Export</div>
            <div style={{ color:"#4a5580",fontSize:12,marginBottom:12 }}>Alle Daten als JSON-Datei herunterladen</div>
            <button onClick={exportData} style={{ background:"#6ee7b7",color:"#0d1120",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer",fontWeight:800,fontSize:13,width:"100%" }}>
              💾 Daten exportieren
            </button>
          </div>
          <div style={{ background:"#111827",borderRadius:12,padding:16,textAlign:"center" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>📥</div>
            <div style={{ color:"#f59e0b",fontWeight:700,fontSize:14,marginBottom:6 }}>Import</div>
            <div style={{ color:"#4a5580",fontSize:12,marginBottom:12 }}>Backup-Datei hochladen und Daten wiederherstellen</div>
            <label style={{ background:"#f59e0b",color:"#0d1120",border:"none",borderRadius:8,padding:"10px 20px",cursor:"pointer",fontWeight:800,fontSize:13,display:"block",width:"100%",boxSizing:"border-box" }}>
              📂 Datei importieren
              <input type="file" accept=".json" onChange={importData} style={{ display:"none" }} />
            </label>
          </div>
        </div>
        <div style={{ marginTop:16,padding:"12px",background:"#111827",borderRadius:10 }}>
          <div style={{ color:"#fbbf24",fontWeight:700,fontSize:13,marginBottom:6 }}>📱 Ablauf: Laptop → Handy</div>
          <ol style={{ color:"#6677aa",fontSize:12,lineHeight:2,paddingLeft:20,margin:0 }}>
            <li>Auf dem <strong style={{ color:"#dde3f0" }}>Laptop</strong> → "Daten exportieren" klicken</li>
            <li>Die JSON-Datei in eine <strong style={{ color:"#dde3f0" }}>Cloud</strong> laden (iCloud, Google Drive, WhatsApp an dich selbst)</li>
            <li>Auf dem <strong style={{ color:"#dde3f0" }}>Handy</strong> die Datei öffnen & herunterladen</li>
            <li>Auf dem Handy → "Datei importieren" klicken</li>
            <li>✅ Fertig – alle Daten sind synchronisiert!</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
