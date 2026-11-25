import type { Apartment, Booking } from "./types";

export type Data = { apartments: Apartment[]; bookings: Booking[] };
export type Backend = {
  mode: "cloud" | "local";
  load(): Promise<Data>;
  saveBooking(b: Booking): Promise<void>;
  saveApartment(a: Apartment): Promise<void>;
};

declare global { interface Window { EFETEE_NOTEBOOK?: { supabaseUrl?: string; supabaseAnonKey?: string } } }

export const uid = () => {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/* ---------------------------------------------------------- starter apartments */
const SEED: [string, number, string | null][] = [
  ["Flat 1 - Room 1", 45000, null], ["Flat 1 - Room 2", 45000, null],
  ["Flat 6 - Room 1", 50000, null], ["Flat 6 - Room 2", 50000, null],
  ["Flat 1 - Studio", 60000, null], ["Flat 6 - Studio", 60000, null],
  ["Flat 7 - 1 Bedroom", 70000, null],
  ["Flat 2 - Bedroom 1 (shared)", 70000, "Flat 2 - Whole flat"], ["Flat 2 - Bedroom 2 (shared)", 70000, "Flat 2 - Whole flat"],
  ["Flat 5 - Bedroom 1 (shared)", 70000, "Flat 5 - Whole flat"], ["Flat 5 - Bedroom 2 (shared)", 70000, "Flat 5 - Whole flat"],
  ["Flat 3 - Bedroom 1 (shared)", 80000, "Flat 3 - Whole flat"], ["Flat 3 - Bedroom 2 (shared)", 80000, "Flat 3 - Whole flat"],
  ["Flat 4 - Bedroom 1 (shared)", 80000, "Flat 4 - Whole flat"], ["Flat 4 - Bedroom 2 (shared)", 80000, "Flat 4 - Whole flat"],
  ["Flat 2 - Whole flat", 120000, null], ["Flat 5 - Whole flat", 120000, null],
  ["Flat 3 - Whole flat", 140000, null], ["Flat 4 - Whole flat", 140000, null],
];
export function seedApartments(): Apartment[] {
  const ids = new Map(SEED.map(([n]) => [n, uid()]));
  return SEED.map(([name, rate, parent], i) => ({ id: ids.get(name)!, name, rate, parent_id: parent ? ids.get(parent)! : null, sort: i + 1, active: true }));
}

/* ---------------------------------------------------------- local mode: real login, encrypted on this computer */
const META = "efetee_nb_account", DATA = "efetee_nb_data_enc";
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deriveKey(pw: string, salt: Uint8Array) {
  const m = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt as BufferSource, iterations: 250000, hash: "SHA-256" }, m, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function seal(key: CryptoKey, obj: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return { iv: b64(iv), ct: b64(ct) };
}
async function unseal<T>(key: CryptoKey, blob: { iv: string; ct: string }): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.ct) as BufferSource);
  return JSON.parse(new TextDecoder().decode(pt));
}
const WRONG = "Wrong email or password.";
export const localHasAccount = () => { try { return !!localStorage.getItem(META); } catch { return false; } };
export async function localCreate(email: string, pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pw, salt);
  localStorage.setItem(META, JSON.stringify({ email: email.trim().toLowerCase(), salt: b64(salt), check: await seal(key, { ok: 1 }) }));
  localStorage.setItem(DATA, JSON.stringify(await seal(key, { apartments: seedApartments(), bookings: [] })));
  return key;
}
export async function localSignIn(email: string, pw: string) {
  const meta = JSON.parse(localStorage.getItem(META) || "null");
  if (!meta || meta.email !== email.trim().toLowerCase()) throw new Error(WRONG);
  const key = await deriveKey(pw, unb64(meta.salt));
  try { await unseal(key, meta.check); } catch { throw new Error(WRONG); }
  return key;
}
export function localReset() { try { localStorage.removeItem(META); localStorage.removeItem(DATA); } catch { /* ignore */ } }

export function localBackend(key: CryptoKey): Backend {
  const read = async () => unseal<Data>(key, JSON.parse(localStorage.getItem(DATA)!));
  const write = async (d: Data) => localStorage.setItem(DATA, JSON.stringify(await seal(key, d)));
  return {
    mode: "local",
    load: read,
    async saveBooking(b) { const d = await read(); const i = d.bookings.findIndex((x) => x.id === b.id); if (i >= 0) d.bookings[i] = b; else d.bookings.push(b); await write(d); },
    async saveApartment(a) { const d = await read(); const i = d.apartments.findIndex((x) => x.id === a.id); if (i >= 0) d.apartments[i] = a; else d.apartments.push(a); await write(d); },
  };
}

/* ---------------------------------------------------------- cloud (shared) mode */
type Session = { access_token: string; refresh_token: string; email: string };
const SKEY = "efetee_notebook_session";
const cfg = () => window.EFETEE_NOTEBOOK || {};
export const cloudConfigured = () => !!(cfg().supabaseUrl && cfg().supabaseAnonKey);

const getSession = (): Session | null => { try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch { return null; } };
const setSession = (s: Session | null) => { try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch { /* ignore */ } };
export const currentUser = () => getSession()?.email ?? null;
export const signOut = () => setSession(null);

const base = () => (cfg().supabaseUrl || "").replace(/\/+$/, "");
const baseHeaders = () => ({ apikey: cfg().supabaseAnonKey || "", "Content-Type": "application/json" });

async function tokenCall(grant: string, body: object): Promise<Session> {
  const r = await fetch(`${base()}/auth/v1/token?grant_type=${grant}`, { method: "POST", headers: baseHeaders(), body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(/invalid/i.test(j.error_description || j.msg || "") ? "Wrong email or password." : j.error_description || j.msg || "Could not sign in.");
  const s = { access_token: j.access_token, refresh_token: j.refresh_token, email: j.user?.email || "" };
  setSession(s);
  return s;
}
export const signIn = (email: string, password: string) => tokenCall("password", { email: email.trim(), password });

async function api(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const s = getSession();
  if (!s) throw new Error("SIGNED_OUT");
  const r = await fetch(`${base()}/rest/v1/${path}`, { ...init, headers: { ...baseHeaders(), Authorization: `Bearer ${s.access_token}`, ...(init.headers || {}) } });
  if (r.status === 401 && retry) {
    try { await tokenCall("refresh_token", { refresh_token: s.refresh_token }); } catch { setSession(null); throw new Error("SIGNED_OUT"); }
    return api(path, init, false);
  }
  return r;
}

async function check(r: Response) {
  if (r.ok) return;
  const j = await r.json().catch(() => ({}));
  if (j.code === "23P01") throw new Error("That apartment is already booked on those dates.");
  throw new Error(j.message || "Could not save. Check your connection and try again.");
}

export function cloudBackend(): Backend {
  return {
    mode: "cloud",
    async load() {
      const [a, b] = await Promise.all([api("apartments?select=*&order=sort.asc,name.asc"), api("bookings?select=*&order=check_in.asc")]);
      if (!a.ok || !b.ok) throw new Error("Could not load. Check your connection.");
      const bookings = ((await b.json()) as Booking[]).map((x) => ({ ...x, amount: Number(x.amount), paid: Number(x.paid), phone: x.phone || "", note: x.note || "" }));
      const apartments = ((await a.json()) as Apartment[]).map((x) => ({ ...x, rate: Number(x.rate) }));
      return { apartments, bookings };
    },
    async saveBooking(b) {
      const { updated_by, updated_at, ...row } = b; void updated_by; void updated_at;
      await check(await api("bookings", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row) }));
    },
    async saveApartment(a) {
      await check(await api("apartments", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(a) }));
    },
  };
}
