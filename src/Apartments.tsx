import { useState } from "react";
import type { Apartment } from "./types";
import { Field, Modal } from "./ui";
import { naira } from "./dates";
import { uid } from "./store";

export default function Apartments({ apts, onSave }: { apts: Apartment[]; onSave: (a: Apartment) => Promise<void> }) {
  const [edit, setEdit] = useState<Apartment | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const wholes = apts.filter((a) => !a.parent_id);

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 className="text-2xl font-semibold">Apartments &amp; rates</h2><p className="text-sm text-[#5d6a63]">Change a rate here and it applies to new bookings only.</p></div>
        <button className="btn btn-gold" onClick={() => { setIsNew(true); setEdit({ id: uid(), name: "", rate: 0, parent_id: null, sort: apts.length + 1, active: true }); }}>+ Add</button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {apts.map((a) => (
          <li key={a.id}>
            <button className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-ivory ${a.active ? "" : "opacity-50"}`} onClick={() => { setIsNew(false); setEdit(a); }}>
              <span><span className="font-semibold">{a.name}</span>{a.parent_id && <span className="ml-2 text-xs text-[#5d6a63]">part of {apts.find((x) => x.id === a.parent_id)?.name}</span>}{!a.active && <span className="ml-2 text-xs">(not in use)</span>}</span>
              <span className="font-semibold text-gold-2">{naira(a.rate)}</span>
            </button>
          </li>
        ))}
      </ul>
      {edit && (
        <Modal title={isNew ? "Add apartment" : "Edit apartment"} onClose={() => setEdit(null)}>
          <div className="grid gap-3.5">
            <Field label="Name"><input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Rate per night (₦)"><input className="input" type="number" min={0} value={edit.rate || ""} onChange={(e) => setEdit({ ...edit, rate: Number(e.target.value) })} /></Field>
            <Field label="Is this one bedroom inside a whole flat?">
              <select className="input" value={edit.parent_id || ""} onChange={(e) => setEdit({ ...edit, parent_id: e.target.value || null })}>
                <option value="">No, it stands alone</option>
                {wholes.filter((w) => w.id !== edit.id).map((w) => <option key={w.id} value={w.id}>Yes, part of {w.name}</option>)}
              </select>
            </Field>
            <p className="-mt-1 text-xs text-[#5d6a63]">If yes, booking the bedroom blocks the whole flat, and booking the whole flat blocks its bedrooms.</p>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> In use (untick to hide it without losing its history)</label>
          </div>
          {err && <p className="mt-3 text-sm font-medium text-[#b3261e]" role="alert">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-line" onClick={() => setEdit(null)}>Close</button>
            <button className="btn btn-gold" disabled={busy} onClick={async () => {
              if (!edit.name.trim()) return setErr("Please enter a name.");
              setBusy(true); setErr("");
              try { await onSave({ ...edit, name: edit.name.trim() }); setEdit(null); } catch (e) { setErr((e as Error).message); }
              setBusy(false);
            }}>Save</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
