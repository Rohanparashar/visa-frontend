import { useState, useEffect } from "react";

// ── API URL comes from .env file ──────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ── All 7 questions the applicant answers ─────────────────────────────────────
const QUESTIONS = [
  {
    id: "visaType",
    label: "What is the purpose of your visit?",
    sub: "This tells us which visa category applies to you.",
    type: "select",
    optKey: "visaTypes",
    required: true
  },
  {
    id: "occupation",
    label: "What is your current occupation?",
    sub: "This determines which employment or income documents you need to provide.",
    type: "select",
    optKey: "occupations",
    required: true
  },
  {
    id: "funding",
    label: "How will your trip be funded?",
    sub: "Who is paying for your travel, stay, and expenses?",
    type: "select",
    optKey: "fundingTypes",
    required: true
  },
  {
    id: "travelerType",
    label: "Who are you travelling with?",
    sub: "This adds any companion, family, or group documents needed.",
    type: "select",
    optKey: "travelerTypes",
    required: true
  },
  {
    id: "isMinor",
    label: "Is the applicant a minor (under 18 years old)?",
    sub: "Minor applicants require additional consent and guardian documents.",
    type: "yesno",
    required: true
  },
  {
    id: "visaStatus",
    label: "Is this a fresh application, or have you applied before?",
    sub: "If previously refused, additional explanation documents are required.",
    type: "select",
    optKey: "visaStatuses",
    required: true
  },
  {
    id: "specialScenarios",
    label: "Do any of these special situations apply to you?",
    sub: "Select all that apply. These add specific documents to your checklist. If none apply, click Next.",
    type: "multi",
    optKey: "specialScenarios",
    required: false
  }
];

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [options, setOptions]           = useState(null);
  const [loadError, setLoadError]       = useState(null);
  const [step, setStep]                 = useState(0);
  const [answers, setAnswers]           = useState({});
  const [multiSelected, setMultiSelected] = useState([]);
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [submitError, setSubmitError]   = useState(null);
  const [view, setView]                 = useState("form"); // "form" | "result" | "admin"

  // Load options from backend when app starts
  useEffect(() => {
    fetch(`${API}/api/options`)
      .then(r => { if (!r.ok) throw new Error("Server error"); return r.json(); })
      .then(setOptions)
      .catch(() => setLoadError(
        "Cannot connect to the server. Please check your internet connection and try again."
      ));
  }, []);

  const q            = QUESTIONS[step];
  const totalSteps   = QUESTIONS.length;
  const progress     = Math.round((step / totalSteps) * 100);
  const opts         = options?.[q?.optKey] || [];
  const currentVal   = answers[q?.id];
  const canProceed   = q?.required === false ? true : (q?.type === "multi" ? true : !!currentVal);

  function selectOption(val) {
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }

  function toggleMulti(val) {
    setMultiSelected(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  }

  function goNext() {
    // Commit multi-select answer before advancing
    if (q.type === "multi") {
      setAnswers(prev => ({ ...prev, specialScenarios: multiSelected }));
    }
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      submitForm();
    }
  }

  function goBack() {
    setStep(s => s - 1);
  }

  async function submitForm() {
    setLoading(true);
    setSubmitError(null);
    const payload = {
      ...answers,
      specialScenarios: multiSelected,
      isMinor: answers.isMinor === "yes"
    };
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setView("result");
      } else {
        setSubmitError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitError("Cannot reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setMultiSelected([]);
    setResult(null);
    setSubmitError(null);
    setView("form");
  }

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loadError) {
    return (
      <Layout>
        <PageHeader title="Visa Document Checker" sub="" />
        <Card>
          <p style={st.errorTxt}>⚠ {loadError}</p>
          <button style={st.primaryBtn} onClick={() => window.location.reload()}>
            Try again
          </button>
        </Card>
      </Layout>
    );
  }

  if (!options) {
    return (
      <Layout>
        <PageHeader title="Visa Document Checker" sub="" />
        <Card><p style={st.muted}>Loading your checklist tool, please wait...</p></Card>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <PageHeader title="Visa Document Checker" sub="" />
        <Card><p style={st.muted}>Generating your personalised document list...</p></Card>
      </Layout>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (view === "result" && result) {
    return <ResultScreen result={result} onRestart={restart} />;
  }

  // ── Admin screen ───────────────────────────────────────────────────────────
  if (view === "admin") {
    return <AdminScreen onBack={() => setView("form")} />;
  }

  // ── Applicant form ─────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <PageHeader
          title="Visa Document Checker"
          sub="Answer a few questions to get your personalised document checklist instantly."
          noMargin
        />
        <button style={st.adminLink} onClick={() => setView("admin")}>Admin →</button>
      </div>

      {/* Progress bar */}
      <div style={st.progressRow}>
        <div style={st.progressBg}>
          <div style={{ ...st.progressFill, width: progress + "%" }} />
        </div>
        <span style={st.stepLabel}>Question {step + 1} of {totalSteps}</span>
      </div>

      <Card>
        <p style={st.qLabel}>{q.label}</p>
        <p style={st.qSub}>{q.sub}</p>

        {/* Yes / No question (isMinor) */}
        {q.type === "yesno" && (
          <div style={st.optGrid}>
            {["yes", "no"].map(val => (
              <button
                key={val}
                style={{ ...st.optBtn, ...(currentVal === val ? st.optSel : {}) }}
                onClick={() => selectOption(val)}
              >
                {val === "yes" ? "Yes — applicant is under 18" : "No — applicant is 18 or older"}
              </button>
            ))}
          </div>
        )}

        {/* Single-select dropdown as buttons */}
        {q.type === "select" && (
          <div style={st.optGrid}>
            {opts.map(opt => (
              <button
                key={opt}
                style={{ ...st.optBtn, ...(currentVal === opt ? st.optSel : {}) }}
                onClick={() => selectOption(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Multi-select */}
        {q.type === "multi" && (
          <>
            <div style={st.optGrid}>
              {opts.map(opt => (
                <button
                  key={opt}
                  style={{ ...st.optBtn, ...(multiSelected.includes(opt) ? st.optSel : {}) }}
                  onClick={() => toggleMulti(opt)}
                >
                  {multiSelected.includes(opt) ? "✓ " : ""}{opt}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#999", marginTop: 6 }}>
              Select all that apply. If none apply, just click Next.
            </p>
          </>
        )}

        {submitError && <p style={st.errorTxt}>{submitError}</p>}

        {/* Navigation */}
        <div style={st.navRow}>
          {step > 0 && (
            <button style={st.backBtn} onClick={goBack}>← Back</button>
          )}
          <button
            style={{ ...st.primaryBtn, ...(canProceed ? {} : st.disabledBtn) }}
            onClick={goNext}
            disabled={!canProceed}
          >
            {step === totalSteps - 1 ? "Generate my document list →" : "Next →"}
          </button>
        </div>
      </Card>
    </Layout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// RESULT SCREEN
// ═════════════════════════════════════════════════════════════════════════════
function ResultScreen({ result, onRestart }) {
  const profile = result.applicantProfile || {};

  return (
    <Layout>
      <PageHeader
        title="Your Document Checklist"
        sub={`${result.visaType} visa · ${profile.occupation || ""} · ${profile.funding || ""}`}
      />

      {/* Blocked alerts — shown at the very top if any */}
      {result.blocked_alerts?.length > 0 && (
        <div style={{ ...st.noticeBox, background: "#FCEBEB", borderColor: "#F09595" }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: "#791F1F", marginBottom: 6 }}>
            ⚠ Alerts — These issues must be resolved before filing
          </p>
          {result.blocked_alerts.map((a, i) => (
            <p key={i} style={{ fontSize: 12, color: "#A32D2D", marginBottom: 3 }}>{a}</p>
          ))}
        </div>
      )}

      {/* Mandatory */}
      <DocSection
        title="Mandatory Documents"
        subtitle="You must submit every document in this section. Missing any of these will likely result in rejection."
        color="#E24B4A"
        badge="Required"
        items={result.mandatory}
      />

      {/* Usually Mandatory */}
      <DocSection
        title="Usually Mandatory Documents"
        subtitle="These are strongly recommended and almost always expected. Include them unless you have a clear documented reason not to."
        color="#BA7517"
        badge="Strongly Recommended"
        items={result.usually_mandatory}
      />

      {/* Conditional */}
      <DocSection
        title="Conditional Documents"
        subtitle="Include these only if they apply to your specific situation. Read each note carefully."
        color="#378ADD"
        badge="If Applicable"
        items={result.conditional}
      />

      {/* Review flags */}
      {result.review_flags?.length > 0 && (
        <div style={{ ...st.noticeBox, background: "#FAEEDA", borderColor: "#FAC775" }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: "#633806", marginBottom: 6 }}>
            Consultant Review Notes
          </p>
          <p style={{ fontSize: 11, color: "#854F0B", marginBottom: 8 }}>
            These are points your visa consultant should check before filing.
          </p>
          {result.review_flags.map((f, i) => (
            <p key={i} style={{ fontSize: 12, color: "#633806", marginBottom: 3 }}>• {f}</p>
          ))}
        </div>
      )}

      {/* Special notes */}
      {result.special_notes?.length > 0 && (
        <div style={{ ...st.noticeBox, background: "#E6F1FB", borderColor: "#B5D4F4" }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: "#0C447C", marginBottom: 6 }}>
            Important Notes
          </p>
          {result.special_notes.map((n, i) => (
            <p key={i} style={{ fontSize: 12, color: "#0C447C", marginBottom: 3 }}>• {n}</p>
          ))}
        </div>
      )}

      {/* Never use */}
      {result.never_use?.length > 0 && (
        <div style={{ ...st.noticeBox, background: "#FCEBEB", borderColor: "#F09595" }}>
          <p style={{ fontWeight: 500, fontSize: 13, color: "#A32D2D", marginBottom: 6 }}>
            Do NOT Submit These Documents
          </p>
          <p style={{ fontSize: 11, color: "#A32D2D", marginBottom: 8 }}>
            Submitting these may cause a category mismatch or rejection.
          </p>
          {result.never_use.map((d, i) => (
            <p key={i} style={{ fontSize: 12, color: "#A32D2D", marginBottom: 3 }}>✗ {d}</p>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: "#bbb", marginTop: 14, lineHeight: 1.6 }}>
        This checklist is generated from generic India-based visa filing rules. The official embassy /
        VFS / consulate / university checklist always overrides this list. Always verify with your
        visa consultant before filing.
      </p>

      <button style={{ ...st.backBtn, width: "100%", marginTop: 10 }} onClick={onRestart}>
        ← Start over with a different profile
      </button>
    </Layout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN SCREEN — login + rule management
// ═════════════════════════════════════════════════════════════════════════════
function AdminScreen({ onBack }) {
  const [token, setToken]       = useState(localStorage.getItem("admin_token") || "");
  const [adminName, setAdminName] = useState(localStorage.getItem("admin_name") || "");
  const [loginError, setLoginError] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("base-documents");
  const [rows, setRows]         = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [visaFilter, setVisaFilter] = useState("");
  const [visaTypes, setVisaTypes] = useState([]);
  const [newItem, setNewItem]   = useState({});
  const [formVisible, setFormVisible] = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [editingRow, setEditingRow] = useState(null);   // holds the row being edited
  const [editItem, setEditItem] = useState({});          // holds edited field values

  const TABS = [
    { id: "visa-types",        label: "Visa types",        table: "visa_types" },
    { id: "base-documents",    label: "Base documents",     table: "base_documents" },
    { id: "occupation-rules",  label: "Occupation rules",   table: "occupation_rules" },
    { id: "funding-rules",     label: "Funding rules",      table: "funding_rules" },
    { id: "traveler-rules",    label: "Traveler rules",     table: "traveler_rules" },
    { id: "visa-status-rules", label: "Visa status rules",  table: "visa_status_rules" },
    { id: "blocked-combos",    label: "Blocked combos",     table: "blocked_combinations" },
    { id: "special-scenarios", label: "Special scenarios",  table: "special_scenarios" },
    { id: "audit-log",         label: "Audit log",          table: "audit_log" },
  ];

  async function login() {
    setLoginError("");
    try {
      const res = await fetch(`${API}/api/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setAdminName(data.name);
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_name", data.name);
        loadTab("base-documents");
      } else { setLoginError(data.error); }
    } catch { setLoginError("Cannot connect to server."); }
  }

  function logout() {
    setToken(""); setAdminName("");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_name");
  }

  async function loadTab(tab) {
    setActiveTab(tab); setTabLoading(true); setRows([]); setFormVisible(false);
    try {
      const params = visaFilter && ["base-documents","blocked-combos"].includes(tab)
        ? `?visa_type=${encodeURIComponent(visaFilter)}` : "";
      const res = await fetch(`${API}/api/admin/${tab}${params}`,
        { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setRows(data);
      // Load visa types for filter
      if (visaTypes.length === 0) {
        const vt = await fetch(`${API}/api/admin/visa-types`, { headers: { Authorization: `Bearer ${token}` } });
        const vtd = await vt.json();
        if (Array.isArray(vtd)) setVisaTypes(vtd.map(v => v.name));
      }
    } catch { setRows([]); }
    setTabLoading(false);
  }

  async function deleteRow(id) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await fetch(`${API}/api/admin/${activeTab}/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` }
    });
    loadTab(activeTab);
  }

  function startEdit(row) {
    setEditingRow(row.id);
    setEditItem({ ...row });
    setFormVisible(false); // close add form if open
  }

  function cancelEdit() {
    setEditingRow(null);
    setEditItem({});
  }

  async function saveEdit() {
    if (!editingRow) return;
    const res = await fetch(`${API}/api/admin/${activeTab}/${editingRow}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(editItem)
    });
    const data = await res.json();
    if (data.id || data.success || data.name || data.content) {
      setSaveMsg("Updated successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
      setEditingRow(null);
      setEditItem({});
      loadTab(activeTab);
    } else {
      setSaveMsg("Error saving: " + (data.error || "unknown"));
    }
  }

  async function saveNew() {
    if (!newItem || Object.keys(newItem).length === 0) return;
    const res = await fetch(`${API}/api/admin/${activeTab}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newItem)
    });
    const data = await res.json();
    if (data.id || data.success) {
      setSaveMsg("Saved successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
      setNewItem({});
      setFormVisible(false);
      loadTab(activeTab);
    } else { setSaveMsg("Error: " + (data.error || "unknown")); }
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <Layout>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <PageHeader title="Admin login" sub="Log in to manage visa document rules." noMargin />
          <button style={st.backBtn} onClick={onBack}>← Back to app</button>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
            <div>
              <p style={st.fieldLabel}>Email address</p>
              <input style={st.input} type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <p style={st.fieldLabel}>Password</p>
              <input style={st.input} type="password" placeholder="Your admin password"
                value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()} />
            </div>
            {loginError && <p style={st.errorTxt}>{loginError}</p>}
            <button style={st.primaryBtn} onClick={login}>Log in</button>
          </div>
        </Card>
      </Layout>
    );
  }

  // ── Logged in — admin panel ────────────────────────────────────────────────
  const currentTab = TABS.find(t => t.id === activeTab);
  const sampleRow = rows[0] || {};
  const columns = Object.keys(sampleRow).filter(k => !["id","created_at","updated_at","password_hash"].includes(k));

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Rule engine admin</h1>
          <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Logged in as {adminName}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={st.backBtn} onClick={onBack}>← Back to App</button>
          <button style={st.backBtn} onClick={logout}>Log out</button>
        </div>
      </div>

      {saveMsg && <div style={{ ...st.noticeBox, background: "#EAF3DE", borderColor: "#C0DD97", marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: "#27500A" }}>{saveMsg}</p>
      </div>}

      {/* Tab bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {TABS.map(t => (
          <button key={t.id}
            style={{ ...st.tabBtn, ...(activeTab === t.id ? st.tabActive : {}) }}
            onClick={() => loadTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Visa type filter for relevant tabs */}
      {["base-documents","blocked-combos"].includes(activeTab) && visaTypes.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#888" }}>Filter by visa type:</span>
          <select style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "0.5px solid #ddd" }}
            value={visaFilter} onChange={e => { setVisaFilter(e.target.value); loadTab(activeTab); }}>
            <option value="">All</option>
            {visaTypes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      )}

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {currentTab?.label} <span style={{ fontWeight: 400, color: "#999", fontSize: 12 }}>({rows.length} entries)</span>
          </span>
          {activeTab !== "audit-log" && (
            <button
              style={formVisible ? st.cancelBtn : st.primaryBtn}
              onClick={() => { setFormVisible(v => !v); setNewItem({}); }}>
              {formVisible ? "✕ Cancel" : "+ Add new"}
            </button>
          )}
        </div>

        {/* Add new form */}
        {formVisible && activeTab !== "audit-log" && (
          <div style={{ background: "#f8f8f6", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "#555" }}>Fill in the details for the new entry:</p>
            {getFormFields(activeTab, visaTypes).map(field => (
              <div key={field.key}>
                <p style={st.fieldLabel}>{field.label}</p>
                {field.type === "select" ? (
                  <select style={st.input} value={newItem[field.key]||""} onChange={e => setNewItem(p=>({...p,[field.key]:e.target.value}))}>
                    <option value="">Select...</option>
                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea style={{...st.input, minHeight:60, resize:"vertical"}}
                    placeholder={field.placeholder||""}
                    value={newItem[field.key]||""}
                    onChange={e => setNewItem(p=>({...p,[field.key]:e.target.value}))} />
                ) : (
                  <input style={st.input} type="text"
                    placeholder={field.placeholder||""}
                    value={newItem[field.key]||""}
                    onChange={e => setNewItem(p=>({...p,[field.key]:e.target.value}))} />
                )}
              </div>
            ))}
            <button style={st.primaryBtn} onClick={saveNew}>Save entry</button>
          </div>
        )}

        {/* Table */}
        {tabLoading ? (
          <p style={st.muted}>Loading...</p>
        ) : rows.length === 0 ? (
          <p style={{ fontSize: 12, color: "#999", fontStyle: "italic" }}>No entries found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} style={st.th}>{col.replace(/_/g," ")}</th>
                  ))}
                  {activeTab !== "audit-log" && <th style={st.th}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <>
                    <tr key={row.id || i} style={{ background: i%2===0?"#fff":"#fafaf8" }}>
                      {columns.map(col => (
                        <td key={col} style={st.td}>
                          {typeof row[col] === "boolean"
                            ? (row[col] ? "Yes" : "No")
                            : typeof row[col] === "object"
                              ? JSON.stringify(row[col])
                              : String(row[col]||"")}
                        </td>
                      ))}
                      {activeTab !== "audit-log" && (
                        <td style={st.td}>
                          <div style={{ display:"flex", gap:4 }}>
                            <button style={st.editBtn} onClick={() => startEdit(row)}>Edit</button>
                            <button style={st.delBtn} onClick={() => deleteRow(row.id)}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {editingRow === row.id && (
                      <tr key={`edit-${row.id}`}>
                        <td colSpan={columns.length + 1} style={{ padding:"10px 8px", background:"#F0F7FF", borderBottom:"0.5px solid #B5D4F4" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            <p style={{ fontSize:12, fontWeight:500, color:"#0C447C", marginBottom:4 }}>Editing entry — change the fields below and click Save:</p>
                            {getFormFields(activeTab, visaTypes).map(field => (
                              <div key={field.key} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                                <span style={{ fontSize:11, color:"#666", minWidth:120, paddingTop:8, flexShrink:0 }}>{field.label}:</span>
                                {field.type === "select" ? (
                                  <select style={{ ...st.input, maxWidth:400 }}
                                    value={editItem[field.key]||""}
                                    onChange={e => setEditItem(p=>({...p,[field.key]:e.target.value}))}>
                                    <option value="">Select...</option>
                                    {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : field.type === "textarea" ? (
                                  <textarea style={{ ...st.input, minHeight:60, resize:"vertical", maxWidth:400 }}
                                    value={editItem[field.key]||""}
                                    onChange={e => setEditItem(p=>({...p,[field.key]:e.target.value}))} />
                                ) : (
                                  <input style={{ ...st.input, maxWidth:400 }} type="text"
                                    value={editItem[field.key]||""}
                                    onChange={e => setEditItem(p=>({...p,[field.key]:e.target.value}))} />
                                )}
                              </div>
                            ))}
                            <div style={{ display:"flex", gap:8, marginTop:4 }}>
                              <button style={st.primaryBtn} onClick={saveEdit}>Save changes</button>
                              <button style={st.backBtn} onClick={cancelEdit}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Layout>
  );
}

// Form field definitions for each admin tab
function getFormFields(tab, visaTypes) {
  const STATUS_OPTS = ["mandatory","usually_mandatory","conditional","never_used"];
  const RULE_OPTS   = ["mandatory","conditional","flags","suppress","note"];
  switch(tab) {
    case "visa-types":
      return [
        { key:"name", label:"Visa type name", type:"text", placeholder:"e.g. Medical, Transit..." },
        { key:"description", label:"Description", type:"text", placeholder:"Brief description" },
        { key:"sort_order", label:"Sort order (number)", type:"text", placeholder:"e.g. 6" },
      ];
    case "base-documents":
      return [
        { key:"visa_type", label:"Visa type", type:"select", options: visaTypes },
        { key:"status", label:"Status", type:"select", options: STATUS_OPTS },
        { key:"name", label:"Document name", type:"text", placeholder:"e.g. Passport + Old Passports (PP)" },
        { key:"short_code", label:"Short code", type:"text", placeholder:"e.g. PP, VAF, FCE" },
        { key:"note", label:"Notes / instructions", type:"textarea", placeholder:"When required, what to include..." },
        { key:"sort_order", label:"Sort order (number)", type:"text", placeholder:"e.g. 7" },
      ];
    case "occupation-rules":
      return [
        { key:"occupation", label:"Occupation", type:"text", placeholder:"e.g. NRI, Artist..." },
        { key:"rule_type", label:"Rule type", type:"select", options: RULE_OPTS },
        { key:"content", label:"Document / flag text", type:"textarea", placeholder:"e.g. OCI Card / PIO Card" },
      ];
    case "funding-rules":
      return [
        { key:"funding_type", label:"Funding type", type:"text", placeholder:"e.g. Loan Funded..." },
        { key:"rule_type", label:"Rule type", type:"select", options: RULE_OPTS },
        { key:"content", label:"Document / flag text", type:"textarea", placeholder:"e.g. Loan Sanction Letter" },
      ];
    case "traveler-rules":
      return [
        { key:"traveler_type", label:"Traveler type", type:"text", placeholder:"e.g. Senior Citizen..." },
        { key:"rule_type", label:"Rule type", type:"select", options: RULE_OPTS },
        { key:"content", label:"Document / flag text", type:"textarea", placeholder:"e.g. Medical fitness certificate" },
      ];
    case "visa-status-rules":
      return [
        { key:"visa_status", label:"Visa status", type:"text", placeholder:"e.g. Expired Visa, Extension..." },
        { key:"rule_type", label:"Rule type", type:"select", options: RULE_OPTS },
        { key:"content", label:"Document / flag text", type:"textarea", placeholder:"e.g. Expired visa copy" },
      ];
    case "blocked-combos":
      return [
        { key:"visa_type", label:"Visa type", type:"select", options: visaTypes },
        { key:"combination", label:"Combination to block", type:"text", placeholder:"e.g. Tourist visa + work evidence" },
        { key:"reason", label:"Reason", type:"text", placeholder:"e.g. Purpose mismatch" },
      ];
    case "special-scenarios":
      return [
        { key:"name", label:"Scenario name", type:"text", placeholder:"e.g. Medical Emergency Travel" },
        { key:"rule_type", label:"Rule type", type:"select", options: RULE_OPTS },
        { key:"content", label:"Document / note text", type:"textarea", placeholder:"e.g. Medical certificate from treating doctor" },
      ];
    default: return [];
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════
function Layout({ children }) {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      {children}
    </div>
  );
}

function PageHeader({ title, sub, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : "1.25rem" }}>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: "#1a1a1a", margin: "0 0 4px" }}>{title}</h1>
      {sub && <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Card({ children }) {
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e0e0e0", borderRadius: 12, padding: "1.25rem", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function DocSection({ title, subtitle, color, badge, items }) {
  if (!items?.length) return null;
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, border: `0.5px solid ${color}55`, background: color + "11", color, fontWeight: 500 }}>{badge}</span>
      </div>
      <p style={{ fontSize: 11, color: "#999", marginBottom: 10, paddingLeft: 16 }}>{subtitle}</p>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "5px 0", borderTop: "0.5px solid #f4f4f4" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#333", lineHeight: 1.6 }}>{item}</span>
        </div>
      ))}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════
const st = {
  progressRow:  { display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" },
  progressBg:   { flex:1, height:3, background:"#eee", borderRadius:2, overflow:"hidden" },
  progressFill: { height:3, background:"#378ADD", borderRadius:2, transition:"width 0.35s" },
  stepLabel:    { fontSize:11, color:"#999", whiteSpace:"nowrap" },
  qLabel:       { fontSize:15, fontWeight:500, color:"#1a1a1a", margin:"0 0 4px" },
  qSub:         { fontSize:12, color:"#888", margin:"0 0 1rem" },
  optGrid:      { display:"flex", flexWrap:"wrap", gap:8, marginBottom:"1rem" },
  optBtn:       { padding:"7px 14px", fontSize:13, border:"0.5px solid #ddd", borderRadius:20, background:"#fff", color:"#333", cursor:"pointer" },
  optSel:       { background:"#E6F1FB", color:"#0C447C", borderColor:"#378ADD", fontWeight:500 },
  navRow:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 },
  primaryBtn:   { padding:"9px 20px", fontSize:13, fontWeight:500, border:"none", borderRadius:8, background:"#378ADD", color:"#fff", cursor:"pointer" },
  disabledBtn:  { background:"#ccc", cursor:"not-allowed" },
  backBtn:      { padding:"7px 14px", fontSize:12, border:"0.5px solid #ddd", borderRadius:8, background:"#fff", color:"#666", cursor:"pointer" },
  adminLink:    { padding:"6px 12px", fontSize:12, border:"0.5px solid #ddd", borderRadius:8, background:"#fff", color:"#888", cursor:"pointer" },
  noticeBox:    { borderRadius:10, padding:"12px 14px", marginBottom:10, border:"0.5px solid" },
  errorTxt:     { fontSize:12, color:"#A32D2D", margin:"8px 0" },
  muted:        { fontSize:13, color:"#888", textAlign:"center" },
  input:        { width:"100%", fontSize:13, padding:"7px 10px", border:"0.5px solid #ddd", borderRadius:8, background:"#fff", color:"#1a1a1a", boxSizing:"border-box" },
  fieldLabel:   { fontSize:11, fontWeight:500, color:"#666", margin:"0 0 3px" },
  tabBtn:       { padding:"5px 12px", fontSize:12, border:"0.5px solid #ddd", borderRadius:16, background:"#fff", color:"#666", cursor:"pointer" },
  tabActive:    { background:"#E6F1FB", color:"#0C447C", borderColor:"#B5D4F4", fontWeight:500 },
  th:           { textAlign:"left", padding:"6px 8px", fontSize:11, fontWeight:500, color:"#888", borderBottom:"0.5px solid #e0e0e0", whiteSpace:"nowrap" },
  td:           { padding:"6px 8px", fontSize:12, color:"#333", borderBottom:"0.5px solid #f0f0f0", verticalAlign:"top", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis" },
  delBtn:       { padding:"2px 8px", fontSize:11, border:"0.5px solid #f09595", borderRadius:6, background:"#FCEBEB", color:"#A32D2D", cursor:"pointer" },
  editBtn:      { padding:"2px 8px", fontSize:11, border:"0.5px solid #B5D4F4", borderRadius:6, background:"#E6F1FB", color:"#0C447C", cursor:"pointer" },
  cancelBtn:    { padding:"9px 20px", fontSize:13, fontWeight:500, border:"0.5px solid #F09595", borderRadius:8, background:"#FCEBEB", color:"#A32D2D", cursor:"pointer" },
};
