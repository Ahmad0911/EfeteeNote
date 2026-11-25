import { useState } from "react";
import { localCreate, localHasAccount, localReset, localSignIn, signIn } from "./store";

type Props = { cloud: boolean; onCloud: () => void; onLocal: (key: CryptoKey) => void };

export default function Login({ cloud, onCloud, onLocal }: Props) {
  const [has, setHas] = useState(localHasAccount());
  const create = !cloud && !has;
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (create) {
      if (pw.length < 8) return setErr("Use at least 8 characters for the password.");
      if (pw !== pw2) return setErr("The two passwords do not match.");
    }
    setBusy(true);
    try {
      if (cloud) { await signIn(email, pw); onCloud(); }
      else onLocal(create ? await localCreate(email, pw) : await localSignIn(email, pw));
    } catch (x) { setErr((x as Error).message); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-forest bg-[radial-gradient(circle_at_50%_0%,#2c6a52_0%,#14352a_65%)] p-5">
      <form className="w-full max-w-[400px] rounded-2xl bg-white p-7 shadow-2xl" onSubmit={submit}>
        <img src="./images/emblem-md.png" alt="Efetee Apartments" className="mx-auto mb-3 h-24 w-auto" />
        <h1 className="mb-1 text-center text-[2rem] font-semibold">{create ? "Create your login" : "Management Notebook"}</h1>
        <p className="mb-6 text-center text-sm text-[#5d6a63]">{create ? "Choose the email and password you will use to open this notebook." : "Efetee Apartments · staff only"}</p>
        <label className="mb-3 block"><span className="label">Email</span>
          <input className="input" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mb-4 block"><span className="label">Password</span>
          <input className="input" type="password" required autoComplete={create ? "new-password" : "current-password"} value={pw} onChange={(e) => setPw(e.target.value)} /></label>
        {create && (
          <>
            <label className="mb-3 block"><span className="label">Repeat password</span>
              <input className="input" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
            <p className="mb-4 rounded-lg bg-[#fff1cc] px-3 py-2 text-xs text-[#6b5210]">Everything you record is locked with this password. <strong>If you forget it, the data cannot be recovered</strong>, so keep it safe and download the Excel regularly.</p>
          </>
        )}
        {err && <p className="mb-3 text-sm font-medium text-[#b3261e]" role="alert">{err}</p>}
        <button className="btn btn-gold w-full" disabled={busy}>{busy ? "Please wait…" : create ? "Create login" : "Sign in"}</button>
        {!cloud && has && (
          <button type="button" className="mt-4 block w-full text-center text-xs text-[#5d6a63] underline"
            onClick={() => { if (confirm("This erases ALL notebook data on this computer so you can start again. Continue?")) { localReset(); setHas(false); setPw(""); } }}>
            Forgot password? Erase and start again
          </button>
        )}
      </form>
    </div>
  );
}
