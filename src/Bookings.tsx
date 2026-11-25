import { useMemo, useState } from "react";
import type { Apartment, Booking } from "./types";
import { STATUS_LABEL } from "./types";
import { fmtLong, naira, nights, today } from "./dates";
import { aptName, balance, isLive } from "./logic";

const FILTERS = [["now", "Current & upcoming"], ["all", "All"], ["out", "Checked out"], ["cancelled", "Cancelled"]] as const;
const tone: Record<string, string> = { booked: "bg-[#fff1cc] text-[#6b5210]", in: "bg-[#d9f2e3] text-[#14532d]", out: "bg-[#e7e4da] text-[#5d6a63]", cancelled: "bg-[#fdecea] text-[#8a1c14]" };

export default function Bookings({ apts, bookings, onOpen }: { apts: Apartment[]; bookings: Booking[]; onOpen: (b: Booking) => void }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("now");
  const [q, setQ] = useState("");
  const t = today();
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return bookings
      .filter((b) => (filter === "all" ? true : filter === "now" ? (b.status === "booked" || b.status === "in") && b.check_out >= t : b.status === filter))
      .filter((b) => !s || b.guest.toLowerCase().includes(s) || b.phone.includes(s) || aptName(apts, b.apartment_id).toLowerCase().includes(s))
      .sort((a, b) => (a.check_in < b.check_in ? (filter === "all" || filter === "now" ? -1 : 1) : filter === "all" || filter === "now" ? 1 : -1));
  }, [bookings, apts, filter, q, t]);
  const owed = rows.reduce((s, b) => s + balance(b), 0);

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Bookings</h2>
        <input className="input !w-full sm:!w-64" placeholder="Search name, phone, apartment" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3.5 py-1.5 text-[.82rem] font-semibold ${filter === k ? "border-forest bg-forest text-white" : "border-line bg-white text-forest hover:border-gold"}`}>{label}</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="py-8 text-center text-sm text-[#5d6a63]">No bookings here yet. Use “+ New booking”.</p> : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] text-left text-[.88rem]">
            <thead className="bg-ivory text-[.72rem] uppercase tracking-wide text-[#5d6a63]">
              <tr><th className="px-3 py-2">Guest</th><th className="px-3 py-2">Apartment</th><th className="px-3 py-2">Dates</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-right">Paid</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} onClick={() => onOpen(b)} className="cursor-pointer border-t border-line hover:bg-ivory">
                  <td className="px-3 py-2.5"><span className="font-semibold">{b.guest}</span><br /><span className="text-xs text-[#5d6a63]">{b.phone}</span></td>
                  <td className="px-3 py-2.5">{aptName(apts, b.apartment_id)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{fmtLong(b.check_in)} → {fmtLong(b.check_out)}<br /><span className="text-xs text-[#5d6a63]">{nights(b.check_in, b.check_out)} nights</span></td>
                  <td className="px-3 py-2.5 text-right">{naira(b.amount)}</td>
                  <td className="px-3 py-2.5 text-right">{naira(b.paid)}</td>
                  <td className={`px-3 py-2.5 text-right font-semibold ${balance(b) > 0 ? "text-[#b3261e]" : ""}`}>{isLive(b) ? naira(balance(b)) : "-"}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[b.status]}`}>{STATUS_LABEL[b.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > 0 && owed > 0 && <p className="mt-3 text-right text-sm text-[#5d6a63]">Still owed on these: <strong className="text-[#b3261e]">{naira(owed)}</strong></p>}
    </section>
  );
}
