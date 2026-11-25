import { useMemo, useState } from "react";
import type { Apartment, Booking, Status } from "./types";
import { STATUS_LABEL } from "./types";
import { Field, Modal } from "./ui";
import { addDays, fmt, naira, nights, today } from "./dates";
import { clash } from "./logic";
import { uid } from "./store";

type Props = {
  apts: Apartment[]; bookings: Booking[]; existing?: Booking; preset?: Partial<Booking>;
  onSave: (b: Booking) => Promise<void>; onClose: () => void;
};

export default function BookingForm({ apts, bookings, existing, preset, onSave, onClose }: Props) {
  const t = today();
  const [f, setF] = useState<Booking>(
    existing ?? { id: uid(), guest: "", phone: "", apartment_id: "", check_in: t, check_out: addDays(t, 1), amount: 0, paid: 0, status: "booked", note: "", ...preset }
  );
  const [amountTouched, setAmountTouched] = useState(!!existing);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const apt = apts.find((a) => a.id === f.apartment_id);
  const n = nights(f.check_in, f.check_out);
  const auto = apt ? n * apt.rate : 0;
  const amount = amountTouched ? f.amount : auto;
  const set = (p: Partial<Booking>) => setF((x) => ({ ...x, ...p }));
  const other = useMemo(() => clash(apts, bookings, f.apartment_id, f.check_in, f.check_out, f.id), [apts, bookings, f]);
  const willBlock = f.status !== "cancelled" && other;
  const datesBad = !!f.check_in && !!f.check_out && f.check_out <= f.check_in;

  const options = apts.filter((a) => a.active || a.id === f.apartment_id);

  async function save() {
    if (!f.guest.trim()) return setErr("Please enter the guest's name.");
    if (!f.apartment_id) return setErr("Please choose an apartment.");
    if (datesBad || !f.check_in || !f.check_out) return setErr("Check-out must be after check-in.");
    if (willBlock) return; // the red warning above already explains
    setBusy(true); setErr("");
    try { await onSave({ ...f, guest: f.guest.trim(), phone: f.phone.trim(), note: f.note.trim(), amount: Number(amount) || 0, paid: Number(f.paid) || 0 }); }
    catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  return (
    <Modal title={existing ? "Edit booking" : "New booking"} onClose={onClose}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Guest name *" className="sm:col-span-2"><input className="input" autoFocus value={f.guest} onChange={(e) => set({ guest: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" type="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Apartment *">
          <select className="input" value={f.apartment_id} onChange={(e) => set({ apartment_id: e.target.value })}>
            <option value="">Choose…</option>
            {options.map((a) => {
              const taken = clash(apts, bookings, a.id, f.check_in, f.check_out, f.id);
              return <option key={a.id} value={a.id}>{a.name} · {naira(a.rate)}{taken ? "  (taken)" : ""}</option>;
            })}
          </select>
        </Field>
        <Field label="Check-in *"><input className="input" type="date" value={f.check_in} onChange={(e) => set({ check_in: e.target.value, check_out: f.check_out <= e.target.value ? addDays(e.target.value, 1) : f.check_out })} /></Field>
        <Field label="Check-out *"><input className="input" type="date" min={addDays(f.check_in || t, 1)} value={f.check_out} onChange={(e) => set({ check_out: e.target.value })} /></Field>
      </div>

      {willBlock && other && (
        <p className="mt-3 rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-medium text-[#8a1c14]" role="alert">
          Not free: {other.guest} has it ({fmt(other.check_in)} to {fmt(other.check_out)}).
        </p>
      )}
      {!willBlock && apt && n > 0 && <p className="mt-3 text-sm font-medium text-[#14532d]">Free · {n} {n === 1 ? "night" : "nights"} at {naira(apt.rate)}</p>}

      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-3">
        <Field label="Amount (₦)">
          <input className="input" type="number" min={0} value={amount || ""} onChange={(e) => { setAmountTouched(true); set({ amount: Number(e.target.value) }); }} />
        </Field>
        <Field label="Paid so far (₦)"><input className="input" type="number" min={0} value={f.paid || ""} onChange={(e) => set({ paid: Number(e.target.value) })} /></Field>
        <div className="rounded-[10px] bg-ivory px-3 py-2"><span className="label">Balance</span><p className="text-lg font-bold text-forest">{naira(Math.max(0, (Number(amount) || 0) - (Number(f.paid) || 0)))}</p></div>
      </div>

      <div className="mt-3.5 grid gap-3.5">
        <Field label="Status">
          <select className="input" value={f.status} onChange={(e) => set({ status: e.target.value as Status })}>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Note"><input className="input" value={f.note} placeholder="Anything to remember" onChange={(e) => set({ note: e.target.value })} /></Field>
      </div>
      <p className="mt-2 text-xs text-[#5d6a63]">Booked = reserved. Checked in = guest has arrived. "Paid so far" is separate, so a guest can be booked without paying, or pay before arriving. To remove a booking, set it to Cancelled.</p>

      {err && <p className="mt-3 text-sm font-medium text-[#b3261e]" role="alert">{err}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn btn-line" onClick={onClose}>Close</button>
        <button className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </Modal>
  );
}
