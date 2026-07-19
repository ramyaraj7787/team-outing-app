import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Users, Compass, Camera, Trophy, Crown, Plus, ChevronRight, X, Send, Shuffle,
  Check, AlertCircle, Loader2, Pencil, Trash2, UserPlus, UserMinus, LogOut, Link2, Phone,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Point this at your running API. Defaults to your local backend.
// Once you deploy the API (Render, etc.), change this one line.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Points at your running API. Reads VITE_API_BASE from your .env file so you
// can point this at localhost during development and your deployed backend
// (e.g. Render) in production — no code change needed, just a different .env.
// ---------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

async function api(path, options = {}, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed: ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

const PALETTE = ["#7A9471", "#3E7C6B", "#C97B3D", "#8A5A44", "#5B7A99"];
const colorFor = (id) => PALETTE[Number(id) % PALETTE.length];
const TAGS = ["travel", "logistics", "food", "game", "highlight"];

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function fileToResizedDataUrl(file, maxDim = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Could not read that image file."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

const inputStyle = { width: "100%", border: "1px solid #E3DAC5", borderRadius: 10, padding: "11px 12px", fontSize: 13.5, fontFamily: "'Inter', sans-serif", background: "#FBF8F1", marginBottom: 10, boxSizing: "border-box" };
const smallBtn = { fontSize: 11, border: "1px solid #D8CBB0", background: "none", borderRadius: 8, padding: "5px 9px", color: "#6B665C", cursor: "pointer" };
const primaryBtn = { background: "#1F3A2E", color: "#F6F0E4", border: "none", borderRadius: 10, padding: "10px", fontFamily: "'Inter', sans-serif", fontWeight: 600, cursor: "pointer" };
const dashedBtn = { width: "100%", border: "1.5px dashed #C97B3D", background: "none", borderRadius: 12, padding: "12px", color: "#C97B3D", fontWeight: 600, fontFamily: "'Inter', sans-serif", display: "flex", justifyContent: "center", alignItems: "center", gap: 6, cursor: "pointer" };
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');`;

// ---------- Small shared bits ----------
function StampBadge({ children, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", border: "2px dashed #E8873A", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Oswald', sans-serif", fontWeight: 600, color: "#E8873A", fontSize: size * 0.32, flexShrink: 0, background: "#26402F" }}>
      {children}
    </div>
  );
}

function SectionLabel({ n, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: "#E8873A", fontWeight: 600 }}>{n}</span>
      <span style={{ height: 1, background: "#E3DAC5", flex: 1 }} />
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#8B8578", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

function TabBar({ active, setActive }) {
  const tabs = [
    { id: "feed", label: "Trip", icon: Compass },
    { id: "groups", label: "Members", icon: Users },
    { id: "photos", label: "Photos", icon: Camera },
    { id: "games", label: "Games", icon: Trophy },
  ];
  return (
    <div style={{ position: "sticky", bottom: 0, display: "flex", background: "#1F3A2E", borderTop: "1px solid #33513F", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))" }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => setActive(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: isActive ? "#E8873A" : "#8FA88B", padding: "6px 0", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
            <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Auth screen: phone + OTP ----------
function AuthScreen({ onAuthenticated }) {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devOtp, setDevOtp] = useState(null);
  const [needsName, setNeedsName] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    if (!phone.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api("/auth/request-otp", { method: "POST", body: JSON.stringify({ phoneNumber: phone.trim() }) });
      setDevOtp(res.devOtp);
      setStep("otp");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await api("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phoneNumber: phone.trim(), code: code.trim(), name: name.trim() || undefined }) });
      onAuthenticated(res.token, res.member);
    } catch (e) {
      if (e.data?.needsName) { setNeedsName(true); setError("Looks like you're new here — add your name below too."); }
      else setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F6F0E4", display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 24 }}>
      <style>{fontImport}</style>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, color: "#26241F", marginBottom: 4 }}>Team Outings</div>
      <div style={{ fontSize: 13, color: "#6B665C", marginBottom: 24 }}>Sign in with your mobile number.</div>

      {step === "phone" && (
        <div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number (e.g. +91 98765 43210)" style={inputStyle} inputMode="tel" />
          {error && <div style={{ fontSize: 12.5, color: "#C0503A", marginBottom: 10 }}>{error}</div>}
          <button onClick={requestOtp} disabled={busy} style={{ ...primaryBtn, width: "100%" }}>{busy ? "Sending..." : "Send code"}</button>
        </div>
      )}

      {step === "otp" && (
        <div>
          {devOtp && (
            <div style={{ background: "#FDF3E3", border: "1px solid #EAD3A8", borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12.5, color: "#8A5A28" }}>
              <strong>Dev mode:</strong> no SMS provider is connected yet, so here's your code directly: <strong style={{ fontSize: 15, letterSpacing: 1 }}>{devOtp}</strong>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: "#8B8578", marginBottom: 10 }}>Code sent to {phone}. <button onClick={() => { setStep("phone"); setError(null); }} style={{ background: "none", border: "none", color: "#3E7C6B", cursor: "pointer", fontWeight: 600, padding: 0 }}>Change number</button></div>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" style={inputStyle} inputMode="numeric" maxLength={6} />
          {(needsName || name) && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (first time only)" style={inputStyle} />
          )}
          {error && <div style={{ fontSize: 12.5, color: "#C0503A", marginBottom: 10 }}>{error}</div>}
          {!needsName && !name && (
            <button onClick={() => setNeedsName(true)} style={{ background: "none", border: "none", color: "#8B8578", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10, display: "block" }}>First time? Add your name</button>
          )}
          <button onClick={verify} disabled={busy} style={{ ...primaryBtn, width: "100%" }}>{busy ? "Verifying..." : "Verify & continue"}</button>
        </div>
      )}
    </div>
  );
}

function Header({ title, subtitle, currentUser, onLogout }) {
  return (
    <div style={{ background: "#1F3A2E", padding: "18px 18px 22px", borderBottomLeftRadius: 20, borderBottomRightRadius: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(135deg, rgba(232,135,58,0.06) 0px, rgba(232,135,58,0.06) 1px, transparent 1px, transparent 14px)" }} />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#8FA88B", fontFamily: "'Inter', sans-serif", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>{subtitle}</div>
          <div style={{ color: "#F6F0E4", fontFamily: "'Oswald', sans-serif", fontSize: 26, fontWeight: 600, marginTop: 2 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StampBadge size={30}>{currentUser?.avatar}</StampBadge>
          <button onClick={onLogout} title="Log out" style={{ background: "transparent", border: "1px solid #3E7C6B", color: "#CFE0C9", borderRadius: 8, padding: 6, cursor: "pointer", display: "flex" }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Trip switcher ----------
function TripSwitcher({ trips, activeTripId, setActiveTripId, isAdmin, onCreateTrip }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreateTrip({ name: name.trim(), date: date.trim() || "Date TBD", location: location.trim() || "Location TBD" });
      setName(""); setDate(""); setLocation(""); setShowForm(false);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "14px 16px 0" }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>
        {trips.map((t) => {
          const active = t.id === activeTripId;
          return (
            <button key={t.id} onClick={() => setActiveTripId(t.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, border: active ? "1.5px solid #E8873A" : "1px solid #D8CBB0", background: active ? "#1F3A2E" : "#FBF8F1", color: active ? "#E8873A" : "#6B665C", fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              {t.status === "past" && <Check size={12} />}
              {t.name}
            </button>
          );
        })}
        {isAdmin && (
          <button onClick={() => setShowForm(true)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, border: "1.5px dashed #C97B3D", background: "none", color: "#C97B3D", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
            <Plus size={13} /> New trip
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(31,58,46,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#F6F0E4", width: "100%", maxWidth: 420, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: "#26241F" }}>Create a new trip</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B8578" }}><X size={18} /></button>
            </div>
            <div style={{ fontSize: 12, color: "#8B8578", marginBottom: 10 }}>You'll automatically be added as a participant. Add teammates in the Members tab afterward.</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name (e.g. Manali Winter Trip)" style={inputStyle} />
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (e.g. Sat, 20 Dec)" style={inputStyle} />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" style={inputStyle} />
            <button onClick={submit} disabled={saving} style={{ ...primaryBtn, width: "100%", marginTop: 6 }}>{saving ? "Creating..." : "Create trip"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Feed Tab ----------
function ItineraryForm({ initial, onSave, onCancel, saving }) {
  const [time, setTime] = useState(initial?.time ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [tag, setTag] = useState(initial?.tag ?? "logistics");
  return (
    <div style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 12, padding: 12, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Time (e.g. 07:00 AM)" style={{ ...inputStyle, flex: 1 }} />
        <select value={tag} onChange={(e) => setTag(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Departure from office)" style={inputStyle} />
      <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail (optional)" style={inputStyle} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => title.trim() && time.trim() && onSave({ time: time.trim(), title: title.trim(), detail: detail.trim(), tag })} disabled={saving} style={{ ...primaryBtn, flex: 1 }}>{saving ? "Saving..." : "Save"}</button>
        <button onClick={onCancel} style={{ border: "1px solid #D8CBB0", background: "none", borderRadius: 10, padding: "10px 14px", color: "#6B665C", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function FeedTab({ trip, isAdmin, addAnnouncement, addItineraryItem, updateItineraryItem, deleteItineraryItem }) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const post = async () => {
    if (!draft.trim() || posting) return;
    setPosting(true);
    try { await addAnnouncement(draft.trim()); setDraft(""); } finally { setPosting(false); }
  };

  return (
    <div style={{ padding: "16px 16px 90px" }}>
      <SectionLabel n="01" label="Schedule" />
      <div style={{ position: "relative", paddingLeft: 18, marginBottom: 14 }}>
        <div style={{ position: "absolute", left: 5, top: 6, bottom: 6, width: 2, background: "repeating-linear-gradient(#D8CBB0 0 6px, transparent 6px 12px)" }} />
        {trip.itinerary.length === 0 && <div style={{ fontSize: 13, color: "#8B8578" }}>No itinerary items yet.</div>}
        {trip.itinerary.map((item) =>
          editingId === item.id ? (
            <div key={item.id} style={{ marginLeft: -18 }}>
              <ItineraryForm initial={item} saving={busyId === item.id} onCancel={() => setEditingId(null)} onSave={async (vals) => { setBusyId(item.id); try { await updateItineraryItem(item.id, vals); setEditingId(null); } finally { setBusyId(null); } }} />
            </div>
          ) : (
            <div key={item.id} style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "absolute", left: -18, top: 3, width: 10, height: 10, borderRadius: "50%", background: item.tag === "highlight" ? "#E8873A" : "#3E7C6B", border: "2px solid #F6F0E4" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#C97B3D", fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>{item.time}</div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, fontWeight: 600, color: "#26241F", marginTop: 1 }}>{item.title}</div>
                  {item.detail && <div style={{ fontSize: 13, color: "#6B665C", marginTop: 2 }}>{item.detail}</div>}
                </div>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setEditingId(item.id)} style={{ background: "none", border: "none", color: "#8B8578", cursor: "pointer", padding: 2 }}><Pencil size={14} /></button>
                    <button onClick={() => deleteItineraryItem(item.id)} style={{ background: "none", border: "none", color: "#C0503A", cursor: "pointer", padding: 2 }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {isAdmin && !addingItem && <button onClick={() => setAddingItem(true)} style={{ ...dashedBtn, marginBottom: 26, padding: "10px" }}><Plus size={15} /> Add schedule item</button>}
      {isAdmin && addingItem && (
        <div style={{ marginBottom: 26 }}>
          <ItineraryForm saving={busyId === "new"} onCancel={() => setAddingItem(false)} onSave={async (vals) => { setBusyId("new"); try { await addItineraryItem(vals); setAddingItem(false); } finally { setBusyId(null); } }} />
        </div>
      )}

      <SectionLabel n="02" label="Announcements" />
      {isAdmin && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Post an update to the group..." style={{ flex: 1, border: "1px solid #E3DAC5", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "'Inter', sans-serif", background: "#FBF8F1" }} />
          <button onClick={post} disabled={posting} style={{ background: "#1F3A2E", border: "none", borderRadius: 10, padding: "0 14px", color: "#F6F0E4", cursor: "pointer", opacity: posting ? 0.6 : 1 }}>{posting ? <Loader2 size={16} /> : <Send size={16} />}</button>
        </div>
      )}
      {trip.announcements.length === 0 && <div style={{ fontSize: 13, color: "#8B8578" }}>No announcements yet.</div>}
      {trip.announcements.map((a) => (
        <div key={a.id} style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8B8578", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: "#3E7C6B" }}>{a.author?.name ?? a.author?.phoneNumber ?? "Unknown"}</span>
            <span>{timeAgo(a.createdAt)}</span>
          </div>
          <div style={{ fontSize: 13.5, color: "#33312A" }}>{a.text}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Members Tab ----------
function MembersTab({ participants, allMembers, isAdmin, promoteMember, addParticipant, removeParticipant, addParticipantByPhone }) {
  const [pickId, setPickId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPhoneForm, setShowPhoneForm] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [copied, setCopied] = useState(false);

  const participantIds = new Set(participants.map((p) => p.memberId));
  const available = allMembers.filter((m) => !participantIds.has(m.id));

  const addExisting = async () => {
    if (!pickId || busy) return;
    setBusy(true);
    try { await addParticipant(Number(pickId)); setPickId(""); } finally { setBusy(false); }
  };

  const submitPhone = async () => {
    if (!phone.trim() || busy) return;
    setBusy(true);
    try { await addParticipantByPhone(phone.trim(), phoneName.trim() || null); setPhone(""); setPhoneName(""); setShowPhoneForm(false); } finally { setBusy(false); }
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.origin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: "16px 16px 90px" }}>
      <SectionLabel n="—" label={`${participants.length} on this trip`} />
      {participants.length === 0 && <div style={{ fontSize: 13, color: "#8B8578", marginBottom: 14 }}>Nobody's been added to this trip yet.</div>}
      {participants.map((p) => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #EFE8D8" }}>
          <StampBadge size={38}>{p.member.avatar}</StampBadge>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: "#26241F" }}>{p.member.name ?? p.member.phoneNumber}</div>
            <div style={{ fontSize: 11.5, color: p.member.role === "Admin" ? "#C97B3D" : "#8B8578", fontWeight: 600 }}>
              {p.member.role === "Admin" && <Crown size={10} style={{ display: "inline", marginRight: 3, marginBottom: -1 }} />}
              {p.member.role}{!p.member.name && " · not registered yet"}
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => promoteMember(p.member.id, p.member.role === "Admin" ? "Member" : "Admin")} style={smallBtn}>{p.member.role === "Admin" ? "Demote" : "Make admin"}</button>
              <button onClick={() => removeParticipant(p.member.id)} style={{ ...smallBtn, color: "#C0503A", borderColor: "#E8A594" }} title="Remove from trip"><UserMinus size={13} /></button>
            </div>
          )}
        </div>
      ))}

      {isAdmin && (
        <div style={{ marginTop: 18 }}>
          <button onClick={copyLink} style={{ ...smallBtn, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10, padding: "9px" }}>
            <Link2 size={13} /> {copied ? "Link copied!" : "Copy registration link to share"}
          </button>

          {available.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <select value={pickId} onChange={(e) => setPickId(e.target.value)} style={{ ...inputStyle, flex: 1, marginBottom: 0 }}>
                <option value="">Add existing team member...</option>
                {available.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.phoneNumber}</option>)}
              </select>
              <button onClick={addExisting} disabled={!pickId || busy} style={{ ...primaryBtn, padding: "0 14px" }}><UserPlus size={16} /></button>
            </div>
          )}

          {!showPhoneForm ? (
            <button onClick={() => setShowPhoneForm(true)} style={dashedBtn}><Phone size={15} /> Add by mobile number</button>
          ) : (
            <div style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#8B8578", marginBottom: 10 }}>They'll appear as "not registered yet" until they sign in with this number themselves.</div>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" style={inputStyle} inputMode="tel" />
              <input value={phoneName} onChange={(e) => setPhoneName(e.target.value)} placeholder="Name (optional, they can set it themselves)" style={inputStyle} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submitPhone} disabled={busy} style={{ ...primaryBtn, flex: 1 }}>{busy ? "Adding..." : "Add to trip"}</button>
                <button onClick={() => setShowPhoneForm(false)} style={{ border: "1px solid #D8CBB0", background: "none", borderRadius: 10, padding: "10px 14px", color: "#6B665C", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Photos Tab ----------
function PhotosTab({ photos, addPhoto }) {
  const [pending, setPending] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    setError(null);
    try { const dataUrl = await fileToResizedDataUrl(file); setPending({ dataUrl }); setCaption(file.name.replace(/\.[^/.]+$/, "")); } catch (err) { setError(err.message); }
  };

  const post = async () => {
    if (!pending || uploading) return;
    setUploading(true); setError(null);
    try { await addPhoto(caption.trim() || "Trip photo", pending.dataUrl); setPending(null); setCaption(""); } catch (err) { setError(err.message); } finally { setUploading(false); }
  };

  return (
    <div style={{ padding: "16px 16px 90px" }}>
      <SectionLabel n="—" label={`${photos.length} shared`} />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
      {!pending && <button onClick={() => fileInputRef.current?.click()} style={{ ...dashedBtn, marginBottom: 14 }}><Camera size={16} /> Share a photo</button>}
      {pending && (
        <div style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <img src={pending.dataUrl} alt="Preview" style={{ width: "100%", borderRadius: 8, display: "block", marginBottom: 10, maxHeight: 220, objectFit: "cover" }} />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." style={inputStyle} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={post} disabled={uploading} style={{ ...primaryBtn, flex: 1 }}>{uploading ? "Posting..." : "Post photo"}</button>
            <button onClick={() => { setPending(null); setCaption(""); }} style={{ border: "1px solid #D8CBB0", background: "none", borderRadius: 10, padding: "10px 14px", color: "#6B665C", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      {error && <div style={{ fontSize: 12.5, color: "#C0503A", marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {photos.map((p) => (
          <div key={p.id} style={{ borderRadius: 12, overflow: "hidden", background: "#FBF8F1", border: "1px solid #E9E1CD" }}>
            {p.url ? <img src={p.url} alt={p.caption} style={{ height: 100, width: "100%", objectFit: "cover", display: "block" }} /> : <div style={{ height: 100, background: colorFor(p.id), display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={22} color="rgba(255,255,255,0.7)" /></div>}
            <div style={{ padding: "8px 10px" }}>
              <div style={{ fontSize: 12.5, color: "#33312A", fontWeight: 600 }}>{p.caption}</div>
              <div style={{ fontSize: 11, color: "#8B8578" }}>{p.uploader?.name ?? p.uploader?.phoneNumber ?? "Unknown"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Games Tab ----------
function NewGameForm({ participants, onCreate, onCancel, saving }) {
  const [name, setName] = useState("");
  const teamColors = ["#C97B3D", "#3E7C6B"];
  const submit = () => {
    if (!name.trim()) return;
    const ids = participants.map((p) => p.memberId).sort(() => Math.random() - 0.5);
    const half = Math.ceil(ids.length / 2);
    onCreate({ name: name.trim(), teams: [{ name: "Team A", color: teamColors[0], memberIds: ids.slice(0, half) }, { name: "Team B", color: teamColors[1], memberIds: ids.slice(half) }] });
  };
  return (
    <div style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Game name (e.g. Tug of War)" style={inputStyle} />
      <div style={{ fontSize: 11.5, color: "#8B8578", marginBottom: 10 }}>Creates "Team A" / "Team B" and splits the trip's {participants.length} member{participants.length === 1 ? "" : "s"} evenly. You can reshuffle after.</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={saving || participants.length === 0} style={{ ...primaryBtn, flex: 1 }}>{saving ? "Creating..." : "Create game"}</button>
        <button onClick={onCancel} style={{ border: "1px solid #D8CBB0", background: "none", borderRadius: 10, padding: "10px 14px", color: "#6B665C", cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

function GamesTab({ games, participants, isAdmin, addScore, shuffleTeams, createGame }) {
  const [openGame, setOpenGame] = useState(null);
  const [busy, setBusy] = useState(null);
  const [addingGame, setAddingGame] = useState(false);

  const handleScore = async (gameId, teamId) => { setBusy(`${gameId}-${teamId}`); try { await addScore(gameId, teamId, 5); } finally { setBusy(null); } };
  const handleShuffle = async (gameId) => { setBusy(`shuffle-${gameId}`); try { await shuffleTeams(gameId); } finally { setBusy(null); } };

  return (
    <div style={{ padding: "16px 16px 90px" }}>
      <SectionLabel n="—" label="Live scoreboard" />
      {games.length === 0 && <div style={{ fontSize: 13, color: "#8B8578", marginBottom: 14 }}>No games set up for this trip yet.</div>}
      {games.map((g) => {
        const leader = g.teams.length ? (g.teams[0].score >= (g.teams[1]?.score ?? -1) ? g.teams[0] : g.teams[1]) : null;
        return (
          <div key={g.id} style={{ background: "#FBF8F1", border: "1px solid #E9E1CD", borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, color: "#26241F" }}>{g.name}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: g.status === "live" ? "#E8873A" : "#DCD3BE", color: g.status === "live" ? "#1F3A2E" : "#6B665C", textTransform: "uppercase" }}>{g.status}</span>
            </div>
            {g.teams.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.color }} />
                <div style={{ flex: 1, fontSize: 13.5, color: "#33312A", fontWeight: leader && t.id === leader.id ? 700 : 500 }}>{t.name}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: t.color }}>{t.score}</div>
                {isAdmin && <button onClick={() => handleScore(g.id, t.id)} disabled={busy === `${g.id}-${t.id}`} style={{ border: "none", background: "#1F3A2E", color: "#F6F0E4", borderRadius: 6, width: 24, height: 24, cursor: "pointer", fontSize: 13, opacity: busy === `${g.id}-${t.id}` ? 0.5 : 1 }}>+</button>}
              </div>
            ))}
            <button onClick={() => setOpenGame(openGame === g.id ? null : g.id)} style={{ background: "none", border: "none", color: "#8B8578", fontSize: 12, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: 0, marginTop: 4 }}>
              Team rosters & updates <ChevronRight size={13} style={{ transform: openGame === g.id ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
            </button>
            {openGame === g.id && (
              <div style={{ marginTop: 10, borderTop: "1px solid #EFE8D8", paddingTop: 10 }}>
                {isAdmin && <button onClick={() => handleShuffle(g.id)} disabled={busy === `shuffle-${g.id}`} style={{ ...smallBtn, display: "flex", alignItems: "center", gap: 4, marginBottom: 10, opacity: busy === `shuffle-${g.id}` ? 0.5 : 1 }}><Shuffle size={12} /> {busy === `shuffle-${g.id}` ? "Shuffling..." : "Re-shuffle teams"}</button>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {g.teams.map((t) => (
                    <div key={t.id}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.name}</div>
                      {(t.members ?? []).map((gtm) => <div key={gtm.id} style={{ fontSize: 12, color: "#4A473F" }}>{gtm.member?.name ?? gtm.member?.phoneNumber}</div>)}
                    </div>
                  ))}
                </div>
                {g.updates.length > 0 && g.updates.map((u) => <div key={u.id} style={{ fontSize: 12, color: "#6B665C", marginBottom: 4 }}><span style={{ color: "#C97B3D", fontWeight: 700 }}>{timeAgo(u.createdAt)}</span> — {u.text}</div>)}
              </div>
            )}
          </div>
        );
      })}
      {isAdmin && !addingGame && <button onClick={() => setAddingGame(true)} style={dashedBtn}><Plus size={15} /> Add a game</button>}
      {isAdmin && addingGame && (
        <NewGameForm participants={participants} saving={busy === "new-game"} onCancel={() => setAddingGame(false)} onCreate={async (payload) => { setBusy("new-game"); try { await createGame(payload); setAddingGame(false); } finally { setBusy(null); } }} />
      )}
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div style={{ margin: 16, background: "#FBEAE5", border: "1px solid #E8A594", borderRadius: 12, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
      <AlertCircle size={18} color="#C0503A" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#8A3A28", marginBottom: 3 }}>Something went wrong</div>
        <div style={{ fontSize: 12.5, color: "#8A5A48", marginBottom: 8 }}>{message}</div>
        <button onClick={onRetry} style={{ fontSize: 12, fontWeight: 600, border: "1px solid #C0503A", background: "none", color: "#C0503A", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  );
}

// ---------- Root ----------
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("teamOutingToken"));
  const [currentUser, setCurrentUser] = useState(() => {
    const raw = localStorage.getItem("teamOutingUser");
    return raw ? JSON.parse(raw) : null;
  });
  const [tab, setTab] = useState("feed");
  const [members, setMembers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [activeTripId, setActiveTripId] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAdmin = currentUser?.role === "Admin";
  const authedApi = useCallback((path, opts = {}) => api(path, opts, token), [token]);

  const loadMembers = useCallback(async () => setMembers(await authedApi("/members")), [authedApi]);
  const loadTrips = useCallback(async () => {
    const data = await authedApi("/trips");
    setTrips(data);
    setActiveTripId((prev) => (data.some((t) => t.id === prev) ? prev : data[0]?.id ?? null));
  }, [authedApi]);
  const loadTripDetail = useCallback(async (tripId) => {
    if (!tripId) { setActiveTrip(null); return; }
    setActiveTrip(await authedApi(`/trips/${tripId}`));
  }, [authedApi]);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError(null);
    Promise.all([loadMembers(), loadTrips()])
      .catch((e) => {
        if (e.status === 401) {
          setToken(null); setCurrentUser(null);
          localStorage.removeItem("teamOutingToken");
          localStorage.removeItem("teamOutingUser");
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (token && activeTripId) loadTripDetail(activeTripId).catch((e) => setError(e.message));
  }, [activeTripId, token, loadTripDetail]);

  const handleAuthenticated = (tok, member) => {
    setToken(tok); setCurrentUser(member);
    localStorage.setItem("teamOutingToken", tok);
    localStorage.setItem("teamOutingUser", JSON.stringify(member));
  };
  const logout = async () => {
    try { await authedApi("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    setToken(null); setCurrentUser(null); setMembers([]); setTrips([]); setActiveTrip(null); setActiveTripId(null);
    localStorage.removeItem("teamOutingToken");
    localStorage.removeItem("teamOutingUser");
  };

  const refreshTrip = () => loadTripDetail(activeTripId);

  const addAnnouncement = async (text) => { await authedApi(`/trips/${activeTripId}/announcements`, { method: "POST", body: JSON.stringify({ text }) }); await refreshTrip(); };
  const addPhoto = async (caption, url) => { await authedApi(`/trips/${activeTripId}/photos`, { method: "POST", body: JSON.stringify({ caption, url }) }); await refreshTrip(); };
  const addScore = async (gameId, teamId, pts) => { await authedApi(`/trips/${activeTripId}/games/${gameId}/score`, { method: "POST", body: JSON.stringify({ teamId, points: pts }) }); await refreshTrip(); };
  const shuffleTeams = async (gameId) => { await authedApi(`/trips/${activeTripId}/games/${gameId}/shuffle`, { method: "POST", body: JSON.stringify({ memberIds: activeTrip.participants.map((p) => p.memberId) }) }); await refreshTrip(); };
  const createGame = async (payload) => { await authedApi(`/trips/${activeTripId}/games`, { method: "POST", body: JSON.stringify(payload) }); await refreshTrip(); };
  const addItineraryItem = async (vals) => { await authedApi(`/trips/${activeTripId}/itinerary`, { method: "POST", body: JSON.stringify(vals) }); await refreshTrip(); };
  const updateItineraryItem = async (itemId, vals) => { await authedApi(`/trips/${activeTripId}/itinerary/${itemId}`, { method: "PUT", body: JSON.stringify(vals) }); await refreshTrip(); };
  const deleteItineraryItem = async (itemId) => { await authedApi(`/trips/${activeTripId}/itinerary/${itemId}`, { method: "DELETE" }); await refreshTrip(); };
  const addParticipant = async (memberId) => { await authedApi(`/trips/${activeTripId}/participants`, { method: "POST", body: JSON.stringify({ memberId }) }); await refreshTrip(); };
  const addParticipantByPhone = async (phoneNumber, name) => { await authedApi(`/trips/${activeTripId}/participants/by-phone`, { method: "POST", body: JSON.stringify({ phoneNumber, name }) }); await refreshTrip(); await loadMembers(); };
  const removeParticipant = async (memberId) => { await authedApi(`/trips/${activeTripId}/participants/${memberId}`, { method: "DELETE" }); await refreshTrip(); };
  const promoteMember = async (id, role) => { await authedApi(`/members/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }); setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, role } : m))); };
  const createTrip = async ({ name, date, location }) => {
    const newTrip = await authedApi("/trips", { method: "POST", body: JSON.stringify({ name, date, location }) });
    await loadTrips();
    setActiveTripId(newTrip.id);
  };

  if (!token) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  if (loading) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F6F0E4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: "#6B665C" }}>
        <style>{fontImport}</style>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F6F0E4", fontFamily: "'Inter', sans-serif" }}>
        <style>{fontImport}</style>
        <Header title="Team Outings" subtitle="" currentUser={currentUser} onLogout={logout} />
        <ErrorBanner message={error} onRetry={() => { setError(null); loadMembers().then(loadTrips).catch((e) => setError(e.message)); }} />
      </div>
    );
  }

  const titles = activeTrip
    ? { feed: { title: activeTrip.name, subtitle: activeTrip.date }, groups: { title: "Trip Members", subtitle: activeTrip.name }, photos: { title: "Trip Gallery", subtitle: activeTrip.name }, games: { title: "Games & Scoreboard", subtitle: activeTrip.name } }[tab]
    : { title: "Team Outings", subtitle: currentUser ? `Hi, ${(currentUser.name || currentUser.phoneNumber).split(" ")[0]}` : "" };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#F6F0E4", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <style>{fontImport}</style>
      <Header title={titles.title} subtitle={titles.subtitle} currentUser={currentUser} onLogout={logout} />
      <TripSwitcher trips={trips} activeTripId={activeTripId} setActiveTripId={setActiveTripId} isAdmin={isAdmin} onCreateTrip={createTrip} />

      <div style={{ flex: 1 }}>
        {!activeTrip ? (
          <div style={{ padding: 32, textAlign: "center", color: "#8B8578", fontSize: 13.5 }}>
            {trips.length === 0 ? (isAdmin ? "You're not on any trips yet. Create one above." : "You're not on any trips yet. Ask an admin to add you.") : "Select a trip above."}
          </div>
        ) : (
          <>
            {tab === "feed" && <FeedTab trip={activeTrip} isAdmin={isAdmin} addAnnouncement={addAnnouncement} addItineraryItem={addItineraryItem} updateItineraryItem={updateItineraryItem} deleteItineraryItem={deleteItineraryItem} />}
            {tab === "groups" && <MembersTab participants={activeTrip.participants} allMembers={members} isAdmin={isAdmin} promoteMember={promoteMember} addParticipant={addParticipant} removeParticipant={removeParticipant} addParticipantByPhone={addParticipantByPhone} />}
            {tab === "photos" && <PhotosTab photos={activeTrip.photos} addPhoto={addPhoto} />}
            {tab === "games" && <GamesTab games={activeTrip.games} participants={activeTrip.participants} isAdmin={isAdmin} addScore={addScore} shuffleTeams={shuffleTeams} createGame={createGame} />}
          </>
        )}
      </div>
      <TabBar active={tab} setActive={setTab} />
    </div>
  );
}
