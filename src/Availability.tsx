import { useState } from "react";
import type { Apartment, Booking } from "./types";
import { addDays, fmt, naira, nights, parse, today } from "./dates";
import { clash, related, isLive } from "./logic";

type Props = {
  apts: Apartment[]; bookings: Booking[];
  onNew: (preset: Partial<Booking>) => void; onOpen: (b: Booking) => void;
};

export default function Availability({ apts, bookings, onNew, onOpen }: Props) {
  const t = today();
  const [from, setFrom] = useState(t);
  const [to, setTo] = useState(addDays(t, 1));
  const [start, setStart] = useState(t);
  const active = apts.filter((a) => a.active);
  const ok = to > from;
  const n = nights(from, to);
  const free = ok ? active.filter((a) => !clash(apts, bookings, a.id, from, to)) : [];
  const taken = ok ? active.filter((a) => clash(apts, bookings, a.id, from, to)) : [];
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <h2 className="mb-3 text-2xl font-semibold">Check availability</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label><span className="label">From</span><input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); if (to <= e.target.value) setTo(addDays(e.target.value, 1)); }} /></label>
          <label><span className="label">To (check-out)</span><input type="date" className="input" min={addDays(from, 1)} value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <p className="pb-2.5 text-sm font-semibold text-forest">{ok ? `${n} ${n === 1 ? "night" : "nights"}` : "Pick dates"}</p>
        </div>
        {ok && (
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold text-[#14532d]">Free ({free.length})</p>
              {free.length === 0 && <p className="text-sm text-[#5d6a63]">Nothing is free for these dates.</p>}
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {free.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <span><span className="block font-semibold">{a.name}</span><span className="text-xs text-[#5d6a63]">{naira(a.rate)} / night · {naira(a.rate * n)} total</span></span>
                    <button className="btn btn-green !px-4 !py-1.5 !text-[.82rem]" onClick={() => onNew({ apartment_id: a.id, check_in: from, check_out: to })}>Book</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold text-[#8a1c14]">Not free ({taken.length})</p>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-ivory/60">
                {taken.map((a) => {
                  const b = clash(apts, bookings, a.id, from, to)!;
                  return (
                    <li key={a.id}><button className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-ivory" onClick={() => onOpen(b)}>
                      <span className="font-medium text-[#5d6a63]">{a.name}</span>
                      <span className="text-xs text-[#8a1c14]">{b.guest} · {fmt(b.check_in)} to {fmt(b.check_out)}</span>
                    </button></li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Calendar</h2>
          <div className="flex gap-2">
            <button className="btn btn-line !px-3.5 !py-1.5" onClick={() => setStart(addDays(start, -7))}>← Week</button>
            <button className="btn btn-line !px-3.5 !py-1.5" onClick={() => setStart(t)}>Today</button>
            <button className="btn btn-line !px-3.5 !py-1.5" onClick={() => setStart(addDays(start, 7))}>Week →</button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-[.78rem]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[170px] bg-forest px-3 py-2 text-left font-semibold text-white">Apartment</th>
                {days.map((d) => (
                  <th key={d} className={`min-w-[62px] px-1 py-2 text-center font-semibold text-white ${d === t ? "bg-gold !text-forest" : "bg-forest"} ${parse(d).getDay() % 6 === 0 ? "opacity-90" : ""}`}>
                    {parse(d).toLocaleDateString("en-GB", { weekday: "short" })}<br />{parse(d).getDate()}/{parse(d).getMonth() + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((a) => {
                const rel = related(apts, a.id);
                return (
                  <tr key={a.id} className="border-t border-line">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-medium">{a.name}</td>
                    {days.map((d) => {
                      const b = bookings.find((k) => isLive(k) && rel.includes(k.apartment_id) && k.check_in <= d && k.check_out > d);
                      if (!b) return (
                        <td key={d} className="p-0">
                          <button aria-label={`Book ${a.name} on ${d}`} className="h-9 w-full text-transparent hover:bg-[#d9f2e3] hover:text-[#14532d]" onClick={() => onNew({ apartment_id: a.id, check_in: d, check_out: addDays(d, 1) })}>+</button>
                        </td>
                      );
                      const own = b.apartment_id === a.id;
                      const color = b.status === "in" ? "bg-[#1f4d3c] text-white" : b.status === "out" ? "bg-[#d9d4c6] text-[#5d6a63]" : "bg-gold/80 text-forest";
                      return (
                        <td key={d} className="p-0">
                          <button title={`${b.guest}: ${fmt(b.check_in)} to ${fmt(b.check_out)}`} onClick={() => onOpen(b)}
                            className={`h-9 w-full truncate border-l border-white/50 px-1 text-[.7rem] font-semibold ${color} ${own ? "" : "opacity-60 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,.35)_4px,rgba(255,255,255,.35)_8px)]"}`}>
                            {b.guest.split(" ")[0]}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#5d6a63]">Gold = booked · Green = checked in · Grey = checked out · Striped = taken because the whole flat (or a bedroom in it) is booked. Tap a free square to book it.</p>
      </section>
    </div>
  );
}
