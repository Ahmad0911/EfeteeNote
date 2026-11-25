import { useCallback, useEffect, useRef, useState } from "react";
import type { Apartment, Booking } from "./types";
import { cloudBackend, cloudConfigured, currentUser, localBackend, signOut, type Backend, type Data } from "./store";
import { downloadExcel } from "./excel";
import Login from "./Login";
import Availability from "./Availability";
import Bookings from "./Bookings";
import ApartmentsPage from "./Apartments";
import BookingForm from "./BookingForm";
import { Toast } from "./ui";

const TABS = [["avail", "Availability"], ["bookings", "Bookings"], ["apts", "Apartments"]] as const;

export default function App() {
  const cloud = cloudConfigured();
  const [signedIn, setSignedIn] = useState(!!currentUser());
  const [key, setKey] = useState<CryptoKey | null>(null);
  const out = () => { signOut(); setSignedIn(false); setKey(null); };

  if (cloud ? !signedIn : !key) return <Login cloud={cloud} onCloud={() => setSignedIn(true)} onLocal={setKey} />;
  return <Notebook cloud={cloud} localKey={key} onOut={out} />;
}

function Notebook({ cloud, localKey, onOut }: { cloud: boolean; localKey: CryptoKey | null; onOut: () => void }) {
  const be = useRef<Backend>(cloud ? cloudBackend() : localBackend(localKey!));
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("avail");
  const [form, setForm] = useState<{ existing?: Booking; preset?: Partial<Booking> } | null>(null);
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");

  const toast = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600); };
  const load = useCallback(async () => {
    try { setData(await be.current.load()); setLoadErr(""); }
    catch (e) { if ((e as Error).message === "SIGNED_OUT") onOut(); else setLoadErr((e as Error).message); }
  }, [onOut]);

  useEffect(() => {
    load();
    if (!cloud) return;
    const t = setInterval(load, 20000);          // pick up the other person's changes
    const f = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", f);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", f); };
  }, [load, cloud]);

  const saveBooking = async (b: Booking) => { await be.current.saveBooking(b); await load(); setForm(null); toast("Saved"); };
  const saveApt = async (a: Apartment) => { await be.current.saveApartment(a); await load(); toast("Saved"); };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-forest text-white shadow-lg">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 px-4 py-2.5">
          <img src="./images/emblem-sm.png" alt="" className="h-10 w-auto" />
          <div className="mr-auto leading-none"><p className="font-serif text-lg font-bold tracking-[.16em]">EFETEE</p><p className="mt-0.5 text-[.5rem] tracking-[.45em] text-gold">MANAGEMENT NOTEBOOK</p></div>
          <button className="btn btn-gold !py-2" onClick={() => setForm({})} disabled={!data}>+ New booking</button>
          <button className="btn !border-white/40 !py-2 text-white hover:bg-white/10" onClick={() => data && downloadExcel(data.apartments, data.bookings)} disabled={!data}>Download Excel</button>
          <button className="text-[.8rem] text-[#cfdcd3] underline" onClick={onOut}>Sign out</button>
        </div>
        <nav className="mx-auto flex max-w-[1180px] gap-1 px-4">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`border-b-[3px] px-4 py-2 text-[.9rem] font-semibold transition ${tab === k ? "border-gold text-white" : "border-transparent text-[#cfdcd3] hover:text-white"}`}>{label}</button>
          ))}
        </nav>
      </header>

      {!cloud && (
        <div className="bg-[#fff1cc] px-4 py-2 text-center text-[.82rem] text-[#6b5210]">
          <strong>Private to this computer.</strong> Your data is locked with your password and saved here only. To share it between two people or devices, connect the online database (SETUP.md).
        </div>
      )}

      <main className="mx-auto max-w-[1180px] px-4 py-6">
        {loadErr && <p className="mb-4 rounded-lg bg-[#fdecea] px-4 py-3 text-sm font-medium text-[#8a1c14]">{loadErr} <button className="underline" onClick={load}>Try again</button></p>}
        {!data ? <p className="py-20 text-center text-[#5d6a63]">Loading…</p> : (
          <>
            {tab === "avail" && <Availability apts={data.apartments} bookings={data.bookings} onNew={(preset) => setForm({ preset })} onOpen={(b) => setForm({ existing: b })} />}
            {tab === "bookings" && <Bookings apts={data.apartments} bookings={data.bookings} onOpen={(b) => setForm({ existing: b })} />}
            {tab === "apts" && <ApartmentsPage apts={data.apartments} onSave={saveApt} />}
          </>
        )}
      </main>

      {form && data && <BookingForm apts={data.apartments} bookings={data.bookings} existing={form.existing} preset={form.preset} onSave={saveBooking} onClose={() => setForm(null)} />}
      <Toast msg={msg} />
    </div>
  );
}
